const INVALID_CREDENTIALS = "E-Mail-Adresse oder Passwort ist falsch.";
const EMAIL_NOT_CONFIRMED =
  "Bitte bestätige zuerst deine E-Mail-Adresse über den zugesandten Link.";

export function mapSupabaseAuthError(
  error: { message?: string; code?: string } | null | undefined,
  fallback: string,
) {
  const haystack = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();

  if (
    haystack.includes("invalid login credentials") ||
    haystack.includes("invalid_credentials") ||
    haystack.includes("user not found") ||
    haystack.includes("user_not_found")
  ) {
    return INVALID_CREDENTIALS;
  }

  if (haystack.includes("email not confirmed") || haystack.includes("email_not_confirmed")) {
    return EMAIL_NOT_CONFIRMED;
  }

  return fallback;
}
