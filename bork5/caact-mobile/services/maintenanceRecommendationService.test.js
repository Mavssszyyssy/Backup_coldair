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
