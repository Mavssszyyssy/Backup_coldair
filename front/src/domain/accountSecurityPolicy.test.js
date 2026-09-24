import { describe, expect, test } from "vitest";
import { requiresTotpEnrollment, roleRequiresTotp } from "./accountSecurityPolicy";

describe("mandatory authenticator policy", () => {
  test.each(["customer", "technician", "admin", "superadmin"])(
    "%s must enroll and retain its own authenticator",
    (role) => {
      expect(roleRequiresTotp(role)).toBe(true);
      expect(requiresTotpEnrollment({ role, security: { totpEnabled: false } })).toBe(true);
      expect(requiresTotpEnrollment({ role, security: { totpEnabled: true } })).toBe(false);
      expect(requiresTotpEnrollment({ role, security: { totpEnabled: true, totpResetRequired: true } })).toBe(true);
    },
  );

  test("unlisted roles are not silently included", () => {
    expect(roleRequiresTotp("manager")).toBe(false);
  });
});
