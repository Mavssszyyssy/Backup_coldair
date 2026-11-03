import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import AmpDecisionPanel from "./AmpDecisionPanel";

const { language } = vi.hoisted(() => ({ language: { value: "English" } }));
vi.mock("../../context/UserContext", () => ({ useUser: () => ({ currentLanguage: language.value }) }));
vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../ADMIN/Maintenance/MaintenanceDecisionSupport", () => ({
  default: ({ request, task }) => <p>Request {request?.id || "none"}; visit {task?.id || "none"}</p>,
}));

beforeEach(() => { vi.clearAllMocks(); language.value = "English"; });

it("loads only the selected unit's assessments when expanded", async () => {
  apiRequest.mockResolvedValue({ request: { id: "request-1" }, lastVisit: { taskId: "task-1" } });
  render(<AmpDecisionPanel unitId="unit-1" />);
  expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("AI parts and future-issue assessment"));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/units/unit-1/decision-support"));
  expect(await screen.findByText("Request request-1; visit task-1")).toBeVisible();
});

it("translates AMP controls and empty state without translating stored assessments", async () => {
  language.value = "Filipino";
  apiRequest.mockResolvedValue({ request: null, lastVisit: null });
  render(<AmpDecisionPanel unitId="unit-2" />);
  fireEvent.click(screen.getByText("Pagsusuri ng AI sa mga piyesa at posibleng susunod na problema"));
  expect(await screen.findByText("Walang bukas na kahilingan sa maintenance o nakaugnay na natapos na pagbisita para sa AC na ito.")).toBeVisible();
});
