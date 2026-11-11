import { validateAccountSuffix, validatePersonName } from "./authValidation";

describe("person name validation", () => {
  it("accepts valid names up to the 30-character limit", () => {
    expect(validatePersonName("Anne-Marie", "First name")).toBe("");
    expect(validatePersonName("Alexandra".repeat(4).slice(0, 30), "Last name")).toBe("");
  });

  it("rejects names beyond the limit and repeated-character stuffing", () => {
    expect(validatePersonName("Alexandra".repeat(4).slice(0, 31), "First name")).toMatch(/30 characters/);
    expect(validatePersonName("Patrickjhhhhjhhhhhgggsa", "First name")).toMatch(/repeated characters/);
    expect(validatePersonName("Test Test Test", "First name")).toMatch(/repeated words/);
    expect(validatePersonName("Limit Testing Limit Testing", "First name")).toMatch(/repeated words/);
  });

  it("retains the full recipient-name allowance", () => {
    expect(validatePersonName("Alexandra".repeat(7).slice(0, 60), "Recipient name", { maxLength: 60 })).toBe("");
  });
});

describe("account suffix validation", () => {
  it("accepts conventional suffixes and rejects oversized or repeated input", () => {
    expect(validateAccountSuffix("Jr.")).toBe("");
    expect(validateAccountSuffix("III")).toBe("");
    expect(validateAccountSuffix("A".repeat(13))).toMatch(/12/);
    expect(validateAccountSuffix("aaaaa")).not.toBe("");
  });
});
