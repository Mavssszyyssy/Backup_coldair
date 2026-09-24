export const TOTP_REQUIRED_ROLES = new Set([
  "customer",
  "technician",
  "admin",
  "superadmin",
]);

export const normalizeSecurityRole = (role = "") =>
  String(role).trim().toLowerCase().replace(/-/g, "_");

export const roleRequiresTotp = (role) =>
  TOTP_REQUIRED_ROLES.has(normalizeSecurityRole(role));

export const requiresTotpEnrollment = (user = {}) =>
  roleRequiresTotp(user.role)
  && (!user.security?.totpEnabled || Boolean(user.security?.totpResetRequired));
