import { describe, expect, it } from "vitest";
import { LEGAL_POLICIES, LEGAL_POLICY_LIST } from "./legalPolicies";

describe("public legal policies", () => {
  it("provides a separate public route for every required policy", () => {
    expect(LEGAL_POLICY_LIST.map((policy) => policy.path)).toEqual([
      "/terms/warranty",
      "/terms/service",
      "/terms/app",
      "/privacy",
    ]);
    expect(new Set(LEGAL_POLICY_LIST.map((policy) => policy.path)).size).toBe(4);
  });

  it("keeps every document structured and navigable", () => {
    LEGAL_POLICY_LIST.forEach((policy) => {
      expect(policy.title).toBeTruthy();
      expect(policy.summary.length).toBeGreaterThan(60);
      expect(policy.sections.length).toBeGreaterThanOrEqual(8);
      expect(new Set(policy.sections.map((section) => section.id)).size).toBe(
        policy.sections.length,
      );
    });
  });

  it("matches the actual service, warranty, privacy, and AMP workflows", () => {
    expect(JSON.stringify(LEGAL_POLICIES.service)).toMatch(/mobile app/i);
    expect(JSON.stringify(LEGAL_POLICIES.warranty)).toMatch(/pending activation/i);
    expect(JSON.stringify(LEGAL_POLICIES.privacy)).toMatch(/Republic Act No\. 10173/i);
    expect(JSON.stringify(LEGAL_POLICIES.app)).toMatch(/AI-assisted/i);
  });
});

