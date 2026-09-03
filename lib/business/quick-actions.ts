import { splitAppointments, type AppointmentOverview } from "@/lib/bookings/overview";
import { loadUrgentMatchQuota } from "@/lib/offers/urgent-quota";
import { createAdminClient } from "@/lib/supabase/admin";

export type SalonQuickActions = {
  todayCount: number;
  unansweredChats: number;
  urgentRemaining: number;
  urgentLimit: number;
};

function zurichDayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
}

export function countTodaysAppointments(appointments: AppointmentOverview[], now = new Date()) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
  const { upcoming } = splitAppointments(appointments, now.getTime());
  return upcoming.filter((item) => {
    if (item.status === "completed" || item.status === "no_show") {
      return false;
    }
    return zurichDayKey(item.start_time) === today;
  }).length;
}

export async function countUnansweredModelChats(businessId: string, salonUserId: string) {
  const admin = createAdminClient();
  const { data: offers, error: offerError } = await admin.from("offers").select("id").eq("business_id", businessId);
  if (offerError || !offers?.length) {
    return 0;
  }

  const { data: applications, error: applicationError } = await admin
    .from("applications")
    .select("id")
    .in("offer_id", offers.map((row) => row.id as string))
    .eq("status", "accepted");

  if (applicationError || !applications?.length) {
    return 0;
  }

  const applicationIds = applications.map((row) => row.id as string);
  const { data: messages, error: messageError } = await admin
    .from("messages")
    .select("application_id, sender_id, created_at")
    .in("application_id", applicationIds)
    .order("created_at", { ascending: false });

  if (messageError) {
    if (/does not exist|schema cache/i.test(messageError.message)) {
      return 0;
    }
    throw new Error(messageError.message);
  }

  const latest = new Map<string, { sender_id: string }>();
  for (const row of messages ?? []) {
    const applicationId = String(row.application_id);
    if (!latest.has(applicationId)) {
      latest.set(applicationId, { sender_id: String(row.sender_id) });
    }
  }

  let unanswered = 0;
  for (const item of latest.values()) {
    if (item.sender_id !== salonUserId) {
      unanswered += 1;
    }
  }
  return unanswered;
}

export async function loadSalonQuickActions(input: {
  businessId: string;
  salonUserId: string;
  appointments: AppointmentOverview[];
}): Promise<SalonQuickActions> {
  const admin = createAdminClient();
  const [unansweredChats, quota] = await Promise.all([
    countUnansweredModelChats(input.businessId, input.salonUserId),
    loadUrgentMatchQuota(admin, input.businessId),
  ]);

  return {
    todayCount: countTodaysAppointments(input.appointments),
    unansweredChats,
    urgentRemaining: quota.remaining,
    urgentLimit: quota.limit,
  };
}
