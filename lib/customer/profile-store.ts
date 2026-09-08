import { type HairProfile, readHairProfile } from "@/lib/hair/criteria";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { memberLevelFromPoints, normalizeMemberLevel } from "@/lib/loyalty/levels";
import { portfolioFromProfileRow } from "@/lib/customer/portfolio";
import { asGenderOrNull } from "@/lib/profile/gender";
import { type ProfileDb, mirrorToProfilesTable } from "@/lib/profile/write-row";
import { normalizeThickness, readTreatmentPass, type TreatmentPass } from "@/lib/customer/treatment-pass";

export type CustomerProfile = {
  id: string | null;
  user_id: string;
  full_name: string;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
  hair_portfolio: string[];
  hair: HairProfile;
  treatment_pass: TreatmentPass;
  beauty_points: number;
  member_level: string;
  gender: "female" | "male" | "diverse" | null;
  preferred_language: Locale | null;
  in_app_push: boolean;
};

const FIELD_ALIASES = {
  full_name: ["full_name", "name", "display_name"],
  bio: ["bio", "description", "about"],
  phone: ["phone", "telephone", "tel"],
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

const NEW_ROW_COLUMNS = [
  "id",
  "user_id",
  "full_name",
  "bio",
  "phone",
  "profile_picture_url",
  "hair_structure",
  "hair_length",
  "hair_chemical",
  "gender",
  "preferred_language",
  "last_bleaching",
  "chemical_treatments",
  "hair_thickness",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function filledText(value: unknown) {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  if (!text || text === "null" || text === "undefined") {
    return null;
  }
  return text;
}

function firstString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (!(key in row)) {
      continue;
    }
    const text = filledText(row[key]);
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

  const points = Math.max(0, Number(data.beauty_points ?? data.points ?? 0) || 0);
  const languageRaw = firstString(data, ["preferred_language", "locale", "language"]);

  return {
    id: data.id != null ? String(data.id) : null,
    user_id: String(data.user_id ?? userId),
    full_name: firstString(data, FIELD_ALIASES.full_name) ?? "",
    bio: firstString(data, FIELD_ALIASES.bio),
    phone: firstString(data, FIELD_ALIASES.phone),
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
    gender: asGenderOrNull(data.gender),
    preferred_language: isLocale(languageRaw) ? languageRaw : null,
    in_app_push: data.in_app_push == null ? true : Boolean(data.in_app_push),
  };
}

function filled(value: string | null | undefined) {
  return Boolean(filledText(value));
}

function mergeCustomerProfiles(
  primary: CustomerProfile | null,
  extra: CustomerProfile | null,
): CustomerProfile | null {
  if (!primary) {
    return extra;
  }
  if (!extra) {
    return primary;
  }
  return {
    ...primary,
    full_name: filled(primary.full_name) ? primary.full_name : extra.full_name,
    bio: filled(primary.bio) ? primary.bio : extra.bio,
    phone: filled(primary.phone) ? primary.phone : extra.phone,
    avatar_url: filled(primary.avatar_url) ? primary.avatar_url : extra.avatar_url,
    hair: {
      structure: primary.hair.structure ?? extra.hair.structure,
      length: primary.hair.length ?? extra.hair.length,
      chemical: primary.hair.chemical ?? extra.hair.chemical,
    },
    treatment_pass: {
      last_bleaching: primary.treatment_pass.last_bleaching ?? extra.treatment_pass.last_bleaching,
      chemical_treatments:
        primary.treatment_pass.chemical_treatments ?? extra.treatment_pass.chemical_treatments,
      hair_thickness: primary.treatment_pass.hair_thickness ?? extra.treatment_pass.hair_thickness,
    },
    gender: primary.gender ?? extra.gender,
    preferred_language: primary.preferred_language ?? extra.preferred_language,
  };
}

async function loadTableRow(db: ProfileDb, table: string, userId: string) {
  const byUser = await db.from(table).select("*").eq("user_id", userId).maybeSingle();
  if (!byUser.error && byUser.data) {
    return asRecord(byUser.data);
  }
  if (byUser.error && !/does not exist|schema cache|could not find the table/i.test(byUser.error.message)) {
    throw new Error(byUser.error.message);
  }

  const byId = await db.from(table).select("*").eq("id", userId).maybeSingle();
  if (byId.error && !/does not exist|schema cache|could not find the table/i.test(byId.error.message)) {
    throw new Error(byId.error.message);
  }
  return asRecord(byId.data);
}

export async function loadCustomerProfile(
  db: ProfileDb,
  userId: string,
  authMetadata?: Record<string, unknown> | null,
) {
  let customerRow: Record<string, unknown> | null = null;
  try {
    customerRow = await loadTableRow(db, "customer_profiles", userId);
  } catch (error) {
    if (!(error instanceof Error) || !/does not exist|schema cache/i.test(error.message)) {
      throw error;
    }
  }

  let genericRow: Record<string, unknown> | null = null;
  try {
    genericRow = await loadTableRow(db, "profiles", userId);
  } catch {
    genericRow = null;
  }

  let mapped = mergeCustomerProfiles(
    mapCustomerProfileRow(customerRow, userId),
    mapCustomerProfileRow(genericRow, userId),
  );

  const { data: userRow } = await db.from("users").select("full_name, phone").eq("id", userId).maybeSingle();
  const userPhone = userRow ? firstString(asRecord(userRow) ?? {}, FIELD_ALIASES.phone) : null;
  const userName = userRow ? firstString(asRecord(userRow) ?? {}, FIELD_ALIASES.full_name) : "";

  if (userName || userPhone) {
    mapped = mergeCustomerProfiles(
      mapped,
      mapCustomerProfileRow(
        { id: userId, user_id: userId, full_name: userName, phone: userPhone },
        userId,
      ),
    );
  }

  if (authMetadata) {
    mapped = mergeCustomerProfiles(
      mapped,
      mapCustomerProfileRow({ ...authMetadata, id: userId, user_id: userId }, userId),
    );
  }

  const columns = customerRow
    ? Object.keys(customerRow)
    : genericRow
      ? Object.keys(genericRow)
      : [];

  return {
    profile: mapped,
    columns,
    row: customerRow ?? genericRow,
  };
}

function payloadForColumns(
  columns: string[],
  values: {
    user_id: string;
    full_name: string;
    bio: string | null;
    phone: string | null;
    avatar_url: string | null;
    hair_portfolio?: string[];
    hair?: HairProfile;
    treatment_pass?: TreatmentPass;
    gender?: "female" | "male" | "diverse" | null;
    preferred_language?: Locale | null;
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
  if (values.hair_portfolio !== undefined) {
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
  if (values.gender !== undefined && columnSet.has("gender")) {
    payload.gender = values.gender;
  }
  if (values.preferred_language !== undefined) {
    for (const column of ["preferred_language", "locale", "language"]) {
      if (columnSet.has(column)) {
        payload[column] = values.preferred_language;
        break;
      }
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

async function finishCustomerSave(
  db: ProfileDb,
  userId: string,
  row: unknown,
  droppedColumns: string[],
  input: {
    full_name: string;
    phone: string | null;
    bio: string | null;
    gender?: "female" | "male" | "diverse" | null;
    preferred_language?: Locale | null;
    hair?: HairProfile;
  },
) {
  const mapped = mapCustomerProfileRow(row, userId);
  const userUpdate = { full_name: input.full_name, phone: input.phone };
  const userResult = await db.from("users").update(userUpdate).eq("id", userId);
  if (userResult.error) {
    if (isMissingColumnError(userResult.error.message) && /phone/i.test(userResult.error.message)) {
      const retry = await db.from("users").update({ full_name: input.full_name }).eq("id", userId);
      if (retry.error && !isMissingColumnError(retry.error.message)) {
        throw new Error(retry.error.message);
      }
    } else {
      throw new Error(userResult.error.message);
    }
  }
  await mirrorToProfilesTable(db, userId, {
    full_name: input.full_name,
    bio: input.bio,
    phone: input.phone,
    gender: input.gender ?? mapped?.gender ?? null,
    preferred_language: input.preferred_language ?? mapped?.preferred_language ?? null,
    hair_structure: input.hair?.structure ?? mapped?.hair.structure ?? null,
    hair_length: input.hair?.length ?? mapped?.hair.length ?? null,
    hair_chemical: input.hair?.chemical ?? mapped?.hair.chemical ?? null,
  });
  return {
    profile: mergeCustomerProfiles(mapped, {
      id: mapped?.id ?? userId,
      user_id: userId,
      full_name: input.full_name,
      bio: input.bio,
      phone: input.phone,
      avatar_url: mapped?.avatar_url ?? null,
      hair_portfolio: mapped?.hair_portfolio ?? [],
      hair: input.hair ?? mapped?.hair ?? { structure: null, length: null, chemical: null },
      treatment_pass: mapped?.treatment_pass ?? {
        last_bleaching: null,
        chemical_treatments: null,
        hair_thickness: null,
      },
      beauty_points: mapped?.beauty_points ?? 0,
      member_level: mapped?.member_level ?? "Bronze",
      gender: input.gender !== undefined ? input.gender : mapped?.gender ?? null,
      preferred_language:
        input.preferred_language !== undefined
          ? input.preferred_language
          : mapped?.preferred_language ?? null,
      in_app_push: mapped?.in_app_push ?? true,
    }),
    droppedColumns,
  };
}

export async function saveCustomerProfile(
  db: ProfileDb,
  input: {
    userId: string;
    full_name: string;
    bio: string | null;
    phone: string | null;
    avatar_url: string | null;
    hair_portfolio?: string[];
    hair?: HairProfile;
    treatment_pass?: TreatmentPass;
    gender?: "female" | "male" | "diverse" | null;
    preferred_language?: Locale | null;
  },
) {
  const loaded = await loadCustomerProfile(db, input.userId);
  const columns = loaded.columns.length > 0 ? loaded.columns : NEW_ROW_COLUMNS;
  const payload = payloadForColumns(columns, {
    user_id: input.userId,
    full_name: input.full_name,
    bio: input.bio,
    phone: input.phone,
    avatar_url: input.avatar_url,
    hair_portfolio: input.hair_portfolio,
    hair: input.hair ?? loaded.profile?.hair,
    treatment_pass: input.treatment_pass ?? loaded.profile?.treatment_pass,
    gender: input.gender !== undefined ? input.gender : loaded.profile?.gender,
    preferred_language:
      input.preferred_language !== undefined
        ? input.preferred_language
        : loaded.profile?.preferred_language,
  });

  const insertPayload = {
    ...payload,
    id: input.userId,
    user_id: input.userId,
  };

  const droppedColumns: string[] = [];
  const finish = (row: unknown) =>
    finishCustomerSave(db, input.userId, row, droppedColumns, {
      full_name: input.full_name,
      phone: input.phone,
      bio: input.bio,
      gender: input.gender,
      preferred_language: input.preferred_language,
      hair: input.hair,
    });

  for (let attempt = 0; attempt < 16; attempt += 1) {
    if (loaded.profile) {
      let query = db.from("customer_profiles").update(insertPayload);
      query = loaded.profile.id
        ? query.eq("id", loaded.profile.id)
        : query.eq("user_id", input.userId);

      const { data, error } = await query.select("*").maybeSingle();

      if (!error && data) {
        return finish(data);
      }
      if (!error && !data) {
        const byUser = await db
          .from("customer_profiles")
          .update(insertPayload)
          .eq("user_id", input.userId)
          .select("*")
          .maybeSingle();
        if (!byUser.error && byUser.data) {
          return finish(byUser.data);
        }
      } else if (error) {
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
    }

    const { data, error } = await db
      .from("customer_profiles")
      .insert(insertPayload)
      .select("*")
      .single();

    if (!error) {
      return finish(data);
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
      const { data: updated, error: updateError } = await db
        .from("customer_profiles")
        .update(insertPayload)
        .eq("id", input.userId)
        .select("*")
        .maybeSingle();
      if (!updateError && updated) {
        return finish(updated);
      }
    }
    throw new Error(error.message);
  }

  throw new Error("Kundenprofil konnte nicht gespeichert werden.");
}
