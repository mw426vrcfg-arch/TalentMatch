import { redirect } from "next/navigation";
import { BrowseOffers } from "@/components/offers/browse-offers";
import { CustomerShell } from "@/components/customer/customer-shell";
import { getOptionalProfile } from "@/lib/auth/require-customer";

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ stadt?: string }>;
}) {
  const { stadt } = await searchParams;
  const profile = await getOptionalProfile();

  if (profile?.role === "business") {
    redirect("/business/dashboard");
  }

  if (profile?.role === "customer" || profile?.role === "admin") {
    redirect(stadt ? `/dashboard?stadt=${encodeURIComponent(stadt)}` : "/dashboard");
  }

  return (
    <CustomerShell title="Browse" signedIn={false}>
      <BrowseOffers city={stadt} basePath="/offers" />
    </CustomerShell>
  );
}
