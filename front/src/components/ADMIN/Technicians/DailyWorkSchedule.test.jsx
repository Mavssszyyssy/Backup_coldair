import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import DailyWorkSchedule from "./DailyWorkSchedule";
import { apiRequest } from "../../../config/api";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});
vi.mock("../../../context/UserContext", () => ({ useUser: () => ({ user: { role: "admin", assignedBranch: "Cavite" } }) }));
vi.mock("../../../config/api", () => ({ apiRequest: vi.fn() }));

const task = {
  id: "task-1", taskCode: "TSK-1", title: "Fulfill ORD-1", customerName: "Customer One",
  customerPhone: "09123456789", address: "Bacoor, Cavite", branch: "Cavite", scheduledDate: "2026-09-16",
  timeSlot: "9:00 AM - 12:00 PM", assignedTechnicianId: "tech-1", assignedTechnicianName: "Tech One",
  status: "in-progress", schedule: { driverName: "Driver One", teamMemberIds: [], teamMemberNames: [], notes: "Bring ladder" },
  scheduleDetails: { reference: "ORD-1", category: "installation", workDescription: "Split AC", paymentMethod: "GCash", paymentStatus: "paid", otherExpenses: null, sellerPersonnel: "" },
};

beforeEach(() => {
  apiRequest.mockReset().mockImplementation(async (path, options) => {
    if (options?.method === "PATCH") return { task: { ...task, schedule: JSON.parse(options.body).schedule } };
    if (path.startsWith("/users")) return { users: [
      { id: "tech-1", name: "Tech One", assignedBranch: "Cavite", accountStatus: "active" },
      { id: "tech-2", name: "Tech Two", assignedBranch: "Cavite", accountStatus: "active" },
    ] };
    return { tasks: [task] };
  });
});

test("shows linked operational data and saves schedule changes on the existing task", async () => {
  render(<DailyWorkSchedule />);
  expect(await screen.findByText("ORD-1")).toBeVisible();
  expect(screen.getByText("GCash")).toBeVisible();
  expect(screen.getByText("Driver One")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Edit schedule" }));
  fireEvent.change(screen.getByLabelText("Driver (if applicable)"), { target: { value: "Driver Two" } });
  fireEvent.click(screen.getByLabelText("Tech Two"));
  fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/tasks/task-1", expect.objectContaining({ method: "PATCH" })));
  const call = apiRequest.mock.calls.find(([path, options]) => path === "/tasks/task-1" && options?.method === "PATCH");
  expect(JSON.parse(call[1].body)).toMatchObject({
    assignedTechnicianId: "tech-1",
    schedule: { driverName: "Driver Two", teamMemberIds: ["tech-2"], notes: "Bring ladder" },
  });
});
