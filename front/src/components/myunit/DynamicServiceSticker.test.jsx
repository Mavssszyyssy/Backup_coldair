import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

it("shows the technician evidence separately from the AI prescription", async () => {
  apiRequest.mockResolvedValue({ recommendation: {
    bestServicedBy: "2026-10-15T00:00:00.000Z",
    recommendedService: "repair",
    predictionSource: "openai",
    latestVisitAnalysis: {
      provider: "openai",
      technicianRecorded: "The control board did not respond during testing.",
      aiAssessment: "The symptom may indicate an electrical or control-system problem and does not confirm board failure.",
      possibleCauses: ["Blown or damaged fuse", "Loose wiring or connector"],
      diagnosticActions: ["Verify incoming voltage.", "Inspect the fuse and wiring."],
      recommendedService: "repair",
      recommendedServiceOrRepair: "Arrange electrical and control-board diagnosis before repair.",
      partsRecommendation: "Test the board and related components before replacement.",
      recommendedFollowUpDate: "2026-10-15T00:00:00.000Z",
      whyThisDate: "The recorded concern should be checked soon.",
    },
  } });

  render(<DynamicServiceSticker unit={{ ampUnitId: "64fa00000000000000000001" }} />);

  expect(await screen.findByText("AI-assisted assessment & prescription")).toBeVisible();
  expect(screen.getByText("1. Technician Findings")).toBeVisible();
  expect(screen.getByText("Assessment page 1 of 4")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next assessment page" }));
  expect(screen.getByText("3. Possible Causes")).toBeVisible();
  expect(screen.getByText("4. Recommended Diagnostic Actions")).toBeVisible();
  expect(screen.getByText(/must confirm the physical diagnosis/i)).toBeVisible();
});
