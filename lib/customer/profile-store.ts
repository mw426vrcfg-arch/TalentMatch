import { type HairProfile, readHairProfile } from "@/lib/hair/criteria";
import { memberLevelFromPoints, normalizeMemberLevel } from "@/lib/loyalty/levels";
import { portfolioFromProfileRow } from "@/lib/customer/portfolio";
import { normalizeThickness, readTreatmentPass, type TreatmentPass } from "@/lib/customer/treatment-pass";
import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerProfile = {
  id: string | null;
  user_id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  hair_portfolio: string[];
  hair: HairProfile;
  treatment_pass: TreatmentPass;
  beauty_points: number;
  member_level: string;
};

type Admin = ReturnType<typeof createAdminClient>;

const FIELD_ALIASES = {
  full_name: ["full_name", "name", "display_name"],
  bio: ["bio", "description", "about"],
  avatar_url: [
    "profile_picture_url",
    "avatar_url",
    "photo_url",
    "image_url",
    "profile_image",
    "logo_url",
  ],
};

const HAIR_COLUMN_ALIASES = {
  structure: ["hair_structure", "hair_type"],
  length: ["hair_length"],
  chemical: ["hair_chemical", "chemical_treatment"],
} as const;

const PORTFOLIO_WRITE_COLUMNS = ["hair_portfolio", "portfolio_images", "gallery_urls", "portfolio_urls"];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function firstString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (!(key in row)) {
      continue;
    }
    const value = row[key];
    if (value == null) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return null;
}

export function mapCustomerProfileRow(row: unknown, userId: string): CustomerProfile | null {
  const data = asRecord(row);
  if (!data) {
    return null;
  }

  const points = Math.max(0, Number(data.beauty_points ?? 0) || 0);

  return {
    id: data.id != null ? String(data.id) : null,
    user_id: String(data.user_id ?? userId),
    full_name: firstString(data, FIELD_ALIASES.full_name) ?? "",
    bio: firstString(data, FIELD_ALIASES.bio),
    avatar_url: firstString(data, FIELD_ALIASES.avatar_url),
    hair_portfolio: portfolioFromProfileRow(data),
    hair: readHairProfile({
      hair_structure: firstString(data, [...HAIR_COLUMN_ALIASES.structure]),
      hair_length: firstString(data, [...HAIR_COLUMN_ALIASES.length]),
      hair_chemical: firstString(data, [...HAIR_COLUMN_ALIASES.chemical]),
    }),
    treatment_pass: readTreatmentPass(data),
    beauty_points: points,
    member_level: normalizeMemberLevel(
      data.member_level != null ? String(data.member_level) : memberLevelFromPoints(points),
    ),
  };
}

export async function loadCustomerProfile(admin: Admin, userId: string) {
  const byUserId = await admin
    .from("customer_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUserId.error && !/does not exist|schema cache/i.test(byUserId.error.message)) {
    throw new Error(byUserId.error.message);
  }

  const row = byUserId.data
    ? byUserId.data
    : (
        await admin.from("customer_profiles").select("*").eq("id", userId).maybeSingle()
      ).data;

  if (byUserId.error && !row) {
    if (/does not exist|schema cache/i.test(byUserId.error.message)) {
      return { profile: null as CustomerProfile | null, columns: [] as string[], row: null as Record<string, unknown> | null };
    }
    throw new Error(byUserId.error.message);
  }

  return {
    profile: mapCustomerProfileRow(row, userId),
    columns: row
      ? Object.keys(row)
      : ["id", "user_id", "full_name", "bio", "profile_picture_url", "hair_portfolio", "portfolio_images", "hair_structure", "hair_length", "hair_chemical", "chemical_treatment"],
    row: asRecord(row),
  };
}

function payloadForColumns(
  columns: string[],
  values: {
    user_id: string;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
    hair_portfolio?: string[];
    hair?: HairProfile;
    treatment_pass?: TreatmentPass;
  },
) {
  const columnSet = new Set(columns);
  const payload: Record<string, unknown> = {};
  if (columnSet.has("id")) {
    payload.id = values.user_id;
  }
  if (columnSet.has("user_id")) {
    payload.user_id = values.user_id;
  }
  if (columnSet.has("profile_picture_url")) {
    payload.profile_picture_url = values.avatar_url;
  }
  if (values.hair_portfolio) {
    for (const column of PORTFOLIO_WRITE_COLUMNS) {
      if (columnSet.has(column)) {
        payload[column] = values.hair_portfolio;
      }
    }
  }
  if (values.hair) {
    const hairValues = {
      structure: values.hair.structure,
      length: values.hair.length,
      chemical: values.hair.chemical,
    } as const;
    (Object.keys(HAIR_COLUMN_ALIASES) as (keyof typeof HAIR_COLUMN_ALIASES)[]).forEach((kind) => {
      for (const column of HAIR_COLUMN_ALIASES[kind]) {
        if (columnSet.has(column)) {
          payload[column] = hairValues[kind];
        }
      }
    });
  }
  if (values.treatment_pass) {
    if (columnSet.has("last_bleaching")) {
      payload.last_bleaching = values.treatment_pass.last_bleaching;
    }
    if (columnSet.has("chemical_treatments")) {
      payload.chemical_treatments = values.treatment_pass.chemical_treatments;
    }
    if (columnSet.has("hair_thickness")) {
      payload.hair_thickness = normalizeThickness(values.treatment_pass.hair_thickness);
    }
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

/** Entfernt die von Postgres bemängelte Spalte und meldet ihren Namen zurück. */
function stripMissingColumn(payload: Record<string, unknown>, message: string) {
  const match = message.match(/'([^']+)' column/i);
  if (!match) {
    return null;
  }
  if (match[1] in payload) {
    delete payload[match[1]];
    return match[1];
  }
  return null;
}

function syncInsertPayload(
  insertPayload: Record<string, unknown>,
  payload: Record<string, unknown>,
  userId: string,
) {
  for (const key of Object.keys(insertPayload)) {
    if (!(key in payload) && key !== "id" && key !== "user_id") {
      delete insertPayload[key];
    }
  }
  Object.assign(insertPayload, payload);
  insertPayload.id = userId;
  insertPayload.user_id = userId;
}

export async function saveCustomerProfile(
  admin: Admin,
  input: {
    userId: string;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
    hair_portfolio?: string[];
    hair?: HairProfile;
    treatment_pass?: TreatmentPass;
  },
) {
  const loaded = await loadCustomerProfile(admin, input.userId);
  const columns =
    loaded.columns.length > 0
      ? loaded.columns
      : ["id", "user_id", "full_name", "bio", "profile_picture_url", "hair_portfolio", "portfolio_images", "hair_structure", "hair_length", "hair_chemical", "chemical_treatment"];
  const payload = payloadForColumns(columns, {
    user_id: input.userId,
    full_name: input.full_name,
    bio: input.bio,
    avatar_url: input.avatar_url,
    hair_portfolio: input.hair_portfolio ?? loaded.profile?.hair_portfolio,
    hair: input.hair ?? loaded.profile?.hair,
    treatment_pass: input.treatment_pass ?? loaded.profile?.treatment_pass,
  });

  const insertPayload = {
    ...payload,
    id: input.userId,
    user_id: input.userId,
  };

  // Fehlende Spalten werden einzeln von Postgres gemeldet, deshalb ein Versuch
  // pro Spalte. Die Namen wandern nach droppedColumns, damit der Aufrufer
  // sichtbar machen kann, welche Daten nicht gespeichert wurden.
  const droppedColumns: string[] = [];

  for (let attempt = 0; attempt < 16; attempt += 1) {
    if (loaded.profile) {
      let query = admin.from("customer_profiles").update(insertPayload);
      query = loaded.profile.id
        ? query.eq("id", loaded.profile.id)
        : query.eq("user_id", input.userId);

      const { data, error } = await query.select("*").maybeSingle();

      if (!error) {
        return { profile: mapCustomerProfileRow(data, input.userId), droppedColumns };
      }
      const removed = isMissingColumnError(error.message)
        ? stripMissingColumn(payload, error.message)
        : null;
      if (removed) {
        droppedColumns.push(removed);
        syncInsertPayload(insertPayload, payload, input.userId);
        continue;
      }
      throw new Error(error.message);
    }

    const { data, error } = await admin
      .from("customer_profiles")
      .insert(insertPayload)
      .select("*")
      .single();

    if (!error) {
      return { profile: mapCustomerProfileRow(data, input.userId), droppedColumns };
    }
    const removed = isMissingColumnError(error.message)
      ? stripMissingColumn(payload, error.message)
      : null;
    if (removed) {
      droppedColumns.push(removed);
      syncInsertPayload(insertPayload, payload, input.userId);
      continue;
    }
    if (/duplicate key|unique constraint/i.test(error.message)) {
      const { data: updated, error: updateError } = await admin
        .from("customer_profiles")
        .update(insertPayload)
        .eq("id", input.userId)
        .select("*")
        .maybeSingle();
      if (!updateError) {
        return { profile: mapCustomerProfileRow(updated, input.userId), droppedColumns };
      }
    }
    throw new Error(error.message);
  }

  throw new Error("Kundenprofil konnte nicht gespeichert werden.");
}
