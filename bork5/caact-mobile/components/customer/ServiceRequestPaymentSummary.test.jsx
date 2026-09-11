import React from "react";
import { render, screen } from "@testing-library/react-native";

import ServiceRequestPaymentSummary from "./ServiceRequestPaymentSummary";

describe("ServiceRequestPaymentSummary", () => {
  it("shows the saved Admin quote instead of the catalog estimate", async () => {
    await render(
      <ServiceRequestPaymentSummary
        service={{ pricing: { basePrice: 800 } }}
        payment={{ amount: 950, status: "due" }}
      />,
    );

    expect(screen.getByText("Final Admin quote")).toBeTruthy();
    expect(screen.getAllByText("₱950.00")).toHaveLength(2);
    expect(screen.getByText("due")).toBeTruthy();
  });

  it("does not present a missing quote as a zero-value payment", async () => {
    await render(<ServiceRequestPaymentSummary service={{ pricing: { basePrice: null } }} />);

    expect(screen.getAllByText("Awaiting Admin quote")).toHaveLength(2);
    expect(screen.queryByText("₱0.00")).toBeNull();
  });
});
