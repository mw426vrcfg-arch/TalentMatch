"use server";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readText, TEXT_LIMITS } from "@/lib/security/sanitize";
import { createClient } from "@/lib/supabase/server";

const FEEDBACK_FROM = "TalentMatch <onboarding@resend.dev>";
const FEEDBACK_TO = "carlo.raghias@bluewin.ch";
const FEEDBACK_SUBJECT = "Neues TalentMatch Feedback";

function readEnvLocalValue(name: string) {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const line = text.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") ?? "";
  } catch {
    return "";
  }
}

function readResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || readEnvLocalValue("RESEND_API_KEY");
}

function formatResendError(error: unknown) {
  if (!error) {
    return "Unbekannter Resend-Fehler";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object") {
    const record = error as { message?: string; status?: number; data?: { message?: string } };
    const parts = [record.status, record.message, record.data?.message].filter(Boolean);
    if (parts.length) {
      return parts.join(" — ");
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function sendFeedbackAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Die Anmeldung konnte nicht bestätigt werden." };
  }

  const message = readText(formData, "message", TEXT_LIMITS.message).trim();
  if (message.length < 8) {
    return { success: false, error: "Bitte schreibe etwas ausführlicher (mind. 8 Zeichen)." };
  }
  if (message.length > 2000) {
    return { success: false, error: "Bitte kürze das Feedback auf 2000 Zeichen." };
  }

  const { error: dbError } = await supabase.from("feedbacks").insert([
    {
      message,
      user_email: user.email ?? null,
      user_id: user.id,
    },
  ]);

  if (dbError) {
    console.error("=== FEEDBACK ERROR ===", dbError);
    return { success: false, error: dbError.message };
  }

  try {
    const apiKey = readResendApiKey();
    if (!apiKey) {
      console.warn("Resend Key fehlt, Feedback nur in Supabase gespeichert");
      return { success: true };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from: FEEDBACK_FROM,
        to: [FEEDBACK_TO],
        subject: FEEDBACK_SUBJECT,
        text: message,
      }),
    });

    const data = (await response.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;
    if (!response.ok) {
      console.warn("Resend Versand fehlgeschlagen, Feedback nur in Supabase gespeichert");
      console.error("=== FEEDBACK ERROR ===", formatResendError({ status: response.status, data }));
      return { success: true };
    }

    console.log("=== FEEDBACK SUCCESS ===");
    console.log("3. Resend Success ID:", data?.id);
    return { success: true };
  } catch (error) {
    console.warn("Resend Versand fehlgeschlagen, Feedback nur in Supabase gespeichert");
    console.error("=== FEEDBACK ERROR ===", error);
    return { success: true };
  }
}
