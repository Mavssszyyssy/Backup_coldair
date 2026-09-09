import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import UnitHistoryPanel from "./UnitHistoryPanel";

const history = {
  unit: { id: "unit1", serialNumber: "CAA-123" },
  maintenanceHistory: Array.from({ length: 4 }, (_, i) => ({ id: String(i), date: `2026-09-0${i + 1}`, findings: `Visit finding ${i}`, actionTaken: `Work ${i}` })),
  ampHistory: [{ date: "2026-08-01", recommendationBasis: "Older assessment" }],
  recommendation: { generatedAt: "2026-09-09", recommendationBasis: "Current evidence", bestServicedBy: "2027-06-09" },
};
test("mobile history uses named sections and one pager, newest visit first, with no wide table", async () => {
  await render(<UnitHistoryPanel history={history} />);
  await fireEvent.press(screen.getByLabelText("AC history: Maintenance"));
  expect(screen.getByText("Visit finding 3")).toBeTruthy();
  expect(screen.getByText("Page 1 of 4")).toBeTruthy();
  expect(screen.getAllByText("Next")).toHaveLength(1);
  for (const i of [2, 1, 0]) {
    await fireEvent.press(screen.getByLabelText("Maintenance visit records: Next page"));
    expect(screen.getByText(`Visit finding ${i}`)).toBeTruthy();
  }
  expect(screen.getByLabelText("Maintenance visit records: Next page").props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByLabelText("AC history: Repairs"));
  expect(screen.queryByText("Next")).toBeNull();
  await fireEvent.press(screen.getByLabelText("AC history: Maintenance"));
  expect(screen.getByText("Page 1 of 4")).toBeTruthy();
});
test("current plan is separate from previous assessment snapshots", async () => {
  await render(<UnitHistoryPanel history={history} />);
  await fireEvent.press(screen.getByLabelText("AC history: Current plan"));
  expect(screen.getByText("Current evidence")).toBeTruthy();
  expect(screen.queryByText("Older assessment")).toBeNull();
  await fireEvent.press(screen.getByLabelText("AC history: Past plans"));
  expect(screen.getByText("Older assessment")).toBeTruthy();
  expect(screen.queryByText("Current evidence")).toBeNull();
});
