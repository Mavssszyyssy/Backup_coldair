import { expect, test } from "vitest";
import { validatePersonName } from "./validateRegistrationProfile";

test("web name validation matches accepted person-name rules", () => {
  expect(validatePersonName("Dela Cruz", "Last name")).toBe("");
  expect(validatePersonName("O'Neill", "Last name")).toBe("");
  expect(validatePersonName("María", "First name")).toBe("");
  expect(validatePersonName("hhhhhhhhhhhhhhhhhhhh", "First name")).toMatch(/repeated/i);
  expect(validatePersonName("x".repeat(61), "First name")).toMatch(/2–60/i);
});
