"use client";

import type { ReactNode } from "react";
import { ReportProblemButton } from "@/components/bookings/report-problem";
import { AddToCalendarButton } from "@/components/bookings/add-to-calendar-button";
import { CancelAppointmentButton } from "@/components/bookings/cancel-button";
import { SwapDecisionButtons } from "@/components/bookings/swap-decision";
import { SwapPendingNote, SwapRequestButton } from "@/components/bookings/swap-request";
import { BlockCustomerButton } from "@/components/business/block-customer-button";
import { CompleteButton, NoShowButton } from "@/components/business/confirmed-bookings";
import { AppointmentChat } from "@/components/messages/appointment-chat";
import { LiveRefresh } from "@/components/live-refresh";
import { ScrollToId } from "@/components/ui/scroll-to-id";
import {
  splitAppointments,
  type AppointmentOverview,
} from "@/lib/bookings/overview";
import { isMessagingEnabled } from "@/lib/messages/store";
import { formatSlotDay, formatSlotTime } from "@/lib/offers/format";
import { intlLocale } from "@/lib/i18n/config";
import { type MessageKey } from "@/lib/i18n/messages";
import { useLocale, useT } from "@/components/i18n/i18n-provider";
import { ConfirmedBadge } from "@/components/ui/confirmed-badge";
import { AppImage } from "@/components/ui/app-image";
import { EmptyExplore } from "@/components/ui/empty-explore";

function StatusBadge({ status }: { status: AppointmentOverview["status"] }) {
  const t = useT();
  if (status === "confirmed") {
    return <ConfirmedBadge label={t("status.confirmed")} />;
  }
  const closed = status === "completed" || status === "no_show";
  return (
    <span
      className={`ui-badge shrink-0 ${
        status === "no_show"
          ? "bg-rose/10 text-rose"
          : status === "swap_requested"
            ? "border border-zinc-900/15 bg-white/80 text-ink"
            : closed
              ? ""
              : "bg-zinc-900 text-cream"
      }`}
    >
      {t(`status.${status}` as MessageKey)}
    </span>
  );
}

function AppointmentCard({
  item,
  role,
  currentUserId,
  actions,
  focused,
  openChat,
}: {
  item: AppointmentOverview;
  role: "customer" | "salon";
  currentUserId: string;
  actions?: ReactNode;
  focused?: boolean;
  openChat?: boolean;
}) {
  const contactRevealed =
    role === "salon" ||
    Boolean(item.contact_revealed) ||
    item.status === "confirmed" ||
    item.status === "completed";
  const showPhone = contactRevealed && Boolean(item.counterpart_phone);
  const showAddress = role === "customer" && contactRevealed && Boolean(item.counterpart_address);
  const showRegion =
    role === "customer" && !showAddress && Boolean(item.event_location);
  const showChat = isMessagingEnabled(item.status);
  const showCalendar =
    item.status === "confirmed" ||
    item.status === "accepted" ||
    item.status === "swap_requested" ||
    item.status === "completed";
  const t = useT();
  const locale = useLocale();

  return (
    <article
      id={`appointment-${item.application_id}`}
      className={`ui-card min-w-0 scroll-mt-28 overflow-hidden p-5 ${focused ? "ui-focus-card" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {item.counterpart_logo_url ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/40">
              <AppImage
                src={item.counterpart_logo_url}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/70 font-serif text-lg text-zinc-500 backdrop-blur-md">
              {item.counterpart_name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{item.counterpart_name}</p>
            {showPhone ? (
              <p className="mt-0.5 text-sm text-ink-soft">{item.counterpart_phone}</p>
            ) : null}
            {showAddress ? (
              <p className="mt-0.5 text-sm text-ink-soft">{item.counterpart_address}</p>
            ) : null}
            {showRegion ? (
              <p className="mt-0.5 text-sm text-ink-soft">{item.event_location}</p>
            ) : null}
            {role === "salon" && item.counterpart_email ? (
              <p className="mt-0.5 truncate text-sm text-ink-soft">{item.counterpart_email}</p>
            ) : null}
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="ui-kicker">{t("appointments.date")}</dt>
          <dd className="mt-1 text-sm text-ink">{formatSlotDay(item.start_time, intlLocale(locale))}</dd>
        </div>
        <div>
          <dt className="ui-kicker">{t("appointments.time")}</dt>
          <dd className="mt-1 text-sm text-ink">{formatSlotTime(item.start_time, intlLocale(locale))}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="ui-kicker">{t("appointments.service")}</dt>
          <dd className="mt-1 text-sm text-ink">{item.service_title}</dd>
        </div>
      </dl>

      {role === "salon" ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {typeof item.active_strikes === "number" ? (
            <p className="text-sm text-ink-soft">{t("booking.strikesCount", { count: item.active_strikes })}</p>
          ) : (
            <span />
          )}
          {item.counterpart_user_id ? (
            <BlockCustomerButton
              customerId={item.counterpart_user_id}
              customerName={item.counterpart_name}
            />
          ) : null}
        </div>
      ) : null}

      {actions || (!showChat && showCalendar) ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!showChat && showCalendar ? <AddToCalendarButton item={item} /> : null}
          {!showChat && item.counterpart_user_id ? (
            <ReportProblemButton
              applicationId={item.application_id}
              bookingId={item.booking_id}
              reportedUserId={item.counterpart_user_id}
              role={role}
              compact
            />
          ) : null}
          {actions}
        </div>
      ) : null}
      {showChat ? (
        <AppointmentChat
          applicationId={item.application_id}
          bookingId={item.booking_id}
          currentUserId={currentUserId}
          counterpartName={item.counterpart_name}
          autoFocus={Boolean(focused && openChat)}
          headerActions={
            <div className="flex flex-wrap items-center gap-2">
              {showCalendar ? <AddToCalendarButton item={item} /> : null}
              {item.counterpart_user_id ? (
                <ReportProblemButton
                  applicationId={item.application_id}
                  bookingId={item.booking_id}
                  reportedUserId={item.counterpart_user_id}
                  role={role}
                  compact
                />
              ) : null}
            </div>
          }
        />
      ) : null}
    </article>
  );
}

function Group({
  title,
  empty,
  explore,
  children,
  hasItems,
}: {
  title: string;
  empty: string;
  explore?: boolean;
  children: ReactNode;
  hasItems: boolean;
}) {
  return (
    <div>
      <h3 className="font-serif text-2xl text-ink">{title}</h3>
      <div className="mt-4 space-y-4">
        {hasItems ? children : explore ? <EmptyExplore messageKey="empty.noAppointments" /> : <div className="ui-empty">{empty}</div>}
      </div>
    </div>
  );
}

export function MeineTermine({
  items,
  role,
  currentUserId,
  focusApplicationId,
  openChat,
}: {
  items: AppointmentOverview[];
  role: "customer" | "salon";
  currentUserId: string;
  focusApplicationId?: string | null;
  openChat?: boolean;
}) {
  const { upcoming, past } = splitAppointments(items);
  const focusId = focusApplicationId || null;
  const t = useT();

  function actionsFor(item: AppointmentOverview, section: "upcoming" | "past") {
    const open =
      item.status === "confirmed" || item.status === "accepted" || item.status === "swap_requested";
    const cancel =
      section === "upcoming" && open ? (
        <CancelAppointmentButton
          applicationId={item.application_id}
          startTime={item.start_time}
          role={role}
        />
      ) : null;

    const swapPending = item.status === "swap_requested";

    if (role !== "salon") {
      if (section !== "upcoming" || !open) {
        return cancel;
      }
      return (
        <>
          {swapPending ? (
            <SwapPendingNote requestedStart={item.requested_start_time} />
          ) : (
            <SwapRequestButton applicationId={item.application_id} />
          )}
          {cancel}
        </>
      );
    }

    if (swapPending && section === "upcoming") {
      return (
        <>
          <SwapDecisionButtons
            applicationId={item.application_id}
            requestedStart={item.requested_start_time}
          />
          {cancel}
        </>
      );
    }

    if (item.status !== "confirmed" || !item.booking_id) {
      return cancel ?? undefined;
    }

    return (
      <>
        {cancel}
        <CompleteButton bookingId={item.booking_id} />
        <NoShowButton bookingId={item.booking_id} />
      </>
    );
  }

  return (
    <section id="meine-termine" className="mb-12">
      {role === "customer" ? <LiveRefresh intervalMs={4000} /> : null}
      <ScrollToId id={focusId ? `appointment-${focusId}` : null} />
      <div className="max-w-2xl">
        <p className="ui-kicker">{t("appointments.kicker")}</p>
        <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{t("appointments.title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {t(role === "customer" ? "appointments.introCustomer" : "appointments.introSalon")}
        </p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <Group
          title={t("appointments.upcoming")}
          empty={t("appointments.upcomingEmpty")}
          explore={role === "customer"}
          hasItems={upcoming.length > 0}
        >
          {upcoming.map((item) => (
              <AppointmentCard
                key={item.id}
                item={item}
                role={role}
                currentUserId={currentUserId}
                actions={actionsFor(item, "upcoming")}
                focused={item.application_id === focusId}
                openChat={openChat}
              />
            ))}
        </Group>
        <Group title={t("appointments.past")} empty={t("appointments.pastEmpty")} hasItems={past.length > 0}>
          {past.map((item) => (
              <AppointmentCard
                key={item.id}
                item={item}
                role={role}
                currentUserId={currentUserId}
                actions={actionsFor(item, "past")}
                focused={item.application_id === focusId}
                openChat={openChat}
              />
            ))}
        </Group>
      </div>
    </section>
  );
}
