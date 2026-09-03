import { IncomingApplications } from "@/components/business/incoming-applications";
import { SalonShell } from "@/components/business/salon-shell";
import { loadSalonPendingApplications } from "@/lib/applications/queries";
import { requireBusiness } from "@/lib/auth/require-business";
import { resolveLogoUrl } from "@/lib/business/images";

export const dynamic = "force-dynamic";

export default async function SalonApplicationsPage() {
  const { business } = await requireBusiness();
  const salonName = business?.business_name || "Dein Salon";
  const applications = business ? await loadSalonPendingApplications(business.id) : [];

  return (
    <SalonShell
      salonName={salonName}
      location={business?.location}
      logoUrl={resolveLogoUrl(business?.logo_url)}
    >
      <IncomingApplications applications={applications} />
    </SalonShell>
  );
}
