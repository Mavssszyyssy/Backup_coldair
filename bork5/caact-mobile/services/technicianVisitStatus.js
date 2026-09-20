export const TECHNICIAN_VISIT_STATUSES = [
  { id: "for_repair", label: "For Repair", help: "A recorded issue needs a repair follow-up." },
  { id: "for_further_inspection", label: "For Further Inspection", help: "The cause or required work still needs to be confirmed." },
  { id: "completed", label: "Completed", help: "The work described in this visit record was completed." },
];

export const normalizeTechnicianVisitStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return TECHNICIAN_VISIT_STATUSES.some((status) => status.id === normalized) ? normalized : "";
};

export const technicianVisitStatusLabel = (value) =>
  TECHNICIAN_VISIT_STATUSES.find((status) => status.id === normalizeTechnicianVisitStatus(value))?.label || "Not recorded";
