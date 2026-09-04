import { missingColumnFromError } from "@/lib/supabase/flexible-write";
import { createAdminClient } from "@/lib/supabase/admin";

export type GenderValue = "female" | "male" | "diverse" | "";

type Admin = ReturnType<typeof createAdminClient>;

export function parseGender(value: unknown): GenderValue {
  if (value === "female" || value === "male" || value === "diverse") {
    return value;
  }
  return "";
}

export function asGenderOrNull(value: unknown): Exclude<GenderValue, ""> | null {
  const parsed = parseGender(value);
  return parsed || null;
}

function isMissingColumn(message: string) {
  return Boolean(missingColumnFromError(message)) || /schema cache/i.test(message);
}

export async function persistGender(
  admin: Admin,
  input: {
    table: "business_profiles" | "customer_profiles";
    matchColumn: "id" | "user_id";
    matchValue: string;
    gender: string | null;
    columns?: string[];
  },
) {
  const columns = input.columns ?? (input.table === "business_profiles" ? ["gender", "contact_gender"] : ["gender"]);
  let wrote = false;
  let lastError: string | null = null;

  for (const column of columns) {
    const { error } = await admin
      .from(input.table)
      .update({ [column]: input.gender })
      .eq(input.matchColumn, input.matchValue);
    if (!error) {
      wrote = true;
      continue;
    }
    if (isMissingColumn(error.message)) {
      continue;
    }
    lastError = error.message;
  }

  if (!wrote && lastError) {
    throw new Error(lastError);
  }

  return wrote;
}
