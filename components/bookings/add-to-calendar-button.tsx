"use client";

import { type MouseEvent } from "react";
import { buildAppointmentIcs } from "@/lib/calendar/appointment-ics";
import { type AppointmentOverview } from "@/lib/bookings/overview";
import { useT } from "@/components/i18n/i18n-provider";

export function AddToCalendarButton({ item }: { item: AppointmentOverview }) {
  const t = useT();

  function addToCalendar(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const ics = buildAppointmentIcs(item);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "termin.ics";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  return (
    <a
      href="#calendar"
      download="termin.ics"
      target="_blank"
      rel="noopener noreferrer"
      type="text/calendar"
      className="ui-btn-secondary"
      onClick={addToCalendar}
    >
      {t("booking.addToCalendar")}
    </a>
  );
}
