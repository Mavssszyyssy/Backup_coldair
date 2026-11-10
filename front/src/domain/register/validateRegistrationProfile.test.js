import { expect, test } from "vitest";
import { validatePersonName } from "./validateRegistrationProfile";

test("web name validation matches accepted person-name rules", () => {
  expect(validatePersonName("Dela Cruz", "Last name")).toBe("");
  expect(validatePersonName("O'Neill", "Last name")).toBe("");
  expect(validatePersonName("María", "First name")).toBe("");
  expect(validatePersonName("hhhhhhhhhhhhhhhhhhhh", "First name")).toMatch(/repeated/i);
  expect(validatePersonName("Patrickjhhhhjhhhhhgggsa", "First name")).toMatch(/repeated/i);
  expect(validatePersonName("Alexandra".repeat(4).slice(0, 31), "First name")).toMatch(/2–30/i);
  expect(validatePersonName("Alexandra".repeat(4).slice(0, 30), "First name")).toBe("");
});
