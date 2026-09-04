import { parseSlotIdFromNotes, parseSlotStartFromNotes } from "@/lib/applications/slot-from-notes";
import { resolveLogoUrl } from "@/lib/business/images";
import { mapBusinessRow } from "@/lib/business/profile-store";
import { resolveAvatarUrl } from "@/lib/customer/images";
import { loadCustomerProfile } from "@/lib/customer/profile-store";
import { APPLICATION_STATUS_LABEL } from "@/lib/applications/status";
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";

export type AppointmentStatus = "confirmed" | "completed" | "no_show" | "accepted" | "swap_requested";

export type AppointmentOverview = {
  id: string;
  booking_id: string | null;
  application_id: string;
  start_time: string;
  service_title: string;
  duration_minutes: number;
  status: AppointmentStatus;
  counterpart_name: string;
  counterpart_phone: string | null;
  counterpart_email: string | null;
  counterpart_logo_url: string | null;
  counterpart_address: string | null;
  event_location: string | null;
  counterpart_user_id: string | null;
  requested_slot_id: string | null;
  requested_start_time: string | null;
  active_strikes?: number;
};

type BookingRow = {
  id: string;
  application_id: string;
  slot_id: string | null;
  booking_status: string | null;
  requested_slot_id?: string | null;
};

type Admin = ReturnType<typeof createAdminClient>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

export function appointmentStatusLabel(status: AppointmentStatus) {
  return APPLICATION_STATUS_LABEL[status] ?? status;
}

export function splitAppointments(items: AppointmentOverview[], now = Date.now()) {
  const upcoming: AppointmentOverview[] = [];
  const past: AppointmentOverview[] = [];

  for (const item of items) {
    const started = new Date(item.start_time).getTime() < now;
    const closed = item.status === "completed" || item.status === "no_show";
    if (closed || started) {
      past.push(item);
    } else {
      upcoming.push(item);
    }
  }

  upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  return { upcoming, past };
}

function normalizeStatus(value: string | null | undefined): AppointmentStatus {
  if (
    value === "completed" ||
    value === "no_show" ||
    value === "confirmed" ||
    value === "accepted" ||
    value === "swap_requested"
  ) {
    return value;
  }
  return "confirmed";
}

async function loadBookingRows(admin: Admin, applicationIds: string[]): Promise<BookingRow[]> {
  const full = await admin
    .from("bookings")
    .select("id, application_id, slot_id, booking_status, requested_slot_id")
    .in("application_id", applicationIds);

  if (!full.error) {
    return (full.data ?? []) as unknown as BookingRow[];
  }

  const base = await admin
    .from("bookings")
    .select("id, application_id, slot_id, booking_status")
    .in("application_id", applicationIds);

  if (base.error) {
    throw new Error(base.error.message);
  }

  return (base.data ?? []) as unknown as BookingRow[];
}

async function loadSlotsByIds(admin: Admin, slotIds: string[]) {
  if (slotIds.length === 0) {
    return new Map<string, string>();
  }
  const { data } = await admin.from("offer_slots").select("id, start_time").in("id", slotIds);
  return new Map((data ?? []).map((slot) => [slot.id as string, slot.start_time as string]));
}

function formatVenue(address: string | null | undefined, city: string | null | undefined) {
  return [address?.trim(), city?.trim()].filter(Boolean).join(", ") || null;
}

async function loadSalonVenue(admin: Admin, businessId: string) {
  const byId = await admin.from("business_profiles").select("*").eq("id", businessId).maybeSingle();
  const mapped =
    mapBusinessRow(byId.data) ??
    mapBusinessRow(
      (await admin.from("business_profiles").select("*").eq("user_id", businessId).maybeSingle()).data,
    );
  if (!mapped) {
    return { name: "Salon", location: null as string | null };
  }
  return {
    name: mapped.business_name.trim() || "Salon",
    location: formatVenue(mapped.address, mapped.location),
  };
}

export async function loadSalonAppointments(businessId: string): Promise<AppointmentOverview[]> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    return [];
  }
  const [{ data: offers, error: offerError }, venue] = await Promise.all([
    admin.from("offers").select("id, title, duration_minutes").eq("business_id", businessId),
    loadSalonVenue(admin, businessId),
  ]);

  if (offerError) {
    throw new Error(offerError.message);
  }

  const offerRows = offers ?? [];
  if (offerRows.length === 0) {
    return [];
  }

  const offerTitle = new Map(offerRows.map((offer) => [offer.id as string, offer.title as string]));
  const offerDuration = new Map(
    offerRows.map((offer) => [offer.id as string, Number(offer.duration_minutes) || 60]),
  );
  const offerIds = offerRows.map((offer) => offer.id as string);

  const { data: applications, error: applicationError } = await admin
    .from("applications")
    .select("id, customer_id, offer_id, notes, status")
    .in("offer_id", offerIds)
    .eq("status", "accepted");

  if (applicationError) {
    throw new Error(applicationError.message);
  }

  const applicationRows = applications ?? [];
  if (applicationRows.length === 0) {
    return [];
  }

  const applicationIds = applicationRows.map((row) => row.id as string);
  const bookingRows = await loadBookingRows(admin, applicationIds);
  const bookingByApplication = new Map(bookingRows.map((row) => [row.application_id, row]));

  const slotIds = [
    ...new Set(
      [
        ...bookingRows.map((row) => row.slot_id),
        ...bookingRows.map((row) => row.requested_slot_id ?? null),
        ...applicationRows.map((row) => parseSlotIdFromNotes(row.notes as string | null)),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];
  const customerIds = [...new Set(applicationRows.map((row) => row.customer_id as string))];

  const [{ data: users }, { data: strikes }, slotMap] = await Promise.all([
    admin.from("users").select("id, full_name, email, phone").in("id", customerIds),
    admin.from("strikes").select("customer_id").eq("active", true).in("customer_id", customerIds),
    loadSlotsByIds(admin, slotIds),
  ]);

  const userMap = new Map((users ?? []).map((user) => [user.id as string, user]));
  const strikeCounts = new Map<string, number>();
  for (const strike of strikes ?? []) {
    const id = String(strike.customer_id);
    strikeCounts.set(id, (strikeCounts.get(id) ?? 0) + 1);
  }

  const customerProfiles = await Promise.all(
    customerIds.map(async (id) => [id, await loadCustomerProfile(admin, id)] as const),
  );
  const profileMap = new Map(customerProfiles);

  const visibleApplications = applicationRows.filter((application) => {
    const booking = bookingByApplication.get(application.id as string);
    return booking?.booking_status !== "cancelled";
  });

  return visibleApplications.map((application) => {
    const booking = bookingByApplication.get(application.id as string);
    const notes = application.notes as string | null;
    const slotId = booking?.slot_id || parseSlotIdFromNotes(notes);
    const startTime =
      (slotId ? slotMap.get(slotId) : null) ||
      parseSlotStartFromNotes(notes) ||
      new Date().toISOString();
    const requestedSlotId = booking?.requested_slot_id ?? null;

    const customerId = application.customer_id as string;
    const user = userMap.get(customerId);
    const customerProfile = profileMap.get(customerId);

    return {
      id: booking?.id ?? (application.id as string),
      booking_id: booking?.id ?? null,
      application_id: application.id as string,
      start_time: startTime,
      service_title: offerTitle.get(application.offer_id as string) ?? "Angebot",
      duration_minutes: offerDuration.get(application.offer_id as string) ?? 60,
      status: normalizeStatus(
        requestedSlotId ? "swap_requested" : booking?.booking_status ?? "accepted",
      ),
      counterpart_name:
        customerProfile?.profile?.full_name ||
        (user?.full_name as string | undefined) ||
        "Kunde",
      counterpart_phone: (user?.phone as string | null | undefined) ?? null,
      counterpart_email: (user?.email as string | undefined) || "",
      counterpart_logo_url: resolveAvatarUrl(customerProfile?.profile?.avatar_url),
      counterpart_address: null,
      event_location: venue.location,
      counterpart_user_id: customerId,
      requested_slot_id: requestedSlotId,
      requested_start_time: requestedSlotId ? slotMap.get(requestedSlotId) ?? null : null,
      active_strikes: strikeCounts.get(customerId) ?? 0,
    };
  });
}

export async function loadCustomerAppointments(customerId: string): Promise<AppointmentOverview[]> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    return [];
  }
  const { data: applications, error: applicationError } = await admin
    .from("applications")
    .select("id, status, notes, offer_id, customer_id")
    .eq("customer_id", customerId)
    .eq("status", "accepted");

  if (applicationError) {
    throw new Error(applicationError.message);
  }

  const applicationRows = applications ?? [];
  if (applicationRows.length === 0) {
    return [];
  }

  const applicationIds = applicationRows.map((row) => row.id as string);
  const offerIds = [...new Set(applicationRows.map((row) => row.offer_id as string))];

  const [bookingRows, { data: offers }] = await Promise.all([
    loadBookingRows(admin, applicationIds),
    admin.from("offers").select("id, title, business_id, duration_minutes").in("id", offerIds),
  ]);

  const bookingByApplication = new Map(bookingRows.map((row) => [row.application_id, row]));
  const offerMap = new Map(
    (offers ?? []).map((offer) => [
      offer.id as string,
      { title: offer.title as string, business_id: offer.business_id as string, duration_minutes: Number(offer.duration_minutes) || 60 },
    ]),
  );

  const businessIds = [
    ...new Set((offers ?? []).map((offer) => offer.business_id as string).filter(Boolean)),
  ];

  const profileRows: unknown[] = [];
  if (businessIds.length > 0) {
    const byId = await admin.from("business_profiles").select("*").in("id", businessIds);
    if (!byId.error && byId.data) {
      profileRows.push(...byId.data);
    }
    const byUser = await admin.from("business_profiles").select("*").in("user_id", businessIds);
    if (!byUser.error && byUser.data) {
      profileRows.push(...byUser.data);
    }
  }

  const profileById = new Map<string, ReturnType<typeof mapBusinessRow>>();
  const profileByUser = new Map<string, ReturnType<typeof mapBusinessRow>>();
  const salonUserByProfileId = new Map<string, string>();
  for (const row of profileRows) {
    const record = asRecord(row);
    const mapped = mapBusinessRow(row);
    if (!mapped || !record) {
      continue;
    }
    profileById.set(mapped.id, mapped);
    if (record.user_id != null) {
      const userId = String(record.user_id);
      profileByUser.set(userId, mapped);
      salonUserByProfileId.set(mapped.id, userId);
    }
  }

  const slotIds = [
    ...new Set(
      [
        ...bookingRows.map((row) => row.slot_id),
        ...bookingRows.map((row) => row.requested_slot_id ?? null),
        ...applicationRows.map((row) => parseSlotIdFromNotes(row.notes as string | null)),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];
  const slotMap = await loadSlotsByIds(admin, slotIds);

  const visibleApplications = applicationRows.filter((application) => {
    const booking = bookingByApplication.get(application.id as string);
    return booking?.booking_status !== "cancelled";
  });

  return visibleApplications.map((application) => {
    const booking = bookingByApplication.get(application.id as string);
    const offer = offerMap.get(application.offer_id as string);
    const notes = application.notes as string | null;
    const slotId = booking?.slot_id || parseSlotIdFromNotes(notes);
    const startTime =
      (slotId ? slotMap.get(slotId) : null) ||
      parseSlotStartFromNotes(notes) ||
      new Date().toISOString();
    const requestedSlotId = booking?.requested_slot_id ?? null;

    const profile =
      (offer?.business_id ? profileById.get(offer.business_id) : null) ??
      (offer?.business_id ? profileByUser.get(offer.business_id) : null) ??
      null;
    const salonUserId =
      (profile ? salonUserByProfileId.get(profile.id) : null) ??
      (offer?.business_id && profileByUser.has(offer.business_id) ? offer.business_id : null) ??
      null;

    return {
      id: booking?.id ?? (application.id as string),
      booking_id: booking?.id ?? null,
      application_id: application.id as string,
      start_time: startTime,
      service_title: offer?.title ?? "Angebot",
      duration_minutes: offer?.duration_minutes ?? 60,
      status: normalizeStatus(
        requestedSlotId ? "swap_requested" : booking?.booking_status ?? "accepted",
      ),
      counterpart_name: profile?.business_name?.trim() || "Salon",
      counterpart_phone: profile?.phone ?? null,
      counterpart_email: null,
      counterpart_logo_url: resolveLogoUrl(profile?.logo_url),
      counterpart_address: profile?.address ?? null,
      event_location: formatVenue(profile?.address, profile?.location),
      counterpart_user_id: salonUserId,
      requested_slot_id: requestedSlotId,
      requested_start_time: requestedSlotId ? slotMap.get(requestedSlotId) ?? null : null,
    };
  });
}
