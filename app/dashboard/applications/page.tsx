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
      application.status === "requested_custom_time" ||
      application.is_custom_time ||
      application.status === "rejected" ||
      application.status === "cancelled_by_customer" ||
      application.status === "cancelled_by_salon",
  );

  return (
    <CustomerShell titleKey="nav.applications" userName={profile.full_name} signedIn>
      {applied === "1" || applied === "custom" ? (
        <section className="mb-8 rounded-[28px] border border-emerald-200/80 bg-emerald-50/90 p-5 sm:p-6">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 9.2 17 19 7" />
            </svg>
            <T k="applications.sentTitle" />
          </p>
          <p className="mt-2 text-sm leading-relaxed text-emerald-950/80">
            <T k={applied === "custom" ? "applications.customTimeSent" : "applications.sent"} />
          </p>
        </section>
      ) : null}
      <RatingWindow items={pendingRatings} role="customer" />
      <MeineTermine
        items={appointments}
        role="customer"
        currentUserId={user.id}
        focusApplicationId={appointment}
        openChat={chat === "1"}
      />
      <MyApplications applications={openApplications} currentUserId={user.id} />
    </CustomerShell>
  );
}
