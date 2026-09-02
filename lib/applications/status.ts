export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend",
  accepted: "Bestätigt",
  rejected: "Abgelehnt",
  confirmed: "Bestätigt",
};

export function applicationStatusMessage(status: string, bookingStatus?: string | null) {
  if (bookingStatus === "confirmed" || status === "accepted") {
    return "Dein Termin ist bestätigt — ohne Zahlungszwischenschritt (Testwochen).";
  }

  if (status === "rejected") {
    return "Der Salon hat die Bewerbung abgelehnt. Der Slot bleibt für andere offen.";
  }

  return "Der Salon prüft gerade deine Bilder und Notizen.";
}

