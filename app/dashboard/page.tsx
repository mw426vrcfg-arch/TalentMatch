import { BrowseOffers } from "@/components/offers/browse-offers";
import { CustomerShell } from "@/components/customer/customer-shell";
import { MyApplications } from "@/components/customer/my-applications";
import { StrikeAlert } from "@/components/customer/strike-alert";
import { loadCustomerApplications } from "@/lib/applications/queries";
import { requireCustomer } from "@/lib/auth/require-customer";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stadt?: string; applied?: string }>;
}) {
  const { stadt, applied } = await searchParams;
  const { user, profile, strikes } = await requireCustomer();
  const applications = await loadCustomerApplications(profile.id);

  return (
    <CustomerShell title="Browse" userName={profile.full_name} signedIn>
      <StrikeAlert userId={user.id} initialCount={strikes} />
      {applied === "1" && (
        <p className="mb-8 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
          Bewerbung gesendet. Status: pending — der Salon prüft deine Bilder und Notizen.
        </p>
      )}
      <MyApplications applications={applications} />
      <BrowseOffers city={stadt} basePath="/dashboard" />
    </CustomerShell>
  );
}
