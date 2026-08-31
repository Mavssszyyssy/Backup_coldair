const test = require("node:test");
const assert = require("node:assert/strict");
const {
  mergeClientRegistrationProgress,
} = require("../src/domain/registrationProgress");

test("registration drafts cannot verify themselves or store passwords", () => {
  const result = mergeClientRegistrationProgress({
    incoming: {
      email: "attacker@example.com",
      stepIndex: 4,
      formData: {
        email: "attacker@example.com",
        emailVerified: true,
        phoneVerified: true,
        registrationVerificationToken: "forged-token",
        password: "NotForTheSession123!",
        confirmPassword: "NotForTheSession123!",
      },
    },
  });

  assert.equal(result.formData.emailVerified, false);
  assert.equal(result.formData.phoneVerified, false);
  assert.equal("registrationVerificationToken" in result.formData, false);
  assert.equal("password" in result.formData, false);
  assert.equal("confirmPassword" in result.formData, false);
  assert.equal(result.stepIndex, 3);
});

test("a verified contact cannot be replaced by a later client draft", () => {
  const result = mergeClientRegistrationProgress({
    existing: {
      email: "verified@example.com",
      formData: {
        email: "verified@example.com",
        emailVerified: true,
        phone: "09123456789",
        phoneVerified: true,
      },
    },
    incoming: {
      email: "replacement@example.com",
      stepIndex: 2,
      formData: {
        email: "replacement@example.com",
        phone: "09999999999",
        firstName: "Updated",
      },
    },
  });

  assert.equal(result.email, "verified@example.com");
  assert.equal(result.formData.email, "verified@example.com");
  assert.equal(result.formData.phone, "09123456789");
  assert.equal(result.formData.emailVerified, true);
  assert.equal(result.formData.phoneVerified, true);
  assert.equal(result.formData.firstName, "Updated");
});
