import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import UnitHistoryPanel from "./UnitHistoryPanel";

const history = {
  unit: { id: "unit1", serialNumber: "CAA-123" },
  maintenanceHistory: Array.from({ length: 4 }, (_, i) => ({ id: String(i), date: `2026-09-0${i + 1}`, findings: `Visit finding ${i}`, actionTaken: `Work ${i}` })),
  ampHistory: [{ date: "2026-08-01", recommendationBasis: "Older assessment" }],
  recommendation: { generatedAt: "2026-09-09", recommendationBasis: "Current evidence", bestServicedBy: "2027-06-09" },
};
test("past-plan pagination moves between distinct contents and collapses repeated snapshots", async () => {
  const same = { bestServicedBy: "2027-06-05", recommendedService: "regular_cleaning", recommendationBasis: "Unchanged saved basis" };
  await render(<UnitHistoryPanel history={{ ...history, ampHistory: [
    { ...same, id: "a", date: "2026-09-08T15:38:00Z" },
    { ...same, id: "b", date: "2026-09-08T15:49:00Z" },
    { ...same, id: "c", date: "2026-09-08T15:59:00Z" },
    { ...same, id: "d", date: "2026-09-09", bestServicedBy: "2027-06-06", recommendationBasis: "New cleaning saved basis" },
  ] }} />);
  expect(screen.queryByLabelText("AC history: Past plans")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Choose history section"));
  await fireEvent.press(screen.getByLabelText("AC history: Past plans"));
  expect(screen.getByText("Page 1 of 2")).toBeTruthy();
  expect(screen.getByText("New cleaning saved basis")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Past recommendation records: Next page"));
  expect(screen.getByText("Page 2 of 2")).toBeTruthy();
  expect(screen.queryByText("New cleaning saved basis")).toBeNull();
  expect(screen.getByText("Unchanged saved basis")).toBeTruthy();
  expect(screen.getByText(/Unchanged across 3 assessments/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Past recommendation records: Previous page"));
  expect(screen.getByText("New cleaning saved basis")).toBeTruthy();
});
test("mobile history uses named sections and one pager, newest visit first, with no wide table", async () => {
  await render(<UnitHistoryPanel history={history} />);
  await fireEvent.press(screen.getByLabelText("Choose history section"));
  await fireEvent.press(screen.getByLabelText("AC history: Maintenance"));
  expect(screen.getByText("Visit finding 3")).toBeTruthy();
  expect(screen.getByText("Page 1 of 4")).toBeTruthy();
  expect(screen.getAllByText("Next")).toHaveLength(1);
  for (const i of [2, 1, 0]) {
    await fireEvent.press(screen.getByLabelText("Maintenance visit records: Next page"));
    expect(screen.getByText(`Visit finding ${i}`)).toBeTruthy();
  }
  expect(screen.getByLabelText("Maintenance visit records: Next page").props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByLabelText("Choose history section"));
  await fireEvent.press(screen.getByLabelText("AC history: Repairs"));
  expect(screen.queryByText("Next")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Choose history section"));
  await fireEvent.press(screen.getByLabelText("AC history: Maintenance"));
  expect(screen.getByText("Page 1 of 4")).toBeTruthy();
});
test("current plan is separate from previous assessment snapshots", async () => {
  await render(<UnitHistoryPanel history={history} />);
  await fireEvent.press(screen.getByLabelText("Choose history section"));
  await fireEvent.press(screen.getByLabelText("AC history: Current plan"));
  expect(screen.getByText("Current evidence")).toBeTruthy();
  expect(screen.queryByText("Older assessment")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Choose history section"));
  await fireEvent.press(screen.getByLabelText("AC history: Past plans"));
  expect(screen.getByText("Older assessment")).toBeTruthy();
  expect(screen.queryByText("Current evidence")).toBeNull();
});
