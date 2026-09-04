import { createAdminClient } from "@/lib/supabase/admin";
import { missingColumnFromError } from "@/lib/supabase/flexible-write";

type Admin = ReturnType<typeof createAdminClient>;

export type FeedbackRow = {
  user_id: string;
  message: string;
  user_email: string | null;
};

function isMissingTable(message: string) {
  return /could not find the table ['"]?(?:public\.)?(feedbacks|platform_feedback)/i.test(message)
    || /relation ['"]?(?:public\.)?(feedbacks|platform_feedback)['"]? does not exist/i.test(message);
}

async function ensureUserRow(
  admin: Admin,
  input: { userId: string; email: string | null; fullName?: string; role?: string },
) {
  const { error } = await admin.from("users").upsert(
    {
      id: input.userId,
      email: input.email || `${input.userId}@talentmatch.local`,
      full_name: input.fullName || "",
      role: input.role || "customer",
    },
    { onConflict: "id" },
  );
  if (error && !/duplicate key|unique constraint/i.test(error.message)) {
    console.error("Feedback: users-Zeile konnte nicht gesichert werden:", error.message);
  }
}

async function insertFeedbackRow(admin: Admin, table: "feedbacks" | "platform_feedback", row: FeedbackRow) {
  const payload: Record<string, unknown> = {
    user_id: row.user_id,
    user_email: row.user_email,
    message: row.message,
    created_at: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await admin.from(table).insert(payload);
    if (!error) {
      return { ok: true as const };
    }
    if (isMissingTable(error.message)) {
      return { ok: false as const, missingTable: true, message: error.message };
    }
    const column = missingColumnFromError(error.message);
    if (column && column in payload) {
      delete payload[column];
      continue;
    }
    return { ok: false as const, missingTable: false, message: error.message };
  }

  return { ok: false as const, missingTable: false, message: "Insert fehlgeschlagen." };
}

export async function savePlatformFeedback(
  admin: Admin,
  row: FeedbackRow & { fullName?: string; role?: string },
) {
  await ensureUserRow(admin, {
    userId: row.user_id,
    email: row.user_email,
    fullName: row.fullName,
    role: row.role,
  });

  const primary = await insertFeedbackRow(admin, "feedbacks", row);
  console.log("4. Supabase-Insert in feedbacks Status:", primary);
  if (primary.ok) {
    return { table: "feedbacks" as const, ok: true, error: null };
  }

  if (/foreign key|violates foreign key/i.test(primary.message ?? "")) {
    await ensureUserRow(admin, {
      userId: row.user_id,
      email: row.user_email,
      fullName: row.fullName,
      role: row.role,
    });
    const retry = await insertFeedbackRow(admin, "feedbacks", row);
    console.log("4. Supabase-Insert in feedbacks Retry-Status:", retry);
    if (retry.ok) {
      return { table: "feedbacks" as const, ok: true, error: null };
    }
  }

  console.error("4. Supabase-Insert in feedbacks fehlgeschlagen:", primary.message);

  const fallback = await insertFeedbackRow(admin, "platform_feedback", row);
  if (fallback.ok) {
    console.error(
      "Feedback wurde in platform_feedback gespeichert. Bitte feedbacks.sql in Supabase ausführen, damit public.feedbacks existiert.",
    );
    return { table: "platform_feedback" as const, ok: true, error: primary.message };
  }

  throw new Error(
    primary.missingTable || fallback.missingTable
      ? "Feedback-Tabelle fehlt. Bitte feedbacks.sql in Supabase ausführen."
      : primary.message || fallback.message || "Feedback konnte nicht gespeichert werden.",
  );
}
