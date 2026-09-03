export function missingColumnFromError(message: string): string | null {
  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column (?:[\w.]+\.)?["']?(\w+)["']? does not exist/i,
    /'([^']+)' column of/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export function isMissingRelation(message: string) {
  return /does not exist|schema cache/i.test(message);
}

/**
 * Insert that drops unknown columns one by one so the same payload works
 * against live schemas and the repo SQL files.
 */
export async function insertFlexible(
  admin: { from: (table: string) => { insert: (row: Record<string, unknown>) => any } },
  table: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  let lastError = "Datensatz konnte nicht gespeichert werden.";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await admin.from(table).insert(payload).select("*").single();
    if (!error) {
      return (data ?? payload) as Record<string, unknown>;
    }
    lastError = error.message;
    const column = missingColumnFromError(error.message);
    if (!column || !(column in payload)) {
      throw new Error(error.message);
    }
    delete payload[column];
  }

  throw new Error(lastError);
}
