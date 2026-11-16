import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../config/api";
import useCustomerAlerts from "../../../hooks/useAlerts";
import { announceNotificationUpdate } from "../../../utils/notificationSync";
import BoutiqueNotifications from "./BoutiqueNotifications";
import AdminNotificationsBell from "../../ADMIN/Common/AdminNotificationsBell";
import SuperAdminNotificationsBell from "../../SUPERADMIN/Common/SuperAdminNotificationsBell";

vi.mock("../../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({ isAuthenticated: true, user: { id: "staff-1" }, currentLanguage: "English" }),
}));
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

  it("confirms archive all and can browse older archived alerts without navigating away", async () => {
    let archived = false;
    apiRequest.mockImplementation(async (path) => {
      if (path === "/notifications/me/archive-all") archived = true;
      if (path === "/notifications/me") return { notifications: archived ? [] : [alertItem] };
      if (path.endsWith("page=2")) return { notifications: [{ ...alertItem, _id: "notice-2", title: "Older alert" }], hasMore: false };
      return { notifications: [alertItem], hasMore: true };
    });
    renderAlerts();
    fireEvent.click(await screen.findByRole("button", { name: "Open alerts (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive all", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
    expect(apiRequest).not.toHaveBeenCalledWith("/notifications/me/archive-all", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Archive all", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Archive all alerts", exact: true }));
    await screen.findByText("Your inbox is empty.");
    expect(apiRequest).toHaveBeenCalledWith("/notifications/me/archive-all", expect.objectContaining({ method: "PATCH" }));
    fireEvent.click(screen.getByRole("button", { name: "Archived", exact: true }));
    fireEvent.click(await screen.findByRole("button", { name: "Next page" }));
    expect(await screen.findByRole("button", { name: "Archived alert: Older alert" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByLabelText("Current page")).toHaveTextContent("/shop");
  });

  it("archives two selected alerts in one request and leaves the third in Current", async () => {
    const second = { ...alertItem, _id: "notice-2", title: "Unit scheduled" };
    const third = { ...alertItem, _id: "notice-3", title: "Service reminder" };
    let current = [alertItem, second, third];
    let archived = [];
    apiRequest.mockImplementation(async (path, options) => {
      if (path.endsWith("/archive-selected")) {
        const { ids } = JSON.parse(options.body);
        archived = current.filter(({ _id }) => ids.includes(_id));
        current = current.filter(({ _id }) => !ids.includes(_id));
        return { modifiedCount: archived.length };
      }
      return { notifications: path.includes("view=archived") ? archived : current };
    });
    renderAlerts();
    fireEvent.click(await screen.findByRole("button", { name: "Open alerts (3)" }));
    const selectAll = screen.getByRole("checkbox", { name: "Select all shown" });
    fireEvent.click(selectAll);
    expect(selectAll).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select alert: Service reminder" }));
    expect(selectAll).toBePartiallyChecked();
    fireEvent.click(screen.getByRole("button", { name: "Archive selected (2)" }));
    await screen.findByRole("button", { name: "Open alerts (1)" });
    expect(apiRequest).toHaveBeenCalledWith("/notifications/me/archive-selected", {
      method: "PATCH", silentConnection: true, body: JSON.stringify({ ids: ["notice-1", "notice-2"] }),
    });
    expect(apiRequest.mock.calls.filter(([path]) => path.endsWith("/archive-selected"))).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Unread alert: Service reminder" })).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: "Select alert: Order received" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Current page")).toHaveTextContent("/shop");
    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    expect(await screen.findByRole("button", { name: "Archived alert: Unit scheduled" })).toBeVisible();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps checked alerts selected for retry if the batch request fails", async () => {
    apiRequest.mockImplementation(async (path) => {
      if (path.endsWith("/archive-selected")) throw new Error("Offline");
      return { notifications: [alertItem] };
    });
    renderAlerts("Filipino");
    fireEvent.click(await screen.findByRole("button", { name: "Open alerts (1)" }));
    const checkbox = screen.getByRole("checkbox", { name: "Piliin ang alerto: Order received" });
    fireEvent.click(checkbox);
    const archive = screen.getByRole("button", { name: "I-archive ang napili (1)" });
    fireEvent.click(archive);
    expect(await screen.findByRole("alert")).toHaveTextContent("Hindi ma-archive ang mga napiling alerto.");
    expect(checkbox).toBeChecked();
    expect(archive).toBeEnabled();
  });

  it.each([AdminNotificationsBell, SuperAdminNotificationsBell])("offers archive all in %p", async (Bell) => {
    let archived = false;
    apiRequest.mockImplementation(async (path) => {
      if (path === "/notifications/me/archive-all") archived = true;
      return { notifications: archived ? [] : [alertItem], unreadCount: archived ? 0 : 1 };
    });
    render(<MemoryRouter><Bell /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open alerts" }));
    fireEvent.click(await screen.findByRole("button", { name: "Archive all", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Archive all alerts", exact: true }));
    await screen.findByText("No alerts right now.");
    expect(apiRequest.mock.calls.filter(([path]) => path === "/notifications/me/archive-all")).toHaveLength(1);
  });

  it.each([AdminNotificationsBell, SuperAdminNotificationsBell])("archives a checked staff alert in %p", async (Bell) => {
    let notifications = [alertItem, { ...alertItem, _id: "notice-2", title: "Other alert" }];
    apiRequest.mockImplementation(async (path, options) => {
      if (path.endsWith("/archive-selected")) {
        const { ids } = JSON.parse(options.body);
        notifications = notifications.filter(({ _id }) => !ids.includes(_id));
      }
      return { notifications };
    });
    render(<MemoryRouter><Bell /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open alerts" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select alert: Order received" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive selected (1)" }));
    await waitFor(() => expect(screen.queryByText("Order received")).not.toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "Select alert: Other alert" })).not.toBeChecked();
  });
});
