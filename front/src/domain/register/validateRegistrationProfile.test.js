import { expect, test } from "vitest";
import { validatePersonName } from "../personNameValidation";

test("web name validation matches accepted person-name rules", () => {
  expect(validatePersonName("Dela Cruz", "Last name")).toBe("");
  expect(validatePersonName("O'Neill", "Last name")).toBe("");
  expect(validatePersonName("María", "First name")).toBe("");
  expect(validatePersonName("hhhhhhhhhhhhhhhhhhhh", "First name")).toMatch(/repeated/i);
  expect(validatePersonName("Patrickjhhhhhsa", "First name")).toMatch(/repeated/i);
  for (const label of ["First name", "Last name"]) {
    expect(validatePersonName("Alexandra-Maria-Lynne", label)).toMatch(/2–20/i);
    expect(validatePersonName("Alexandra-Maria-Lynn", label)).toBe("");
  }
  expect(validatePersonName("Test Test Test", "First name")).toMatch(/repeated words/);
  expect(validatePersonName("Test Name Test Name", "First name")).toMatch(/repeated words/);
});
