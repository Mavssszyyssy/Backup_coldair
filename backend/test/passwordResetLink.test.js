const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const env = require("../src/config/env");
const User = require("../src/models/User");
const { generatePasswordResetToken, hashPasswordResetToken, isAuthenticPasswordResetToken } = require("../src/domain/passwordResetLink");
const { resetPassword } = require("../src/controllers/authController");

const response = () => {
  const result = { statusCode: 200, body: null };
  result.status = (statusCode) => { result.statusCode = statusCode; return result; };
  result.json = (body) => { result.body = body; return result; };
  return result;
};

test("account-settings reset links are signed and stored only as hashes", () => {
  const { token, tokenHash } = generatePasswordResetToken();
  assert.equal(isAuthenticPasswordResetToken(token), true);
  assert.equal(hashPasswordResetToken(token), tokenHash);
  assert.notEqual(tokenHash, token);
});

test("tampered or malformed account-settings reset links are rejected", () => {
  const { token } = generatePasswordResetToken();
  assert.equal(isAuthenticPasswordResetToken(`${token}x`), false);
  assert.equal(isAuthenticPasswordResetToken("not-a-reset-link"), false);
});

test("a valid account-settings link is single-use and invalidates prior sessions", async (t) => {
  const { token, tokenHash } = generatePasswordResetToken();
  const user = {
    passwordReset: { tokenHash, expiresAt: new Date(Date.now() + 60_000), usedAt: null, requestedAt: new Date() },
    security: { sessionVersion: 4 },
    save: async () => {},
  };
  t.mock.method(User, "findOne", async (query) => query["passwordReset.tokenHash"] === user.passwordReset.tokenHash && query["passwordReset.usedAt"] === null ? user : null);
  const first = response();
  await resetPassword({ params: { token }, body: { password: "StrongPass1!" } }, first);
  assert.equal(first.statusCode, 200);
  assert.equal(user.passwordReset.tokenHash, "");
  assert.equal(user.passwordReset.usedAt instanceof Date, true);
  assert.equal(user.security.sessionVersion, 5);
  const replay = response();
  await resetPassword({ params: { token }, body: { password: "OtherPass1!" } }, replay);
  assert.equal(replay.statusCode, 400);
  assert.match(replay.body.message, /expired|already been used/i);
});

test("a normal signed-in access token cannot be used as a password-reset link", async () => {
  const accessToken = jwt.sign({ sub: "user-1", role: "customer", securityVersion: 0 }, env.jwtSecret);
  const result = response();
  await resetPassword({ params: { token: accessToken }, body: { password: "StrongPass1!" } }, result);
  assert.equal(result.statusCode, 400);
  assert.match(result.body.message, /invalid|expired|used/i);
});
