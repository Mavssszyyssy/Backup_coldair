import { COLORS } from "../constants/theme";
import { workOrderStatusPresentation } from "./technicianWorkOrderPresentation";

test("work-order status labels and colors stay consistent across dashboard, list, and details", () => {
  expect(workOrderStatusPresentation("Pending")).toEqual({ label: "Pending", color: COLORS.warning });
  expect(workOrderStatusPresentation("In Progress")).toEqual({ label: "In Progress", color: COLORS.tech });
  expect(workOrderStatusPresentation("in-progress")).toEqual({ label: "In Progress", color: COLORS.tech });
  expect(workOrderStatusPresentation("Completed")).toEqual({ label: "Completed", color: COLORS.success });
  expect(workOrderStatusPresentation("On Hold")).toEqual({ label: "On hold", color: COLORS.warning });
  expect(workOrderStatusPresentation("Rescheduled")).toEqual({ label: "Rescheduled", color: COLORS.warning });
  expect(workOrderStatusPresentation("Failed")).toEqual({ label: "Failed", color: COLORS.danger });
  expect(workOrderStatusPresentation("other").label).toBe("Unknown");
});
