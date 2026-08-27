const crypto = require("crypto");
const speakeasy = require("speakeasy");
const env = require("../config/env");

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_CODE_COUNT = 6;
const RECOVERY_CODE_LENGTH = 12;

const encryptionKey = () => crypto
  .createHash("sha256")
  .update(`aeropulse-account-security:${env.jwtSecret}`)
  .digest();

const normalizeRecoveryCode = (value = "") => String(value)
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, "")
  .slice(0, RECOVERY_CODE_LENGTH);

const generateOtpCode = () => String(crypto.randomInt(100000, 1000000));

const generateRecoveryCode = () => {
  let value = "";
  for (let index = 0; index < RECOVERY_CODE_LENGTH; index += 1) {
    value += RECOVERY_ALPHABET[crypto.randomInt(0, RECOVERY_ALPHABET.length)];
  }
  return value;
};

const generateRecoveryCodes = () => Array.from(
  { length: RECOVERY_CODE_COUNT },
  generateRecoveryCode,
);

const hashRecoveryCode = (value = "") => crypto
  .createHmac("sha256", encryptionKey())
  .update(normalizeRecoveryCode(value))
  .digest("hex");

const findRecoveryCodeIndex = (storedHashes = [], value = "") => {
  const requestedHash = hashRecoveryCode(value);
  return storedHashes.findIndex((storedHash) => {
    const left = Buffer.from(String(storedHash), "hex");
    const right = Buffer.from(requestedHash, "hex");
    return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
  });
};

const encryptSecret = (value = "") => {
  if (!value) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
};

const decryptSecret = (payload = "") => {
  const [version, ivValue, tagValue, encryptedValue] = String(payload).split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) return "";
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

const buildTotpSetup = ({ accountName = "account" } = {}) => {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `ColdAir:${accountName}`,
    issuer: "ColdAir",
  });
  return {
    secret: secret.base32,
    provisioningUri: secret.otpauth_url,
  };
};

const verifyTotpCode = ({ secret, code, window = 1 }) => {
  if (!secret || !/^\d{6}$/.test(String(code || "").trim())) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: String(code).trim(),
    window,
  });
};

module.exports = {
  RECOVERY_CODE_COUNT,
  RECOVERY_CODE_LENGTH,
  buildTotpSetup,
  decryptSecret,
  encryptSecret,
  findRecoveryCodeIndex,
  generateOtpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotpCode,
};
