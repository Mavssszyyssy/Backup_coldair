import { describe, expect, it } from "vitest";
import {
  createInitialRegistrationFormData,
  resolveRegistrationResumeState,
} from "./registrationResume";

describe("registration draft recovery", () => {
  it("clears a locally verified draft when its server session is gone", () => {
    const result = resolveRegistrationResumeState({
      saved: {
        stepIndex: 3,
        formData: {
          ...createInitialRegistrationFormData(),
          email: "stale@example.com",
          emailVerified: true,
          registrationVerificationToken: "expired-token",
        },
      },
      serverProgress: null,
      sessionLoaded: true,
    });

    expect(result.discardLocalDraft).toBe(true);
    expect(result.stepIndex).toBe(0);
    expect(result.formData.email).toBe("");
    expect(result.formData.emailVerified).toBe(false);
  });

  it("uses server verification while preserving the local password draft", () => {
    const result = resolveRegistrationResumeState({
      saved: {
        stepIndex: 3,
        formData: {
          ...createInitialRegistrationFormData(),
          email: "verified@example.com",
          password: "LocalOnlyPassword123!",
        },
      },
      serverProgress: {
        stepIndex: 2,
        formData: {
          email: "verified@example.com",
          emailVerified: true,
          firstName: "Server",
        },
      },
      sessionLoaded: true,
    });

    expect(result.discardLocalDraft).toBe(false);
    expect(result.stepIndex).toBe(2);
    expect(result.formData.emailVerified).toBe(true);
    expect(result.formData.firstName).toBe("Server");
    expect(result.formData.password).toBe("LocalOnlyPassword123!");
  });

  it("keeps an encrypted local draft when the server is temporarily offline", () => {
    const result = resolveRegistrationResumeState({
      saved: {
        stepIndex: 1,
        formData: {
          ...createInitialRegistrationFormData(),
          email: "offline@example.com",
        },
      },
      sessionLoaded: false,
    });

    expect(result.discardLocalDraft).toBe(false);
    expect(result.stepIndex).toBe(1);
    expect(result.formData.email).toBe("offline@example.com");
  });
});
