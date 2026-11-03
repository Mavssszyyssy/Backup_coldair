import { addCalendarDays, getManilaDateKey, getServiceBookingMaxDateKey, serviceBookingDateError } from "./serviceBookingDate";

test("service booking includes today and day 90, but excludes day 91 and past dates", () => {
  const now = new Date("2026-10-26T04:00:00.000Z");
  expect(getManilaDateKey(now)).toBe("2026-10-26");
  expect(getServiceBookingMaxDateKey(now)).toBe("2027-01-24");
  expect(serviceBookingDateError("2026-10-26", now)).toBe("");
  expect(serviceBookingDateError("2027-01-24", now)).toBe("");
  expect(serviceBookingDateError("2027-01-25", now)).toMatch(/90 calendar days/);
  expect(serviceBookingDateError("2026-10-25", now)).toMatch(/future date/);
  expect(serviceBookingDateError("2026-02-30", now)).toMatch(/valid appointment/);
});

test("booking range advances at Manila midnight", () => {
  const before = new Date("2026-10-26T15:59:59.000Z");
  const after = new Date("2026-10-26T16:00:00.000Z");
  expect(getManilaDateKey(after)).toBe(addCalendarDays(getManilaDateKey(before), 1));
  expect(getServiceBookingMaxDateKey(after)).toBe(addCalendarDays(getServiceBookingMaxDateKey(before), 1));
  expect(serviceBookingDateError("2026-10-26", after)).toMatch(/future date/);
});
