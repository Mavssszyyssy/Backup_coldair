const crypto = require("crypto");
const env = require("../config/env");

const hashPasswordResetToken = (token = "") =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const generatePasswordResetToken = () => {
  const nonce = crypto.randomBytes(24).toString("hex");
  const createdAt = Date.now().toString();
  const payload = `${nonce}.${createdAt}`;
  const signature = crypto
    .createHmac("sha256", env.passwordResetTokenSecret)
    .update(payload)
    .digest("hex");
  const token = `${payload}.${signature}`;
  return { token, tokenHash: hashPasswordResetToken(token) };
};

const isAuthenticPasswordResetToken = (token = "") => {
  const [nonce, createdAt, signature, ...extra] = String(token).split(".");
  if (extra.length || !/^[a-f0-9]{48}$/i.test(nonce || "") || !/^\d{13}$/.test(createdAt || "") || !/^[a-f0-9]{64}$/i.test(signature || "")) return false;
  const expected = crypto
    .createHmac("sha256", env.passwordResetTokenSecret)
    .update(`${nonce}.${createdAt}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
};

module.exports = {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isAuthenticPasswordResetToken,
};
