import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type ProfileDb } from "@/lib/profile/write-row";

/** Zuerst der angemeldete User-Client, bei RLS-Fehlern der Admin-Client. */
export async function withProfileWriter<T>(run: (db: ProfileDb) => Promise<T>): Promise<T> {
  const supabase = await createClient();
  try {
    return await run(supabase);
  } catch (error) {
    const admin = tryCreateAdminClient();
    if (!admin) {
      throw error;
    }
    return await run(admin);
  }
}
