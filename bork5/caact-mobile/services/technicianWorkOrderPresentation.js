import { COLORS } from "../constants/theme";

export const workOrderStatusKey = (status = "") => String(status || "").trim().toLowerCase().replace(/[_\s]+/g, "-");

const STATUS_PRESENTATION = {
  pending: { label: "Pending", color: COLORS.warning },
  accepted: { label: "Accepted", color: COLORS.tech },
  "on-the-way": { label: "On the way", color: COLORS.tech },
  arrived: { label: "Arrived", color: COLORS.success },
  installing: { label: "Installing", color: COLORS.tech },
  "in-progress": { label: "In Progress", color: COLORS.tech },
  "on-hold": { label: "On hold", color: COLORS.warning },
  failed: { label: "Failed", color: COLORS.danger },
  rescheduled: { label: "Rescheduled", color: COLORS.warning },
  completed: { label: "Completed", color: COLORS.success },
  cancelled: { label: "Cancelled", color: COLORS.textSecondary },
};

export const workOrderStatusPresentation = (status) => STATUS_PRESENTATION[workOrderStatusKey(status)] || {
  label: "Unknown", color: COLORS.textSecondary,
};
