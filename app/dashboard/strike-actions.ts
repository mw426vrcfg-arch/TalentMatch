"use server";

import { getStrikeRestriction } from "@/lib/strikes/restriction";
import { createClient } from "@/lib/supabase/server";

export async function loadMyStrikeStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { count: 0, banned: false };
  }

  const restriction = await getStrikeRestriction(user.id);
  return { count: restriction.count, banned: restriction.banned };
}
