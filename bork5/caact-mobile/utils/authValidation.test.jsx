import { validatePersonName } from "./authValidation";

describe("person name validation", () => {
  it("accepts valid names up to the 30-character limit", () => {
    expect(validatePersonName("Anne-Marie", "First name")).toBe("");
    expect(validatePersonName("Alexandra".repeat(4).slice(0, 30), "Last name")).toBe("");
  });

  it("rejects names beyond the limit and repeated-character stuffing", () => {
    expect(validatePersonName("Alexandra".repeat(4).slice(0, 31), "First name")).toMatch(/30 characters/);
    expect(validatePersonName("Patrickjhhhhjhhhhhgggsa", "First name")).toMatch(/repeated characters/);
  });

  it("retains the full recipient-name allowance", () => {
    expect(validatePersonName("Alexandra".repeat(7).slice(0, 60), "Recipient name", { maxLength: 60 })).toBe("");
  });
});
