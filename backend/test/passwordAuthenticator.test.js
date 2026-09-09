const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const User = require('../src/models/User');
const OtpRequest = require('../src/models/OtpRequest');
const auth = require('../src/controllers/authController');
const { changePassword } = require('../src/controllers/userController');
const { encryptSecret, buildTotpSetup } = require('../src/domain/accountSecurity');
const { generatePasswordResetToken } = require('../src/domain/passwordResetLink');

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const hidden = ['totpSecretEncrypted', 'totpPendingSecretEncrypted', 'recoveryCodeHashes'];

// Use real Mongoose hydration/change tracking with the same default projection
// as production. Plain-object mocks cannot detect replacement of hidden fields.
async function account(t, role) {
  const secret = buildTotpSetup({ accountName: 'regression-test' }).secret;
  const reset = generatePasswordResetToken();
  const stored = new User({ name: 'Regression Test', role, email: 'regression@example.com', alias: 'regression',
    passwordHash: await bcrypt.hash('PreviousPass1!', 4), isFirstLogin: false,
    passwordReset: { tokenHash: reset.tokenHash, expiresAt: new Date(Date.now() + 60_000), usedAt: null },
    security: { totpEnabled: true, totpSecretEncrypted: encryptSecret(secret), totpPendingSecretEncrypted: encryptSecret('pending-test'),
      recoveryCodeHashes: ['saved-recovery-hash'], recoveryCodesRemaining: 1, sessionVersion: 4 },
  }).toObject();
  stored._id = String(stored._id);
  const originalSecurity = structuredClone(stored.security);
  const hydrate = (includeSecret = false) => {
    const data = structuredClone(stored);
    const projection = {};
    for (const key of hidden) {
      if (includeSecret && key === 'totpSecretEncrypted') continue;
      delete data.security[key]; projection[`security.${key}`] = 0;
    }
    const user = User.hydrate(data, projection);
    user.save = async () => {
      const changes = user.$getChanges();
      for (const [path, value] of Object.entries(changes.$set || {})) {
        const segments = path.split('.');
        let target = stored;
        while (segments.length > 1) { const key = segments.shift(); target = target[key] ||= {}; }
        target[segments[0]] = structuredClone(value);
      }
      return user;
    };
    return user;
  };
  t.mock.method(User, 'findOne', async () => hydrate());
  t.mock.method(User, 'findById', () => ({ select: async () => hydrate(true) }));
  return { stored, originalSecurity, secret, reset, hydrate };
}

for (const role of ['customer', 'admin', 'superadmin']) {
  for (const route of ['email link', 'email code', 'signed-in change']) {
    test(`${role}: ${route} preserves authenticator and recovery secrets and accepts a fresh TOTP after password change`, async t => {
      const state = await account(t, role);
      const res = response();
      if (route === 'email link') {
        await auth.resetPassword({ params: { token: state.reset.token }, body: { password: 'UpdatedPass2!' } }, res);
      } else if (route === 'email code') {
        t.mock.method(OtpRequest, 'findOne', () => ({ sort: async () => ({
          codeHash: crypto.createHash('sha256').update('123456').digest('hex'),
          expiresAt: new Date(Date.now() + 60_000), save: async () => {},
        }) }));
        await auth.resetPasswordWithCode({ body: { identifier: 'regression@example.com', code: '123456', newPassword: 'UpdatedPass2!' } }, res);
      } else {
        await changePassword({ authUser: state.hydrate(), body: { currentPassword: 'PreviousPass1!', newPassword: 'UpdatedPass2!' } }, res);
      }
      assert.equal(res.statusCode, 200);
      for (const key of hidden) assert.deepEqual(state.stored.security[key], state.originalSecurity[key], `${key} must survive password updates`);
      assert.equal(state.stored.security.sessionVersion, route === 'signed-in change' ? 4 : 5);
      const oldLogin = response();
      await auth.login({ body: { identifier: 'regression', password: 'PreviousPass1!' } }, oldLogin);
      assert.equal(oldLogin.statusCode, 401);
      const login = response();
      await auth.login({ body: { identifier: 'regression', password: 'UpdatedPass2!' } }, login);
      assert.equal(login.body.requiresTotp, true);
      const verification = response();
      await auth.verifyLoginTotp({ body: { challengeToken: login.body.challengeToken, code: speakeasy.totp({ secret: state.secret, encoding: 'base32' }) } }, verification);
      assert.equal(verification.statusCode, 200);
      assert.equal(verification.body.success, true);
      assert.equal(verification.body.user.security.totpSecretEncrypted, undefined);
    });
  }
}

test('missing authenticator key remains blocked without incorrectly blaming the code or locking the account', async t => {
  const state = await account(t, 'customer');
  delete state.stored.security.totpSecretEncrypted;
  const login = response();
  await auth.login({ body: { identifier: 'regression', password: 'PreviousPass1!' } }, login);
  const attempts = state.stored.failedLoginAttempts;
  const res = response();
  await auth.verifyLoginTotp({ body: { challengeToken: login.body.challengeToken, code: '123456' } }, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /needs recovery/);
  assert.equal(res.body.token, undefined);
  assert.equal(state.stored.failedLoginAttempts, attempts);
  assert.equal(state.stored.security.totpEnabled, true);
});

test('an incorrect authenticator code is still rejected after a password reset', async t => {
  const state = await account(t, 'customer');
  await auth.resetPassword({ params: { token: state.reset.token }, body: { password: 'UpdatedPass2!' } }, response());
  const login = response();
  await auth.login({ body: { identifier: 'regression', password: 'UpdatedPass2!' } }, login);
  const res = response();
  await auth.verifyLoginTotp({ body: { challengeToken: login.body.challengeToken, code: 'invalid' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.token, undefined);
  assert.equal(state.stored.failedLoginAttempts, 1);
  assert.equal(state.stored.security.totpSecretEncrypted, state.originalSecurity.totpSecretEncrypted);
});
