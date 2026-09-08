import { BrowseOffers } from "@/components/offers/browse-offers";
import { CustomerShell } from "@/components/customer/customer-shell";
import { requireCustomer } from "@/lib/auth/require-customer";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { user, profile } = await requireCustomer();

  return (
    <CustomerShell titleKey="nav.browse" userName={profile.full_name} signedIn>
      <BrowseOffers query={q} basePath="/dashboard" userId={user.id} />
    </CustomerShell>
  );
}
