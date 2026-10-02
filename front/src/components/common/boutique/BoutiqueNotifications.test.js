import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BoutiqueNotifications from "./BoutiqueNotifications";

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
});
