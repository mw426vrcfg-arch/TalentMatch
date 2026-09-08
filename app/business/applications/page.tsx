import { MeineTermine } from "@/components/bookings/meine-termine";
import { IncomingApplications } from "@/components/business/incoming-applications";
import { SalonShell } from "@/components/business/salon-shell";
import { RatingWindow } from "@/components/ratings/rating-window";
import { loadSalonPendingApplications } from "@/lib/applications/queries";
import { requireBusiness } from "@/lib/auth/require-business";
import { loadSalonAppointments } from "@/lib/bookings/overview";
import { resolveLogoUrl } from "@/lib/business/images";
import { loadPendingRatingsForUser } from "@/lib/ratings/store";

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
  const [appointments, pendingRatings] = await Promise.all([
    business ? loadSalonAppointments(business.id) : Promise.resolve([]),
    loadPendingRatingsForUser({ userId: user.id, role: "business" }),
  ]);

  return (
    <SalonShell
      salonName={salonName || ""}
      location={business?.location}
      logoUrl={resolveLogoUrl(business?.logo_url)}
    >
      <RatingWindow items={pendingRatings} role="business" />
      <IncomingApplications applications={applications} focusId={focus} currentUserId={user.id} />
      <MeineTermine items={appointments} role="salon" currentUserId={user.id} />
    </SalonShell>
  );
}
