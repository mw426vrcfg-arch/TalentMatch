import { ADMIN_EMAIL, adminFromAddress } from "@/lib/mail/config";

export async function sendAdminEmail(input: {
  subject: string;
  text: string;
  replyTo?: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const inbox = ADMIN_EMAIL;
  const from = adminFromAddress();

  if (!apiKey) {
    console.warn(
      `RESEND_API_KEY fehlt — Nachricht bleibt in Supabase, E-Mail an ${inbox} wurde nicht versendet: ${input.subject}`,
    );
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [inbox],
      reply_to: input.replyTo || undefined,
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend ${response.status}: ${body.slice(0, 400)}`);
  }

  return true;
}
