import { BrowseOffers } from "@/components/offers/browse-offers";
import { CustomerShell } from "@/components/customer/customer-shell";

export const revalidate = 60;
export const dynamic = "force-static";

export default function OffersPage() {
  return (
    <CustomerShell titleKey="nav.browse" signedIn={false}>
      <BrowseOffers basePath="/offers" />
    </CustomerShell>
  );
}
