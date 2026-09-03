export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend",
  accepted: "Bestätigt",
  rejected: "Abgelehnt",
  confirmed: "Bestätigt",
  completed: "Abgeschlossen",
  no_show: "No-Show",
  cancelled_by_customer: "Storniert",
  cancelled_by_salon: "Storniert",
  cancelled: "Storniert",
  swap_requested: "Verschiebung angefragt",
};

export function applicationStatusMessage(status: string, bookingStatus?: string | null) {
  if (bookingStatus === "completed") {
    return "Der Termin ist abgeschlossen. Bitte bewerte den Salon.";
  }

  if (bookingStatus === "confirmed" || status === "accepted") {
    return "Dein Termin ist bestätigt. Name, Adresse und Telefon des Salons sind jetzt für diesen Termin sichtbar.";
  }

  if (status === "cancelled_by_customer" || status === "cancelled_by_salon" || bookingStatus === "cancelled") {
    return "Der Termin wurde storniert.";
  }

  if (status === "rejected") {
    return "Der Salon hat die Bewerbung abgelehnt. Der Slot bleibt für andere offen.";
  }

  return "Der Salon prüft gerade deine Bilder und Notizen.";
}

