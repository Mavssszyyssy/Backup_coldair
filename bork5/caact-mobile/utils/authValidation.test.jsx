import { validateAccountSuffix, validatePersonName } from "./authValidation";

describe("person name validation", () => {
  it("accepts valid names up to the 20-character limit", () => {
    expect(validatePersonName("Anne-Marie", "First name")).toBe("");
    expect(validatePersonName("Alexandra-Maria-Lynn", "First name")).toBe("");
    expect(validatePersonName("Alexandra-Maria-Lynn", "Last name")).toBe("");
  });

  it("rejects names beyond the limit and repeated-character stuffing", () => {
    expect(validatePersonName("Alexandra-Maria-Lynne", "First name")).toMatch(/20 characters/);
    expect(validatePersonName("Alexandra-Maria-Lynne", "Last name")).toMatch(/20 characters/);
    expect(validatePersonName("Patrickjhhhhhsa", "First name")).toMatch(/repeated characters/);
    expect(validatePersonName("Test Test Test", "First name")).toMatch(/repeated words/);
    expect(validatePersonName("Test Name Test Name", "First name")).toMatch(/repeated words/);
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
