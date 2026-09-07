const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const { login } = require('../src/controllers/authController');
const { changePassword } = require('../src/controllers/userController');
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('technician first password change completes setup and the new password works without TOTP', async (t) => {
  const user = new User({ name_first: 'Test', name_last: 'Technician', role: 'technician', username: 'tech.cavite.test', isFirstLogin: true, security: { totpEnabled: true, totpResetRequired: true } });
  user.passwordHash = await bcrypt.hash('cavite.test', 4);
  t.mock.method(user, 'save', async () => user);
  const res = response();
  await changePassword({ authUser: user, body: { newPassword: 'NewPass123!' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.isFirstLogin, false);
  assert.ok(user.technicianOnboardedAt);
  t.mock.method(User, 'findOne', async () => user);
  const signedIn = response();
  await login({ body: { identifier: user.username, password: 'NewPass123!' } }, signedIn);
  assert.equal(signedIn.body.requiresTotp, undefined);
  assert.ok(signedIn.body.token);
  assert.equal(jwt.verify(signedIn.body.token, env.jwtSecret).recovery, undefined);
  const oldPassword = response();
  await login({ body: { identifier: user.username, password: 'cavite.test' } }, oldPassword);
  assert.equal(oldPassword.statusCode, 401);
});

test('technician profile password change requires current password and persists a valid replacement', async (t) => {
  const user = new User({ name_first: 'Test', name_last: 'Technician', role: 'technician', isFirstLogin: false });
  user.passwordHash = await bcrypt.hash('OldPass123!', 4);
  t.mock.method(user, 'save', async () => user);
  const missing = response();
  await changePassword({ authUser: user, body: { newPassword: 'NewPass123!' } }, missing);
  assert.equal(missing.statusCode, 400);
  const wrong = response();
  await changePassword({ authUser: user, body: { currentPassword: 'wrong', newPassword: 'NewPass123!' } }, wrong);
  assert.equal(wrong.statusCode, 400);
  const valid = response();
  await changePassword({ authUser: user, body: { currentPassword: 'OldPass123!', newPassword: 'NewPass123!' } }, valid);
  assert.equal(valid.statusCode, 200);
  assert.ok(await bcrypt.compare('NewPass123!', user.passwordHash));
});

test('customers, admins, and superadmins still require enabled authenticators at sign-in', async (t) => {
  for (const role of ['customer', 'admin', 'superadmin']) {
    const user = new User({ name_first: 'Test', name_last: 'User', role, security: { totpEnabled: true } });
    user.passwordHash = await bcrypt.hash('ValidPass123!', 4);
    t.mock.method(User, 'findOne', async () => user);
    const res = response();
    await login({ body: { identifier: 'test', password: 'ValidPass123!' } }, res);
    assert.equal(res.body.requiresTotp, true);
    assert.equal(res.body.token, undefined);
  }
});
