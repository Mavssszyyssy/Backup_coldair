import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CustomerRecommendationPanel } from "../components/customer/CustomerMaintenancePanels";

test("unit overview gives one recommendation with its basis, urgency and booking guidance", async () => {
  await render(<CustomerRecommendationPanel
    recommendation={{ bestServicedBy: "2027-06-03", recommendedService: "regular_cleaning", recommendationBasis: "Provisional 270-day schedule.", capacityAssessment: { status: "suitable" } }}
    maintenance={{ recommendedService: "regular_cleaning", urgency: "Suggested", color: "#0088CC" }}
  />);
  expect(screen.getAllByText("Regular cleaning")).toHaveLength(1);
  expect(screen.getAllByText("Regular cleaning applies when the unit was last cleaned within one year.")).toHaveLength(1);
  expect(screen.getByText("Suggested")).toBeTruthy();
  expect(screen.getByText("Provisional 270-day schedule.")).toBeTruthy();
  expect(screen.getByText("This is a suggestion. A visit is only booked after you submit a service request.")).toBeTruthy();
  expect(screen.getByText(/appears suitable based on an approximate/)).toBeTruthy();
});

test("missing service evidence does not explain an unknown method as regular cleaning", async () => {
  await render(<CustomerRecommendationPanel recommendation={{ recommendedService: "", bestServicedBy: null }} />);
  expect(screen.getByText("Service details needed")).toBeTruthy();
  expect(screen.getByText("Installation or cleaning date needed")).toBeTruthy();
  expect(screen.queryByText(/Regular cleaning applies/)).toBeNull();
});
