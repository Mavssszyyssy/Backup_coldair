import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../config/api";
import useCustomerAlerts from "../../../hooks/useCustomerAlerts";
import { announceNotificationUpdate } from "../../../utils/notificationSync";
import BoutiqueNotifications from "./BoutiqueNotifications";

vi.mock("../../../config/api", () => ({ apiRequest: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

function AlertsHarness({ language }) {
  const { unreadCount, openAlerts, drawerProps } = useCustomerAlerts(true, "customer-1");
  const { pathname } = useLocation();
  return <>
    <button onClick={openAlerts}>Open alerts ({unreadCount})</button>
    <output aria-label="Current page">{pathname}</output>
    <BoutiqueNotifications currentLanguage={language} {...drawerProps} />
  </>;
}

const renderAlerts = (language) => render(<MemoryRouter initialEntries={["/shop"]}><AlertsHarness language={language} /></MemoryRouter>);
const alertItem = {
  _id: "notice-1",
  unread: true,
  title: "Order received",
  message: "We received your order.",
  createdAt: "2026-11-12T00:00:00Z",
};

describe("BoutiqueNotifications", () => {
  it("renders unread alert content visibly before it is marked read", () => {
    render(<BoutiqueNotifications
      isOpen
      onClose={vi.fn()}
      onNotificationClick={vi.fn()}
      onMarkAllAsRead={vi.fn()}
      notifications={[{
        id: "notice-1",
        unread: true,
        title: "AC maintenance is due soon",
        message: "Open My AC Units to plan your visit.",
        time: "Today",
        category: "amp_due_soon",
        severity: "warning",
      }]}
    />);

    expect(screen.getByRole("button", { name: /Unread alert: AC maintenance is due soon/i })).toBeVisible();
    expect(screen.getByText("Open My AC Units to plan your visit.")).toBeVisible();
    expect(screen.getByText("YOU HAVE 1 NEW ALERT")).toHaveStyle({ backgroundColor: "#ef4444", color: "white" });
  });

  it("archives without navigating and restores a persisted alert as read", async () => {
    let archived = false;
    let unread = true;
    apiRequest.mockImplementation(async (path) => {
      if (path.endsWith("/archive")) {
        archived = true;
        unread = false;
      }
      if (path.endsWith("/restore")) archived = false;
      if (path === "/notifications/me") {
        return { notifications: archived ? [] : [{ ...alertItem, unread }] };
      }
      return { notifications: archived ? [alertItem] : [] };
    });
    const first = renderAlerts();
    fireEvent.click(await screen.findByRole("button", { name: "Open alerts (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive: Order received" }));
    await screen.findByText("Your inbox is empty.");
    expect(screen.getByLabelText("Current page")).toHaveTextContent("/shop");
    expect(screen.getByRole("button", { name: "Open alerts (0)" })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith("/notifications/notice-1/archive", expect.objectContaining({ method: "PATCH" }));
    expect(apiRequest.mock.calls.some(([path]) => path === "/notifications/me?view=archived")).toBe(false);
    first.unmount();

    renderAlerts();
    fireEvent.click(screen.getByRole("button", { name: "Open alerts (0)" }));
    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    expect(await screen.findByRole("button", { name: "Archived alert: Order received" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Mark all read" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore: Order received" }));
    await screen.findByText("No archived alerts.");
    expect(apiRequest).toHaveBeenCalledWith("/notifications/notice-1/restore", expect.objectContaining({ method: "PATCH" }));
    fireEvent.click(screen.getByRole("button", { name: "Current" }));
    expect(await screen.findByRole("button", { name: "Read alert: Order received" })).toBeVisible();
  });

  it("retains the alert and shows a localized error if archiving fails", async () => {
    let rejectArchive;
    apiRequest.mockImplementation((path) => path.endsWith("/archive")
      ? new Promise((_resolve, reject) => { rejectArchive = reject; })
      : Promise.resolve({ notifications: [alertItem] }));
    renderAlerts("Filipino");
    fireEvent.click(await screen.findByRole("button", { name: "Open alerts (1)" }));
    const archive = screen.getByRole("button", { name: "I-archive: Order received" });
    fireEvent.click(archive);
    expect(archive).toBeDisabled();
    fireEvent.click(archive);
    await act(async () => rejectArchive(new Error("Offline")));
    expect(apiRequest.mock.calls.filter(([path]) => path.endsWith("/archive"))).toHaveLength(1);
    expect(await screen.findByRole("alert")).toHaveTextContent("Hindi ma-archive ang alertong ito.");
    expect(archive).toBeEnabled();
    expect(screen.getByRole("button", { name: "Open alerts (1)" })).toBeInTheDocument();
  });

  it("discards a stale inbox response if an alert was archived while it was loading", async () => {
    let finishStaleRead;
    apiRequest.mockResolvedValueOnce({ notifications: [alertItem] })
      .mockImplementationOnce(() => new Promise((resolve) => { finishStaleRead = resolve; }))
      .mockResolvedValueOnce({})
      .mockResolvedValue({ notifications: [] });
    renderAlerts();
    fireEvent.click(await screen.findByRole("button", { name: "Open alerts (1)" }));
    act(() => announceNotificationUpdate());
    fireEvent.click(screen.getByRole("button", { name: "Archive: Order received" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open alerts (0)" })).toBeInTheDocument());
    await act(async () => finishStaleRead({ notifications: [alertItem] }));
    expect(await screen.findByText("Your inbox is empty.")).toBeVisible();
  });
});
