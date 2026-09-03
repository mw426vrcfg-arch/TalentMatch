import { requireBusiness } from "@/lib/auth/require-business";
import { loadSalonAppointments } from "@/lib/bookings/overview";
import { appointmentIcsFilename, buildAppointmentIcs } from "@/lib/calendar/appointment-ics";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { business } = await requireBusiness();

  if (!business) {
    return new Response("Salonprofil fehlt.", { status: 403 });
  }

  const appointments = await loadSalonAppointments(business.id);
  const item = appointments.find(
    (appointment) =>
      appointment.booking_id === id ||
      appointment.id === id ||
      appointment.application_id === id,
  );

  const exportable = new Set(["confirmed", "accepted", "completed"]);
  if (!item || !exportable.has(item.status)) {
    return new Response("Termin nicht gefunden.", { status: 404 });
  }

  const ics = buildAppointmentIcs(item);
  const filename = appointmentIcsFilename(item);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
