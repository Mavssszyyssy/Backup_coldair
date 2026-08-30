const test = require("node:test");
const assert = require("node:assert/strict");

const env = require("../src/config/env");
const {
  canSendEmail,
  getResendEmailConfiguration,
  sendEmailViaResend,
} = require("../src/utils/email");

const originalFetch = global.fetch;
const originalSettings = {
  resendApiKey: env.resendApiKey,
  resendFromEmail: env.resendFromEmail,
  smtpHost: env.smtpHost,
  smtpUser: env.smtpUser,
  smtpPass: env.smtpPass,
  smtpFrom: env.smtpFrom,
};

test.afterEach(() => {
  global.fetch = originalFetch;
  Object.assign(env, originalSettings);
});

test("Resend configuration enables transactional email", () => {
  Object.assign(env, {
    resendApiKey: "re_test_key",
    resendFromEmail: "AeroPulse <no-reply@example.com>",
    smtpHost: "",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
  });

  assert.equal(canSendEmail(), true);
  assert.deepEqual(getResendEmailConfiguration(), {
    apiKey: true,
    sender: true,
  });
});

test("Resend receives the expected transactional email request", async () => {
  env.resendApiKey = "re_test_key";
  env.resendFromEmail = "AeroPulse <no-reply@example.com>";

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "email_123" }),
    };
  };

  const result = await sendEmailViaResend({
    to: "customer@example.com",
    subject: "Your AeroPulse verification code",
    text: "Your code is 123456.",
    html: "<p>Your code is <strong>123456</strong>.</p>",
  });

  assert.deepEqual(result, { id: "email_123" });
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer re_test_key");
  assert.deepEqual(JSON.parse(request.options.body), {
    from: "AeroPulse <no-reply@example.com>",
    to: ["customer@example.com"],
    subject: "Your AeroPulse verification code",
    text: "Your code is 123456.",
    html: "<p>Your code is <strong>123456</strong>.</p>",
  });
});

test("Resend provider errors are surfaced without exposing the API key", async () => {
  env.resendApiKey = "re_private_key";
  env.resendFromEmail = "AeroPulse <no-reply@example.com>";
  global.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ message: "The sender domain is not verified." }),
  });

  await assert.rejects(
    () =>
      sendEmailViaResend({
        to: "customer@example.com",
        subject: "Test",
        text: "Test",
      }),
    (error) => {
      assert.match(error.message, /sender domain is not verified/i);
      assert.doesNotMatch(error.message, /re_private_key/);
      return true;
    },
  );
});
