import { MeineTermine } from "@/components/bookings/meine-termine";
import { IncomingApplications } from "@/components/business/incoming-applications";
import { SalonShell } from "@/components/business/salon-shell";
import { loadSalonPendingApplications } from "@/lib/applications/queries";
import { requireBusiness } from "@/lib/auth/require-business";
import { loadSalonAppointments } from "@/lib/bookings/overview";
import { resolveLogoUrl } from "@/lib/business/images";

export const dynamic = "force-dynamic";

export default async function SalonApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const { user, business } = await requireBusiness();
  const salonName = business?.business_name;
  const applications = business ? await loadSalonPendingApplications(business.id) : [];
  const appointments = business ? await loadSalonAppointments(business.id) : [];

  return (
    <SalonShell
      salonName={salonName || ""}
      location={business?.location}
      logoUrl={resolveLogoUrl(business?.logo_url)}
    >
      <IncomingApplications applications={applications} focusId={focus} />
      <MeineTermine items={appointments} role="salon" currentUserId={user.id} />
    </SalonShell>
  );
}
