import { describe, expect, it } from "vitest";
import { resolveCustomerNotificationRoute } from "./resolveCustomerNotificationRoute";

describe("customer notification routing", () => {
  it("opens My AC Units for AMP alerts even when an old mobile route is stored", () => {
    expect(resolveCustomerNotificationRoute({ category: "amp_due_soon", targetType: "unit", route: "/customer/units/123" })).toBe("/myunit?unitId=123&page=amp");
  });

  it("keeps order and supported explicit web routes", () => {
    expect(resolveCustomerNotificationRoute({ type: "order" })).toBe("/my-orders");
    expect(resolveCustomerNotificationRoute({ type: "order", targetType: "order", targetId: "order-1" })).toBe("/my-orders?orderId=order-1");
    expect(resolveCustomerNotificationRoute({ route: "/contact", targetType: "contact_message", targetId: "message-1" })).toBe("/contact?messageId=message-1");
  });

  it("translates mobile customer routes into valid website destinations", () => {
    expect(resolveCustomerNotificationRoute({ route: "/customer/orders" })).toBe("/my-orders");
    expect(resolveCustomerNotificationRoute({ route: "/customer/units/abc?page=warranty" })).toBe("/myunit?unitId=abc&page=warranty");
    expect(resolveCustomerNotificationRoute({ route: "/customer/contact", targetId: "message-2" })).toBe("/contact?messageId=message-2");
    expect(resolveCustomerNotificationRoute({ route: "/customer/service-requests", targetId: "request-1" })).toBe("/services?requestId=request-1");
  });
});
