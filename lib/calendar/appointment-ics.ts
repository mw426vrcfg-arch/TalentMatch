import { buildIcsCalendar, icsFilename } from "@/lib/calendar/ics";
import { type AppointmentOverview } from "@/lib/bookings/overview";

export function buildAppointmentIcs(item: AppointmentOverview) {
  const details = [
    `TalentMatch · ${item.service_title}`,
    item.counterpart_name ? `Person: ${item.counterpart_name}` : null,
    item.counterpart_phone ? `Telefon: ${item.counterpart_phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return buildIcsCalendar({
    uid: `talentmatch-${item.booking_id || item.application_id}@talentmatch.app`,
    title: item.service_title,
    description: details,
    location: item.event_location,
    startIso: item.start_time,
    durationMinutes: item.duration_minutes || 60,
  });
}

export function appointmentIcsFilename(item: AppointmentOverview) {
  return icsFilename(item.service_title, item.start_time);
}

export function calendarDownloadHref(item: AppointmentOverview) {
  const id = item.booking_id || item.id;
  return `/business/calendar/${encodeURIComponent(id)}`;
}
