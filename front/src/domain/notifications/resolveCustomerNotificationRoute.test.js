import { describe, expect, it } from "vitest";
import { resolveCustomerNotificationRoute } from "./resolveCustomerNotificationRoute";

describe("customer notification routing", () => {
  it("opens My AC Units for AMP alerts even when an old mobile route is stored", () => {
    expect(resolveCustomerNotificationRoute({ category: "amp_due_soon", targetType: "unit", route: "/customer/units/123" })).toBe("/myunit");
  });

  it("keeps order and supported explicit web routes", () => {
    expect(resolveCustomerNotificationRoute({ type: "order" })).toBe("/my-orders");
    expect(resolveCustomerNotificationRoute({ route: "/contact" })).toBe("/contact");
  });
});
