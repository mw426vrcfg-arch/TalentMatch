export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim() ||
  process.env.FEEDBACK_INBOX?.trim() ||
  "carlo.raghias@bluewin.ch";

export function adminFromAddress() {
  return process.env.RESEND_FROM?.trim() || "TalentMatch <onboarding@resend.dev>";
}
