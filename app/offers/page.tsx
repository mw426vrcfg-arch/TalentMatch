import { redirect } from "next/navigation";
import { BrowseOffers } from "@/components/offers/browse-offers";
import { CustomerShell } from "@/components/customer/customer-shell";
import { getOptionalProfile } from "@/lib/auth/require-customer";

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stadt?: string }>;
}) {
  const { q, stadt } = await searchParams;
  const profile = await getOptionalProfile();

  if (profile?.role === "business") {
    redirect("/business/dashboard");
  }

  if (profile?.role === "customer" || profile?.role === "admin") {
    const query = q || stadt;
    redirect(query ? `/dashboard?q=${encodeURIComponent(query)}` : "/dashboard");
  }

  return (
    <CustomerShell title="Browse" signedIn={false}>
      <BrowseOffers query={q || stadt} basePath="/offers" />
    </CustomerShell>
  );
}
