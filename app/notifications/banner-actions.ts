"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function loadBannerSenderNameAction(senderId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("users").select("full_name").eq("id", senderId).maybeSingle();
  const name = String(data?.full_name ?? "").trim();
  return name || "Neue Nachricht";
}
