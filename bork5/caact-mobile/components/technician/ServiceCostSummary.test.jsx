import React from "react";
import { render, screen } from "@testing-library/react-native";
import ServiceCostSummary from "./ServiceCostSummary";

test("missing expenses have one explanation and do not copy the maintenance fee", async () => {
  await render(<ServiceCostSummary task={{ laborCost: null, partsCost: null, servicePayment: { amount: 800, status: "paid" } }} />);
  expect(screen.getByText(/800.*Collected/)).toBeTruthy();
  expect(screen.getAllByText(/No labor or parts expenses were entered/)).toHaveLength(1);
  expect(screen.queryByText("Labor")).toBeNull();
  expect(screen.queryByText("Recorded subtotal")).toBeNull();
});

test("fresh amounts replace the empty state, preserve zero and total only recorded costs", async () => {
  await render(<ServiceCostSummary task={{}} />);
  await screen.rerender(<ServiceCostSummary task={{ laborCost: 125, partsCost: 0 }} />);
  expect(screen.queryByText(/No labor or parts expenses/)).toBeNull();
  expect(screen.getByText("Labor")).toBeTruthy();
  expect(screen.getByText("Parts")).toBeTruthy();
  expect(screen.getByText("Recorded subtotal")).toBeTruthy();
  expect(screen.getAllByText(/125/)).toHaveLength(2);
});
