import { createClient } from "@/lib/supabase/server";

/** Flache Auth-Metadaten, als Fallback wenn Tabellenspalten fehlen. */
export async function persistAuthProfileFields(fields: Record<string, unknown>) {
  const data: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }
    if (value == null) {
      data[key] = null;
      continue;
    }
    const text = String(value).trim();
    data[key] = text && text !== "null" && text !== "undefined" ? text : null;
  }

  if (Object.keys(data).length === 0) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data });
  if (error) {
    console.warn("Profil-Metadaten konnten nicht gespeichert werden:", error.message);
  }
}
