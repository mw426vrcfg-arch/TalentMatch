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
  address: ["address", "street", "adresse"],
  phone: ["phone", "telephone", "tel"],
  logo_url: ["logo_url", "logo", "image_url", "avatar_url"],
};

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
    if (value != null && typeof value !== "string") {
      return String(value);
    }
  }
  for (const key of keys) {
    if (key in row) {
      const value = row[key];
      return value == null ? null : String(value);
    }
  }
  return null;
}

export function mapBusinessRow(row: unknown): BusinessProfile | null {
  const data = asRecord(row);
  if (!data || data.id == null) {
    return null;
  }

  return {
    id: String(data.id),
    business_name: firstString(data, FIELD_ALIASES.business_name) ?? "",
    location: firstString(data, FIELD_ALIASES.location) ?? "",
    description: firstString(data, FIELD_ALIASES.description),
    address: firstString(data, FIELD_ALIASES.address),
    phone: firstString(data, FIELD_ALIASES.phone),
    logo_url: firstString(data, FIELD_ALIASES.logo_url),
  };
}

export async function loadBusinessProfileByUserId(admin: Admin, userId: string) {
  const { data, error } = await admin
    .from("business_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    profile: mapBusinessRow(data),
    columns: data ? Object.keys(data) : await probeBusinessProfileColumns(admin),
  };
}

async function probeBusinessProfileColumns(admin: Admin) {
  const { data } = await admin.from("business_profiles").select("*").limit(1);
  if (data && data[0]) {
    return Object.keys(data[0] as object);
  }
  return [
    "id",
    "user_id",
    "business_name",
    "location",
    "description",
    "address",
    "phone",
    "logo_url",
  ];
}

function payloadForColumns(
  columns: string[],
  values: {
    user_id?: string;
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

  if (values.user_id && columnSet.has("user_id")) {
    payload.user_id = values.user_id;
  }

  (Object.keys(FIELD_ALIASES) as (keyof typeof FIELD_ALIASES)[]).forEach((logical) => {
    const column = FIELD_ALIASES[logical].find((name) => columnSet.has(name));
    if (column) {
      payload[column] = values[logical];
    }
  });

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
  if (match[1] in payload) {
    delete payload[match[1]];
    return true;
  }
  return false;
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
  const columns = loaded.columns;
  const payload = payloadForColumns(columns, {
    user_id: input.userId,
    business_name: input.business_name,
    location: input.location,
    description: input.description,
    address: input.address,
    phone: input.phone,
    logo_url: input.logo_url,
  });

  const profileId = input.profileId ?? loaded.profile?.id;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (profileId) {
      const { data, error } = await admin
        .from("business_profiles")
        .update(payload)
        .eq("id", profileId)
        .select("*")
        .maybeSingle();

      if (!error) {
        return mapBusinessRow(data) ?? loaded.profile;
      }
      if (isMissingColumnError(error.message) && stripMissingColumn(payload, error.message)) {
        continue;
      }
      throw new Error(error.message);
    }

    const insertPayload = { ...payload, user_id: input.userId };
    const { data, error } = await admin
      .from("business_profiles")
      .insert(insertPayload)
      .select("*")
      .single();

    if (!error) {
      return mapBusinessRow(data);
    }
    if (isMissingColumnError(error.message) && stripMissingColumn(payload, error.message)) {
      continue;
    }
    throw new Error(error.message);
  }

  throw new Error("Profil konnte nicht gespeichert werden.");
}
