import { MeineTermine } from "@/components/bookings/meine-termine";
import { CustomerShell } from "@/components/customer/customer-shell";
import { MyApplications } from "@/components/customer/my-applications";
import { RatingWindow } from "@/components/ratings/rating-window";
import { loadCustomerApplications } from "@/lib/applications/queries";
import { requireCustomer } from "@/lib/auth/require-customer";
import { loadCustomerAppointments } from "@/lib/bookings/overview";
import { loadPendingRatingsForUser } from "@/lib/ratings/store";
import { T } from "@/components/i18n/t";

export const dynamic = "force-dynamic";

export default async function CustomerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string; appointment?: string; chat?: string }>;
}) {
  const { applied, appointment, chat } = await searchParams;
  const { user, profile } = await requireCustomer();
  const [applications, appointments, pendingRatings] = await Promise.all([
    loadCustomerApplications(profile.id),
    loadCustomerAppointments(profile.id),
    loadPendingRatingsForUser({ userId: user.id, role: "customer" }),
  ]);
  const openApplications = applications.filter(
    (application) =>
      application.status === "pending" ||
      application.status === "rejected" ||
      application.status === "cancelled_by_customer" ||
      application.status === "cancelled_by_salon",
  );

  return (
    <CustomerShell titleKey="nav.applications" userName={profile.full_name} signedIn>
      {applied === "1" ? (
        <p className="ui-alert-ok mb-8">
          <T k="applications.sent" />
        </p>
      ) : null}
      <RatingWindow items={pendingRatings} role="customer" />
      <MeineTermine
        items={appointments}
        role="customer"
        currentUserId={user.id}
        focusApplicationId={appointment}
        openChat={chat === "1"}
      />
      <MyApplications applications={openApplications} />
    </CustomerShell>
  );
}
