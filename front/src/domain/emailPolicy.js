import { apiRequest } from "../config/api";

export const EMAIL_DOMAIN_NOT_ALLOWED_MESSAGE =
  "This email domain is not allowed. Please use a valid and supported email provider.";
export const EMAIL_FORMAT_MESSAGE = "Enter a valid email address.";

const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const DOMAIN_REGEX = /^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();
export const normalizeDomain = (value = "") => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/^@+/, "")
  .replace(/\.$/, "");
export const isValidDomainFormat = (value = "") => DOMAIN_REGEX.test(normalizeDomain(value));

export const isValidEmailFormat = (value = "") => {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) return false;
  const [local] = email.split("@");
  return local.length <= 64
    && !local.startsWith(".")
    && !local.endsWith(".")
    && !local.includes("..");
};

export const extractEmailDomain = (value = "") => {
  const email = normalizeEmail(value);
  return isValidEmailFormat(email) ? email.slice(email.lastIndexOf("@") + 1) : "";
};

let cachedActiveDomains = null;
let cacheExpiresAt = 0;

export const loadActiveEmailDomains = async ({ fresh = false } = {}) => {
  if (!fresh && cachedActiveDomains && cacheExpiresAt > Date.now()) return cachedActiveDomains;
  const result = await apiRequest("/system-settings/email-domains/public");
  if (!Array.isArray(result.activeDomains) || result.activeDomains.length === 0) {
    throw new Error("Email-domain policy is unavailable.");
  }
  cachedActiveDomains = result.activeDomains.map(normalizeDomain).filter(Boolean);
  cacheExpiresAt = Date.now() + 30_000;
  return cachedActiveDomains;
};

export const clearEmailPolicyCache = () => {
  cachedActiveDomains = null;
  cacheExpiresAt = 0;
};

export const validateEmailAgainstDomains = (email, activeDomains) => {
  if (!isValidEmailFormat(email)) return EMAIL_FORMAT_MESSAGE;
  if (!Array.isArray(activeDomains)) return "";
  const domain = extractEmailDomain(email);
  return activeDomains.map(normalizeDomain).includes(domain)
    ? ""
    : EMAIL_DOMAIN_NOT_ALLOWED_MESSAGE;
};

export const validateEmailForSubmission = async (email) => {
  const formatError = validateEmailAgainstDomains(email, null);
  if (formatError) return formatError;
  try {
    const activeDomains = await loadActiveEmailDomains();
    return validateEmailAgainstDomains(email, activeDomains);
  } catch (_error) {
    // The backend repeats the authoritative validation. Do not block a valid
    // custom domain just because the read-only policy request was interrupted.
    return "";
  }
};
