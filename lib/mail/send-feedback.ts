import { sendAdminEmail } from "@/lib/mail/send-admin";

export async function sendAdminDisputeEmail(input: {
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string | null;
  reporterRole: string;
  reportedUserId: string;
  applicationId: string;
  bookingId: string | null;
  description: string;
}) {
  await sendAdminEmail({
    subject: `TalentMatch-Problem: ${input.reporterName || input.reporterEmail || "Meldung"}`,
    replyTo: input.reporterEmail || null,
    text: [
      "Neue Problem-Meldung über TalentMatch",
      "",
      `Name des Meldenden: ${input.reporterName || "—"}`,
      `E-Mail: ${input.reporterEmail || "—"}`,
      `Telefon: ${input.reporterPhone || "—"}`,
      `Rolle: ${input.reporterRole || "—"}`,
      "",
      `Termin / Application-ID: ${input.applicationId}`,
      `Booking-ID: ${input.bookingId || "—"}`,
      `Gemeldete User-ID: ${input.reportedUserId}`,
      "",
      "Beschreibung:",
      input.description,
    ].join("\n"),
  });
}

export async function sendAdminNoShowEmail(input: {
  salonName: string;
  salonEmail: string;
  bookingId: string;
  applicationId: string | null;
  customerId: string | null;
  strikeCount: number;
}) {
  await sendAdminEmail({
    subject: `TalentMatch-No-Show: ${input.salonName || "Salon"}`,
    replyTo: input.salonEmail || null,
    text: [
      "No-Show-Meldung über TalentMatch",
      "",
      `Salon: ${input.salonName || "—"}`,
      `Salon-E-Mail: ${input.salonEmail || "—"}`,
      `Booking-ID: ${input.bookingId}`,
      `Application-ID: ${input.applicationId || "—"}`,
      `Kunden-User-ID: ${input.customerId || "—"}`,
      `Aktive Strikes nach Meldung: ${input.strikeCount}`,
    ].join("\n"),
  });
}
