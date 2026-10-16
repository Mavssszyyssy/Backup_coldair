import { buildMaintenanceRecommendation, buildNextRecommendedMaintenance } from "./maintenanceRecommendationService";
import { resolveNotificationRoute } from "./notificationRouteService";

afterEach(() => jest.useRealTimers());
test("a suggested date due today in Manila is not overdue or a booked appointment", () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-09-05T18:00:00Z"));
  const recommendation = buildMaintenanceRecommendation({ unit: { bestServicedBy: "2026-09-06", recommendedService: "regular_cleaning" } });
  expect(recommendation.overdue).toBe(false);
  expect(buildNextRecommendedMaintenance(recommendation).label).toBe("Suggested for today");
  expect(buildNextRecommendedMaintenance(recommendation).urgency).not.toBe("Scheduled");
});
test("missing source dates do not invent regular cleaning or a servicing date", () => {
  const next = buildNextRecommendedMaintenance(buildMaintenanceRecommendation({ unit: {} }));
  expect(next.date).toBe("");
  expect(next.recommendedService).toBe("");
  expect(next.message).not.toContain("Regular cleaning");
  expect(next.label).toMatch(/date needed/i);
});
test("incomplete-history warnings survive mobile recommendation formatting", () => {
  const warning = { excludedRecordCount: 1, message: "Incomplete history excluded" };
  const next = buildNextRecommendedMaintenance(buildMaintenanceRecommendation({ unit: { amp: { dataQuality: warning } } }));
  expect(next.dataQuality).toEqual(warning);
});
test("service-request warranty notices go to services, and technicians never navigate to customer pages", () => {
  expect(resolveNotificationRoute({ type: "service", targetType: "service_request", targetId: "request-id", title: "Warranty service completed" }, "customer")).toContain("/customer/services");
  expect(resolveNotificationRoute({ type: "warranty", targetType: "unit", targetId: "unit-id" }, "technician")).not.toContain("/customer/");
});
test("installation-complete order notifications never treat an order ID as an AC-unit ID", () => {
  const notification = {
    type: "order",
    targetType: "order",
    targetId: "order-id",
    route: "/customer/orders",
    title: "Installation completed",
    message: "Your warranty and active unit record are now available.",
  };
  expect(resolveNotificationRoute(notification, "customer")).toBe("/customer/orders?orderId=order-id");
  expect(resolveNotificationRoute({
    ...notification,
    route: "/customer/units/order-id?page=warranty",
  }, "customer")).toBe("/customer/orders?orderId=order-id");
});
test("technician task-list alerts open all schedule dates while task alerts open the exact task", () => {
  expect(resolveNotificationRoute({
    route: "/technician/tasks",
    title: "Work schedule updated",
  }, "technician")).toBe("/technician/tasks?schedule=all");
  expect(resolveNotificationRoute({
    route: "/technician/tasks",
    targetType: "task",
    targetId: "task-id",
  }, "technician")).toBe("/technician/task/task-id/information");
});
test("customer support, service, and unit alerts open their exact records", () => {
  expect(resolveNotificationRoute({
    targetType: "contact_message",
    targetId: "message-id",
  }, "customer")).toBe("/customer/contact?messageId=message-id");
  expect(resolveNotificationRoute({
    targetType: "service_request",
    targetId: "request-id",
  }, "customer")).toBe("/customer/services?requestId=request-id");
  expect(resolveNotificationRoute({
    targetType: "unit",
    targetId: "unit-id",
    category: "amp_due_soon",
  }, "customer")).toBe("/customer/units/unit-id?page=amp");
});
