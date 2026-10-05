import React from "react";
import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import TrackOrderModal from "./TrackOrderModal";

const completedOrder = {
  id: "order-1",
  orderCode: "ORD-1",
  workflowStatus: "complete",
  paymentMethod: "cod",
  address: {
    name: "Customer",
    street: "Test Street",
    city: "Bacoor",
    postalCode: "4102",
    phone: "09123456789",
  },
  tracking: {
    currentStage: "completed",
    timeline: [
      { stage: "placed", label: "Order Placed", timestamp: "2026-10-04T09:33:09Z", detail: "Order submitted" },
      { stage: "completed", label: "Completed", timestamp: "2026-10-04T09:45:33Z", detail: "Installation completed" },
    ],
  },
};

test("renders the terminal Completed milestone as successful instead of in progress", () => {
  render(<TrackOrderModal order={completedOrder} onClose={vi.fn()} />);

  const completedRow = screen.getByText("Completed").closest('[data-tracking-stage="completed"]');
  expect(completedRow).toHaveAttribute("data-tracking-status", "completed");
  expect(within(completedRow).getByText("✓")).toBeInTheDocument();
  expect(within(completedRow).queryByText("●")).not.toBeInTheDocument();
});

test("keeps an active non-terminal milestone styled as in progress", () => {
  render(<TrackOrderModal order={{
    ...completedOrder,
    workflowStatus: "to_deliver",
    tracking: {
      currentStage: "preparing",
      timeline: [{ stage: "preparing", label: "Preparing", timestamp: "2026-10-04T09:33:40Z" }],
    },
  }} onClose={vi.fn()} />);

  const preparingRow = screen.getByText("Preparing").closest('[data-tracking-stage="preparing"]');
  expect(preparingRow).toHaveAttribute("data-tracking-status", "processing");
  expect(within(preparingRow).getByText("●")).toBeInTheDocument();
});
