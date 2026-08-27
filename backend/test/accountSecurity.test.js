const test = require("node:test");
const assert = require("node:assert/strict");
const speakeasy = require("speakeasy");
const User = require("../src/models/User");
const { isRecoveryRequestAllowed } = require("../src/middleware/auth");
const {
  buildTotpSetup,
  decryptSecret,
  encryptSecret,
  findRecoveryCodeIndex,
  generateOtpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotpCode,
} = require("../src/domain/accountSecurity");

test("OTP generation always returns a secure six-digit value", () => {
  const values = new Set(Array.from({ length: 100 }, generateOtpCode));
  assert.equal(values.size > 90, true);
  for (const value of values) assert.match(value, /^\d{6}$/);
});

test("recovery codes are unique, normalized, and one-way hashed", () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 6);
  assert.equal(new Set(codes).size, 6);
  for (const code of codes) assert.match(code, /^[A-HJ-NP-Z2-9]{12}$/);
  assert.equal(normalizeRecoveryCode(` ${codes[0].toLowerCase()} `), codes[0]);
  assert.equal(hashRecoveryCode(codes[0]), hashRecoveryCode(codes[0].toLowerCase()));
  assert.notEqual(hashRecoveryCode(codes[0]), codes[0]);
  const hashes = codes.map(hashRecoveryCode);
  const matchIndex = findRecoveryCodeIndex(hashes, codes[2]);
  assert.equal(matchIndex, 2);
  hashes.splice(matchIndex, 1);
  assert.equal(findRecoveryCodeIndex(hashes, codes[2]), -1);
});

test("authenticator secrets are encrypted at rest and verify real TOTP codes", () => {
  const setup = buildTotpSetup({ accountName: "customer@example.com" });
  const encrypted = encryptSecret(setup.secret);
  assert.notEqual(encrypted.includes(setup.secret), true);
  assert.equal(decryptSecret(encrypted), setup.secret);
  const token = speakeasy.totp({ secret: setup.secret, encoding: "base32" });
  assert.equal(verifyTotpCode({ secret: setup.secret, code: token }), true);
  assert.equal(verifyTotpCode({ secret: setup.secret, code: "12345" }), false);
});

test("serialized accounts never expose authenticator secrets or recovery hashes", () => {
  const user = new User({
    name_first: "Security",
    name_last: "Test",
    alias: `security.test.${Date.now()}`,
    security: {
      totpEnabled: true,
      totpSecretEncrypted: "encrypted-secret",
      totpPendingSecretEncrypted: "pending-secret",
      recoveryCodeHashes: ["private-hash"],
      recoveryCodesRemaining: 1,
    },
  });
  const serialized = user.toJSON();
  assert.equal(serialized.security.totpEnabled, true);
  assert.equal(serialized.security.recoveryCodesRemaining, 1);
  assert.equal("totpSecretEncrypted" in serialized.security, false);
  assert.equal("totpPendingSecretEncrypted" in serialized.security, false);
  assert.equal("recoveryCodeHashes" in serialized.security, false);
});

test("recovery sessions can only access authenticator setup and session hydration", () => {
  assert.equal(isRecoveryRequestAllowed("/api/security/totp/setup"), true);
  assert.equal(isRecoveryRequestAllowed("/api/security/totp/verify?source=recovery"), true);
  assert.equal(isRecoveryRequestAllowed("/api/auth/me"), true);
  assert.equal(isRecoveryRequestAllowed("/api/orders/me"), false);
  assert.equal(isRecoveryRequestAllowed("/api/users/profile"), false);
});
