import { expect, test } from "vitest";
import { accountDisplayName, accountInitials } from "./accountDisplayName";

test("saved customer names include the suffix even when legacy name does not", () => {
  const user = { name: "Old Name", name_first: "Patricks", name_last: "Tuparr", suffix: "Jr." };
  expect(accountDisplayName(user)).toBe("Patricks Tuparr Jr.");
  expect(accountInitials(user)).toBe("PT");
  expect(user.name).toBe("Old Name");
});

test.each(["Jr.", "III", "Ph. D."])("legacy full names do not duplicate the saved suffix %s", (suffix) => {
  const user = { name: `Ana Cruz ${suffix}`, suffix };
  expect(accountDisplayName(user)).toBe(`Ana Cruz ${suffix}`);
  expect(accountInitials(user)).toBe("AC");
});

test("empty suffixes and legacy accounts retain their identity fallbacks", () => {
  expect(accountDisplayName({ name_first: " Ana ", name_last: "Cruz", suffix: " " })).toBe("Ana Cruz");
  expect(accountDisplayName({ name: "Legacy User", suffix: "III" })).toBe("Legacy User III");
  expect(accountDisplayName({ email: "fixture@example.com" })).toBe("fixture");
  expect(accountDisplayName(null, "Guest User")).toBe("Guest User");
});
