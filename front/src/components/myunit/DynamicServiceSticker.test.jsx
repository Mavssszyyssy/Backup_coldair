import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import DynamicServiceSticker from "./DynamicServiceSticker";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("organizes the maintenance recommendation into concise, named sections", async () => {
  apiRequest.mockResolvedValue({ recommendation: {
    bestServicedBy: "2027-07-10T00:00:00.000Z",
    recommendedService: "regular_cleaning",
    predictionSource: "system",
    patternAnalysis: { source: "system_default" },
    recommendationBasis: "Insufficient service history. Default recommended cleaning interval: 6 months (180 days).",
    capacityAssessment: { status: "higher_than_necessary" },
  } });

  render(<DynamicServiceSticker unit={{ ampUnitId: "64fa00000000000000000001" }} />);

  expect(await screen.findByText("July 10, 2027")).toBeVisible();
  expect(screen.getByText("6-month starting plan")).toBeVisible();
  expect(screen.getByText("Recommended service")).toBeVisible();
  expect(screen.getByText("Why this date?")).toBeVisible();
  expect(screen.getByText("Room size guidance")).toBeVisible();
  expect(screen.getByText("Book this service using your Cold Air mobile account.")).toBeVisible();
});
