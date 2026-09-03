/**
 * Zentrale Bereinigung aller Freitext-Eingaben, bevor sie in Supabase landen.
 *
 * Gegen SQL-Injection schützt bereits der Supabase-Client: `.insert()`,
 * `.update()` und `.eq()` gehen als PostgREST-Parameter raus, niemals als
 * zusammengesetztes SQL. Die einzige Stelle, an der ein String wirklich in
 * Query-Syntax interpoliert wird, sind PostgREST-Filter (`.or(...)`) und
 * Realtime-Filter – dafür gibt es `sanitizeUuid`, das alles verwirft, was kein
 * UUID-Format hat. Ein Keyword-Blocklisting für Wörter wie "select" oder "drop"
 * wäre hier reine Kosmetik und würde legitime Texte zerstören.
 */

// Steuerzeichen (ohne \n und \t) und unsichtbare Zeichen entfernen.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const INVISIBLE_CHARS = /[\u200B-\u200F\u2028\u2029\uFEFF]/g;

// Vollständige Tags inklusive unvollständiger Reste am Stringende.
const HTML_TAG = /<[^>]*>?/g;

// Gefährliche URL-Schemata, auch mit eingestreuten Whitespaces/Entities.
const DANGEROUS_SCHEME = /(?:javascript|vbscript|livescript)\s*(?::|&#(?:x3a|58);)/gi;
const DATA_HTML_SCHEME = /data\s*:\s*text\s*\/\s*html/gi;

// HTML-Entities, aus denen sich nach einem Decode wieder ein Tag bauen ließe.
const ANGLE_ENTITY = /&(?:lt|gt|#0*(?:60|62)|#x0*3(?:c|e));/gi;

export const TEXT_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  location: 120,
  address: 200,
  title: 140,
  shortNote: 300,
  comment: 1000,
  bio: 1000,
  message: 2000,
  notes: 2000,
  description: 4000,
} as const;

type SanitizeOptions = {
  maxLength?: number;
  multiline?: boolean;
};

/**
 * Entfernt HTML/JS-Fragmente, Steuerzeichen und begrenzt die Länge.
 * Der Text bleibt lesbar – es wird gefiltert, nicht escaped, damit gespeicherte
 * Werte auch außerhalb von React (E-Mail, Export, PDF) unbedenklich sind.
 */
export function sanitizeText(value: unknown, options: SanitizeOptions = {}): string {
  const { maxLength, multiline = false } = options;

  if (value === null || value === undefined) {
    return "";
  }

  // Nur primitive Eingaben akzeptieren – ein File/Blob aus FormData ist kein Text.
  if (typeof value === "object") {
    return "";
  }

  // NFKC zuerst: macht aus Homoglyphen wie "＜script＞" echte spitze Klammern,
  // die anschließend zuverlässig herausgefiltert werden.
  let text = String(value).normalize("NFKC");

  text = text.replace(CONTROL_CHARS, "").replace(INVISIBLE_CHARS, "");
  text = text.replace(ANGLE_ENTITY, "");

  // Wiederholt strippen, damit verschachtelte Reste wie "<scr<script>ipt>"
  // nicht durch einen einzelnen Durchlauf wieder zu einem Tag zusammenwachsen.
  let previous = "";
  while (previous !== text) {
    previous = text;
    text = text.replace(HTML_TAG, "");
  }
  text = text.replace(/[<>]/g, "");

  text = text.replace(DANGEROUS_SCHEME, "").replace(DATA_HTML_SCHEME, "");

  if (multiline) {
    text = text
      .replace(/\r\n?/g, "\n")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    text = text.replace(/\s+/g, " ");
  }

  text = text.trim();

  if (maxLength && text.length > maxLength) {
    text = text.slice(0, maxLength).trim();
  }

  return text;
}

/** Einzeilige Felder: Name, Ort, Titel, Telefon. */
export function sanitizeLine(value: unknown, maxLength: number = TEXT_LIMITS.title): string {
  return sanitizeText(value, { maxLength });
}

/** Mehrzeilige Felder: Bio, Beschreibung, Nachricht, Kommentar. */
export function sanitizeMultiline(
  value: unknown,
  maxLength: number = TEXT_LIMITS.description,
): string {
  return sanitizeText(value, { maxLength, multiline: true });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

/**
 * Pflicht für jede ID, die in einen PostgREST- oder Realtime-Filterstring
 * interpoliert wird. Gibt "" zurück, statt einen manipulierten Wert
 * durchzureichen.
 */
export function sanitizeUuid(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return UUID_PATTERN.test(text) ? text.toLowerCase() : "";
}

/** E-Mail wird nur normalisiert, nie inhaltlich verändert. */
export function sanitizeEmail(value: unknown): string {
  const text = sanitizeText(value, { maxLength: TEXT_LIMITS.email }).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : "";
}

/** Nur Ziffern und übliche Trennzeichen für Telefonnummern zulassen. */
export function sanitizePhone(value: unknown): string {
  const text = sanitizeText(value, { maxLength: TEXT_LIMITS.phone });
  return text.replace(/[^\d+()/\-.\s]/g, "").trim();
}

// -----------------------------------------------------------------------------
// FormData-Reader – der eigentliche Choke-Point in den Server Actions.
// -----------------------------------------------------------------------------

/** Einzeiliger Freitext aus einem Formular. */
export function readLine(
  formData: FormData,
  key: string,
  maxLength: number = TEXT_LIMITS.title,
): string {
  return sanitizeLine(formData.get(key), maxLength);
}

/** Mehrzeiliger Freitext aus einem Formular. */
export function readText(
  formData: FormData,
  key: string,
  maxLength: number = TEXT_LIMITS.description,
): string {
  return sanitizeMultiline(formData.get(key), maxLength);
}

/** ID-Feld: entweder eine valide UUID oder ein leerer String. */
export function readId(formData: FormData, key: string): string {
  return sanitizeUuid(formData.get(key));
}

/**
 * Unveränderter Wert – ausschließlich für Passwörter und andere Geheimnisse,
 * die niemals in die Datenbank geschrieben werden und exakt erhalten bleiben
 * müssen.
 */
export function readSecret(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
