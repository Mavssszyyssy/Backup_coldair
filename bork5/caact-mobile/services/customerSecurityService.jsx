import * as api from "./api";

async function requireToken() {
  const token = await api.getStoredToken();
  if (!token) throw new Error("Please sign in again.");
  return token;
}

export async function getAccountSecurityStatus() {
  const result = await api.fetchSecurityStatus(await requireToken());
  if (!result.success) throw new Error(result.error || "Unable to load account security.");
  return result.security;
}

export async function ensureRecoveryCodes() {
  const token = await requireToken();
  const current = await api.fetchRecoveryCodes(token);
  if (!current.success) throw new Error(current.error || "Unable to load recovery codes.");
  if (current.security?.recoveryCodesConfigured) return [];
  const generated = await api.regenerateRecoveryCodes(token);
  if (!generated.success) throw new Error(generated.error || "Unable to generate recovery codes.");
  return generated.codes;
}

export async function regenerateRecoveryCodes() {
  const result = await api.regenerateRecoveryCodes(await requireToken());
  if (!result.success) throw new Error(result.error || "Unable to regenerate recovery codes.");
  return result.codes;
}

export async function consumeRecoveryCode(identifier, code) {
  return api.consumeRecoveryCode(identifier, code);
}

export async function ensureCustomerTotpSecret() {
  const result = await api.fetchTotpSecret(await requireToken());
  if (!result.success) throw new Error(result.error || "Unable to start authenticator setup.");
  return result.secret;
}

export async function regenerateCustomerTotpSecret() {
  const result = await api.regenerateTotpSecret(await requireToken());
  if (!result.success) throw new Error(result.error || "Unable to regenerate authenticator setup.");
  return result.secret;
}

export async function verifyCustomerTotpCode(code) {
  return api.verifyTotpSetup(await requireToken(), code);
}
