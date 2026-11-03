import { expect, test } from "vitest";
import { ampDueLabel } from "./ampDueLabel";

test("AMP due labels use the correct singular and calendar-day wording", () => {
  expect(ampDueLabel(null)).toBe("Date needs review");
  expect(ampDueLabel(-2)).toBe("Overdue by 2 days");
  expect(ampDueLabel(-1)).toBe("Overdue by 1 day");
  expect(ampDueLabel(0)).toBe("Due today");
  expect(ampDueLabel(1)).toBe("Due tomorrow");
  expect(ampDueLabel(2)).toBe("Due in 2 days");
});
