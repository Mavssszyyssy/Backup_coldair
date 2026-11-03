import { workOrderRouteFilters } from "./technicianWorkOrderFilters";

test("work-order links can select an all-date status filter", () => {
  expect(workOrderRouteFilters({ status: "pending", schedule: "all", search: "ORD-123" })).toEqual({
    status: "pending",
    schedule: "all",
    search: "ORD-123",
  });
});

test("in-progress dashboard card opens exactly the in-progress records", () => {
  expect(workOrderRouteFilters({ status: "in-progress", schedule: "all" })).toEqual({
    status: "in-progress", schedule: "all", search: "",
  });
});

test("invalid work-order link filters fail closed to the normal list defaults", () => {
  expect(workOrderRouteFilters({ status: "assigned-to-someone-else", schedule: "forever" })).toEqual({
    status: "all",
    schedule: "today",
    search: "",
  });
});
