export const ACCOUNT_SUFFIX_MAX_LENGTH = 12;

export function validateAccountSuffix(value = "") {
  const suffix = String(value ?? "").trim();
  if (!suffix) return "";
  if (
    suffix.length > ACCOUNT_SUFFIX_MAX_LENGTH ||
    !/^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*\.?$/u.test(suffix) ||
    /(.)\1{4,}/iu.test(suffix)
  ) {
    return "Suffix must be 12 characters or fewer and use letters, spaces, periods, apostrophes, or hyphens.";
  }
  return "";
}
