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
import {
  appointmentStatusLabel,
  splitAppointments,
  type AppointmentOverview,
} from "@/lib/bookings/overview";
import { isMessagingEnabled } from "@/lib/messages/store";
import { formatSlotDay, formatSlotTime } from "@/lib/offers/format";

function StatusBadge({ status }: { status: AppointmentOverview["status"] }) {
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
      {appointmentStatusLabel(status)}
    </span>
  );
}

function AppointmentCard({
  item,
  role,
  currentUserId,
  actions,
}: {
  item: AppointmentOverview;
  role: "customer" | "salon";
  currentUserId: string;
  actions?: ReactNode;
}) {
  const showPhone = Boolean(item.counterpart_phone);
  const showChat = isMessagingEnabled(item.status);

  return (
    <article className="ui-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {item.counterpart_logo_url ? (
            <img
              src={item.counterpart_logo_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-white/40"
            />
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
            {role === "customer" && item.counterpart_address ? (
              <p className="mt-0.5 text-sm text-ink-soft">{item.counterpart_address}</p>
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
          <dt className="ui-kicker">Datum</dt>
          <dd className="mt-1 text-sm text-ink">{formatSlotDay(item.start_time)}</dd>
        </div>
        <div>
          <dt className="ui-kicker">Uhrzeit</dt>
          <dd className="mt-1 text-sm text-ink">{formatSlotTime(item.start_time)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="ui-kicker">Service</dt>
          <dd className="mt-1 text-sm text-ink">{item.service_title}</dd>
        </div>
      </dl>

      {role === "salon" ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {typeof item.active_strikes === "number" ? (
            <p className="text-sm text-ink-soft">Aktive Strikes: {item.active_strikes} / 3</p>
          ) : (
            <span />
          )}
          {item.counterpart_user_id ? (
            <BlockCustomerButton customerId={item.counterpart_user_id} />
          ) : null}
        </div>
      ) : null}

      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      {item.counterpart_user_id ? (
        <ReportProblemButton
          applicationId={item.application_id}
          bookingId={item.booking_id}
          reportedUserId={item.counterpart_user_id}
          role={role}
        />
      ) : null}
      {showChat ? (
        <AppointmentChat
          applicationId={item.application_id}
          bookingId={item.booking_id}
          currentUserId={currentUserId}
          counterpartName={item.counterpart_name}
        />
      ) : null}
    </article>
  );
}

function Group({
  title,
  empty,
  children,
  hasItems,
}: {
  title: string;
  empty: string;
  children: ReactNode;
  hasItems: boolean;
}) {
  return (
    <div>
      <h3 className="font-serif text-2xl text-ink">{title}</h3>
      <div className="mt-4 space-y-4">{hasItems ? children : <div className="ui-empty">{empty}</div>}</div>
    </div>
  );
}

export function MeineTermine({
  items,
  role,
  currentUserId,
}: {
  items: AppointmentOverview[];
  role: "customer" | "salon";
  currentUserId: string;
}) {
  const { upcoming, past } = splitAppointments(items);

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
      const calendar =
        open || item.status === "completed" ? <AddToCalendarButton item={item} /> : null;
      if (section !== "upcoming" || !open) {
        return (
          <>
            {calendar}
            {cancel}
          </>
        );
      }
      return (
        <>
          {swapPending ? (
            <SwapPendingNote requestedStart={item.requested_start_time} />
          ) : (
            <SwapRequestButton applicationId={item.application_id} />
          )}
          {calendar}
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

    const showCalendar = open || item.status === "completed";
    const calendar = showCalendar ? <AddToCalendarButton item={item} /> : null;

    if (item.status !== "confirmed" || !item.booking_id) {
      if (!calendar && !cancel) {
        return undefined;
      }
      return (
        <>
          {calendar}
          {cancel}
        </>
      );
    }

    return (
      <>
        {calendar}
        {cancel}
        <CompleteButton bookingId={item.booking_id} />
        <NoShowButton bookingId={item.booking_id} />
      </>
    );
  }

  return (
    <section className="mb-12">
      {role === "customer" ? <LiveRefresh intervalMs={4000} /> : null}
      <div className="max-w-2xl">
        <p className="ui-kicker">Kapitel 4.7.1 · Kalender-Synchronisation</p>
        <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">Meine Termine</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {role === "customer"
            ? "Bei anstehenden Terminen siehst du den echten Salon mit Name, Telefon und Logo."
            : "Bestätigte Termine kannst du als iCal-Datei in Apple Calendar oder Google Calendar importieren."}
        </p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <Group title="Anstehende Termine" empty="Keine anstehenden Termine." hasItems={upcoming.length > 0}>
          {upcoming.map((item) => (
              <AppointmentCard
                key={item.id}
                item={item}
                role={role}
                currentUserId={currentUserId}
                actions={actionsFor(item, "upcoming")}
              />
            ))}
        </Group>
        <Group title="Vergangene Termine" empty="Noch keine vergangenen Termine." hasItems={past.length > 0}>
          {past.map((item) => (
              <AppointmentCard
                key={item.id}
                item={item}
                role={role}
                currentUserId={currentUserId}
                actions={actionsFor(item, "past")}
              />
            ))}
        </Group>
      </div>
    </section>
  );
}
