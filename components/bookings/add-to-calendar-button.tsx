"use client";

import { appointmentIcsFilename, buildAppointmentIcs } from "@/lib/calendar/appointment-ics";
import { type AppointmentOverview } from "@/lib/bookings/overview";

export function AddToCalendarButton({ item }: { item: AppointmentOverview }) {
  const ics = buildAppointmentIcs(item);
  const filename = appointmentIcsFilename(item);
  const href = `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;

  return (
    <a
      href={href}
      download={filename}
      className="ui-btn-secondary"
      type="text/calendar"
    >
      Zu Kalender hinzufügen
    </a>
  );
}
