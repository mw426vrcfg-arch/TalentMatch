import { missingColumnFromError } from "@/lib/supabase/flexible-write";

/** Minimaler Supabase-Client für Profil-Updates (Auth- oder Admin-Client). */
export type ProfileDb = {
  // Die Query-Builder von Auth- und Service-Role-Client sind strukturell gleich.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

function isIgnorableSchemaError(message: string) {
  return (
    Boolean(missingColumnFromError(message)) ||
    /schema cache|does not exist|relation .* does not exist|could not find the table/i.test(message)
  );
}

function compactPayload(payload: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

/**
 * Update einer Profilzeile. Fehlende Spalten werden einzeln entfernt und
 * erneut versucht. Gibt die gespeicherte Zeile oder null zurück.
 */
export async function updateProfileRow(
  db: ProfileDb,
  table: string,
  match: { column: string; value: string },
  payload: Record<string, unknown>,
) {
  const row = compactPayload(payload);
  if (Object.keys(row).length === 0) {
    return { data: null as unknown, droppedColumns: [] as string[] };
  }

  const droppedColumns: string[] = [];

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { data, error } = await db
      .from(table)
      .update(row)
      .eq(match.column, match.value)
      .select("*")
      .maybeSingle();

    if (!error) {
      return { data, droppedColumns };
    }

    const missing = missingColumnFromError(error.message);
    if (missing && missing in row) {
      delete row[missing];
      droppedColumns.push(missing);
      continue;
    }

    if (isIgnorableSchemaError(error.message) && table === "profiles") {
      return { data: null as unknown, droppedColumns };
    }

    throw new Error(error.message);
  }

  throw new Error("Profil konnte nicht gespeichert werden.");
}

/** Spiegelung auf public.profiles, falls die Tabelle existiert. */
export async function mirrorToProfilesTable(
  db: ProfileDb,
  userId: string,
  payload: Record<string, unknown>,
) {
  try {
    const byId = await updateProfileRow(db, "profiles", { column: "id", value: userId }, payload);
    if (byId.data) {
      return;
    }
    await updateProfileRow(db, "profiles", { column: "user_id", value: userId }, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!isIgnorableSchemaError(message)) {
      throw error;
    }
  }
}
