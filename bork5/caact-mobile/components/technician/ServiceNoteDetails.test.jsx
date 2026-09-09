import React from "react";
import { render, screen } from "@testing-library/react-native";
import ServiceNoteDetails from "./ServiceNoteDetails";
test("note details group missing costs once and preserve saved hours and findings", async () => {
  await render(<ServiceNoteDetails log={{ hoursSpent: 3, findings: "Dust buildup on the filter.", resolution: "Flushed the drain line.", partsUsed: "Nons" }} />);
  expect(screen.getByText("3 hours")).toBeTruthy();
  expect(screen.getByText("Dust buildup on the filter.")).toBeTruthy();
  expect(screen.getByText("Nons")).toBeTruthy();
  expect(screen.getAllByText(/No labor or parts expenses/)).toHaveLength(1);
  expect(screen.queryByText("Labor cost")).toBeNull();
});
test("note expenses render actual amounts including confirmed zero, never task totals", async () => {
  await render(<ServiceNoteDetails log={{ laborCost: 250, partsCost: 0 }} />);
  expect(screen.getByText("Labor")).toBeTruthy();
  expect(screen.getByText("Parts")).toBeTruthy();
  expect(screen.getAllByText(/250/)).toHaveLength(2);
  expect(screen.queryByText(/No labor or parts expenses/)).toBeNull();
});
