import { sanitizeUuid } from "@/lib/security/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";

export type BusinessProfile = {
  id: string;
  business_name: string;
  location: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
};

type Admin = ReturnType<typeof createAdminClient>;

const FIELD_ALIASES: Record<keyof Omit<BusinessProfile, "id">, string[]> = {
  business_name: ["business_name", "name", "salon_name"],
  location: ["location", "city", "ort"],
  description: ["description", "bio", "about"],
  address: ["address", "street", "adresse", "street_address"],
  phone: ["phone", "telephone", "tel"],
  logo_url: [
    "logo_url",
    "profile_picture_url",
    "logo",
    "image_url",
    "photo_url",
    "avatar_url",
  ],
};

const ADDRESS_WRITE_COLUMNS = ["address", "street", "adresse", "street_address"];
const LOGO_WRITE_COLUMNS = ["logo_url", "profile_picture_url", "logo", "image_url"];

const DEFAULT_COLUMNS = [
  "id",
  "user_id",
  "business_name",
  "location",
  "description",
  "address",
  "street",
  "phone",
  "logo_url",
  "profile_picture_url",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function firstString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (value != null && typeof value !== "string" && String(value).trim()) {
      return String(value);
    }
  }
  return null;
}

function readPhoneColumn(row: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(row, "phone") || row.phone == null) {
    return null;
  }
  const value = String(row.phone).trim();
  return value || null;
}

export function mapBusinessRow(row: unknown, userId?: string): BusinessProfile | null {
  const data = asRecord(row);
  if (!data) {
    return null;
  }

  const id = data.id != null ? String(data.id) : userId;
  if (!id) {
    return null;
  }

  return {
    id,
    business_name: firstString(data, FIELD_ALIASES.business_name) ?? "",
    location: firstString(data, FIELD_ALIASES.location) ?? "",
    description: firstString(data, FIELD_ALIASES.description),
    address: firstString(data, FIELD_ALIASES.address),
    phone: readPhoneColumn(data),
    logo_url: firstString(data, FIELD_ALIASES.logo_url),
  };
}

function rowFilledScore(row: unknown) {
  const mapped = mapBusinessRow(row);
  if (!mapped) {
    return 0;
  }
  return [mapped.business_name, mapped.location, mapped.description, mapped.address, mapped.phone, mapped.logo_url].filter(
    (value) => typeof value === "string" && value.trim(),
  ).length;
}

function pickBestBusinessRow(rows: unknown[], userId: string) {
  const unique = new Map<string, unknown>();
  for (const row of rows) {
    const mapped = mapBusinessRow(row, userId);
    if (!mapped) {
      continue;
    }
    const previous = unique.get(mapped.id);
    if (!previous || rowFilledScore(row) >= rowFilledScore(previous)) {
      unique.set(mapped.id, row);
    }
  }

  const candidates = [...unique.values()];
  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const scoreDiff = rowFilledScore(b) - rowFilledScore(a);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    const aId = mapBusinessRow(a, userId)?.id;
    const bId = mapBusinessRow(b, userId)?.id;
    if (aId === userId) {
      return -1;
    }
    if (bId === userId) {
      return 1;
    }
    return 0;
  });

  return candidates[0];
}

async function fetchRowsByFilter(admin: Admin, column: "id" | "user_id", userId: string) {
  const { data, error } = await admin.from("business_profiles").select("*").eq(column, userId);

  if (error) {
    if (/does not exist|schema cache|could not find/i.test(error.message)) {
      return [] as unknown[];
    }
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data : data ? [data] : [];
}

async function fetchBusinessRow(admin: Admin, userId: string) {
  const rows: unknown[] = [];

  // Einzige Stelle mit einem selbst gebauten PostgREST-Filterstring: die ID muss
  // vorher eine echte UUID sein, sonst wird gar nicht erst gefiltert.
  const safeUserId = sanitizeUuid(userId);
  const combined = safeUserId
    ? await admin
        .from("business_profiles")
        .select("*")
        .or(`id.eq.${safeUserId},user_id.eq.${safeUserId}`)
    : { data: null, error: null };

  if (!combined.error && combined.data) {
    rows.push(...(Array.isArray(combined.data) ? combined.data : [combined.data]));
  } else if (
    combined.error &&
    !/does not exist|schema cache|could not find|user_id/i.test(combined.error.message)
  ) {
    throw new Error(combined.error.message);
  }

  rows.push(...(await fetchRowsByFilter(admin, "id", userId)));
  rows.push(...(await fetchRowsByFilter(admin, "user_id", userId)));

  return {
    row: pickBestBusinessRow(rows, userId),
    error: null as { message: string } | null,
  };
}

export async function loadBusinessProfileByUserId(admin: Admin, userId: string) {
  const { row, error } = await fetchBusinessRow(admin, userId);

  if (error && !row) {
    if (/does not exist|schema cache/i.test(error.message)) {
      return { profile: null as BusinessProfile | null, columns: DEFAULT_COLUMNS };
    }
    throw new Error(error.message);
  }

  return {
    profile: mapBusinessRow(row, userId),
    columns: row ? Object.keys(row) : await probeBusinessProfileColumns(admin),
  };
}

async function probeBusinessProfileColumns(admin: Admin) {
  const { data } = await admin.from("business_profiles").select("*").limit(1);
  if (data && data[0]) {
    return Object.keys(data[0] as object);
  }
  return DEFAULT_COLUMNS;
}

function writeAliasedValue(
  payload: Record<string, unknown>,
  columnSet: Set<string>,
  aliases: string[],
  value: unknown,
  alwaysTry: string[],
) {
  let wrote = false;
  for (const name of aliases) {
    if (columnSet.has(name)) {
      payload[name] = value;
      wrote = true;
    }
  }
  if (!wrote) {
    for (const name of alwaysTry) {
      payload[name] = value;
    }
  }
}

function payloadForColumns(
  columns: string[],
  values: {
    user_id: string;
    business_name: string;
    location: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    logo_url: string | null;
  },
) {
  const columnSet = new Set(columns);
  const payload: Record<string, unknown> = {};

  if (columnSet.has("id") || columns.length === 0) {
    payload.id = values.user_id;
  }
  if (columnSet.has("user_id") || columns.length === 0) {
    payload.user_id = values.user_id;
  }

  (Object.keys(FIELD_ALIASES) as (keyof typeof FIELD_ALIASES)[]).forEach((logical) => {
    if (logical === "address") {
      writeAliasedValue(
        payload,
        columnSet,
        FIELD_ALIASES.address,
        values.address,
        ADDRESS_WRITE_COLUMNS,
      );
      return;
    }
    if (logical === "logo_url") {
      writeAliasedValue(
        payload,
        columnSet,
        FIELD_ALIASES.logo_url,
        values.logo_url,
        LOGO_WRITE_COLUMNS,
      );
      return;
    }
    if (logical === "phone") {
      return;
    }
    const column = FIELD_ALIASES[logical].find((name) => columnSet.has(name));
    if (column) {
      payload[column] = values[logical];
    }
  });

  payload.phone = values.phone;

  return payload;
}

function isMissingColumnError(message: string) {
  return /could not find the '([^']+)' column|schema cache/i.test(message);
}

function stripMissingColumn(payload: Record<string, unknown>, message: string) {
  const match = message.match(/'([^']+)' column/i);
  if (!match) {
    return false;
  }
  if (match[1] === "phone") {
    return false;
  }
  if (match[1] in payload) {
    delete payload[match[1]];
    return true;
  }
  return false;
}

function syncIdentity(payload: Record<string, unknown>, userId: string) {
  payload.id = userId;
  payload.user_id = userId;
}

async function persistBusinessPhone(
  admin: Admin,
  profileId: string,
  userId: string,
  phone: string | null,
) {
  const byId = await admin.from("business_profiles").update({ phone }).eq("id", profileId);
  if (!byId.error) {
    return;
  }
  const byUser = await admin.from("business_profiles").update({ phone }).eq("user_id", userId);
  if (byUser.error) {
    throw new Error(byId.error.message);
  }
}

async function finishSavedProfile(
  admin: Admin,
  userId: string,
  profileId: string,
  phone: string | null,
) {
  await persistBusinessPhone(admin, profileId, userId, phone);
  const { profile } = await loadBusinessProfileByUserId(admin, userId);
  if (!profile) {
    return { id: profileId, business_name: "", location: "", description: null, address: null, phone, logo_url: null };
  }
  return { ...profile, phone: profile.phone ?? phone };
}

export async function saveBusinessProfile(
  admin: Admin,
  input: {
    userId: string;
    profileId?: string;
    business_name: string;
    location: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    logo_url: string | null;
  },
) {
  const loaded = await loadBusinessProfileByUserId(admin, input.userId);
  const columns = [
    ...new Set([
      ...loaded.columns,
      ...DEFAULT_COLUMNS,
      ...ADDRESS_WRITE_COLUMNS,
      ...LOGO_WRITE_COLUMNS,
    ]),
  ];
  const payload = payloadForColumns(columns, {
    user_id: input.userId,
    business_name: input.business_name,
    location: input.location,
    description: input.description,
    address: input.address,
    phone: input.phone,
    logo_url: input.logo_url,
  });
  syncIdentity(payload, input.userId);

  const existingId = loaded.profile?.id ?? input.profileId;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (existingId) {
      const updatePayload = { ...payload };
      if (existingId !== input.userId) {
        delete updatePayload.id;
      }

      const { data, error } = await admin
        .from("business_profiles")
        .update(updatePayload)
        .eq("id", existingId)
        .select("*")
        .maybeSingle();

      if (!error && data) {
        return finishSavedProfile(
          admin,
          input.userId,
          String((data as { id?: string }).id ?? existingId),
          input.phone,
        );
      }

      if (!error && !data) {
        const byUser = await admin
          .from("business_profiles")
          .update(payload)
          .eq("user_id", input.userId)
          .select("*")
          .maybeSingle();
        if (!byUser.error && byUser.data) {
          return finishSavedProfile(admin, input.userId, String((byUser.data as { id?: string }).id), input.phone);
        }
      } else if (error) {
        if (isMissingColumnError(error.message) && stripMissingColumn(payload, error.message)) {
          syncIdentity(payload, input.userId);
          continue;
        }
        if (!/duplicate key|unique constraint/i.test(error.message)) {
          throw new Error(error.message);
        }
      }
    }

    const { data, error } = await admin
      .from("business_profiles")
      .insert({ ...payload, id: input.userId, user_id: input.userId })
      .select("*")
      .single();

    if (!error && data) {
      return finishSavedProfile(admin, input.userId, String((data as { id?: string }).id ?? input.userId), input.phone);
    }
    if (error && isMissingColumnError(error.message) && stripMissingColumn(payload, error.message)) {
      syncIdentity(payload, input.userId);
      continue;
    }
    if (error && /duplicate key|unique constraint/i.test(error.message)) {
      const { data: updated, error: updateError } = await admin
        .from("business_profiles")
        .update(payload)
        .eq("id", input.userId)
        .select("*")
        .maybeSingle();
      if (!updateError && updated) {
        return finishSavedProfile(admin, input.userId, String((updated as { id?: string }).id ?? input.userId), input.phone);
      }
      const { data: byUser, error: byUserError } = await admin
        .from("business_profiles")
        .update(payload)
        .eq("user_id", input.userId)
        .select("*")
        .maybeSingle();
      if (!byUserError && byUser) {
        return finishSavedProfile(admin, input.userId, String((byUser as { id?: string }).id ?? input.userId), input.phone);
      }
    }
    throw new Error(error?.message ?? "Profil konnte nicht gespeichert werden.");
  }

  throw new Error("Profil konnte nicht gespeichert werden.");
}
