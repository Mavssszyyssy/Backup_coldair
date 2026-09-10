const FALLBACK_SERVICE_CATALOG = [
  { id: "maintenance", title: "Regular Cleaning", summary: "Routine AC maintenance when the last cleaning was less than one year ago.", defaultIssueType: "Regular Cleaning" },
  { id: "cleaning", title: "Deep Cleaning", summary: "Thorough cleaning when the last cleaning was more than one year ago. The unit is taken down for cleaning.", defaultIssueType: "Deep Cleaning" },
  { id: "repair", title: "Repair", summary: "Report faults, weak cooling, leaks, or other issues for diagnosis.", defaultIssueType: "Repair" },
  { id: "consultation", title: "Consultation", summary: "Request a site visit or service recommendation.", defaultIssueType: "Consultation" },
];

const normalizeOffering = (value = {}) => {
  const id = String(value.id || "").trim().toLowerCase();
  // Keep established IDs and configured prices for existing clients and records.
  const cleaningId = ({ regular_cleaning: "maintenance", deep_cleaning: "cleaning" })[id] || id;
  const cleaning = FALLBACK_SERVICE_CATALOG.find(item => item.id === cleaningId && ["maintenance", "cleaning"].includes(cleaningId));
  const basePrice = Number(value.basePrice);
  const hasConfiguredPrice = Number.isFinite(basePrice) && basePrice >= 0;
  return {
    id,
    title: cleaning?.title || String(value.title || "").trim(),
    summary: cleaning?.summary || String(value.summary || "").trim(),
    defaultIssueType: cleaning?.defaultIssueType || String(value.defaultIssueType || value.title || "Service").trim(),
    pricing: {
      currency: String(value.currency || "PHP").trim().toUpperCase(),
      basePrice: hasConfiguredPrice ? basePrice : null,
      label: hasConfiguredPrice
        ? `PHP ${basePrice.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : String(value.pricingLabel || "Branch quote after assessment"),
    },
  };
};

const getServiceCatalog = (rawConfig = "") => {
  try {
    const parsed = rawConfig ? JSON.parse(rawConfig) : null;
    if (Array.isArray(parsed) && parsed.length) {
      const configured = parsed.map(normalizeOffering).filter((item) => item.id && item.title);
      if (configured.length) return configured.filter(item => !["delivery", "installation"].includes(item.id) && !/^(delivery|installation)$/i.test(item.title));
    }
  } catch (_error) {
    // A malformed deployment setting must not make service booking unavailable.
  }
  return FALLBACK_SERVICE_CATALOG.map(normalizeOffering);
};

const findServiceOffering = (catalog = [], lookup = "") => {
  const raw = String(lookup || "").trim().toLowerCase();
  const target = ({ regular_cleaning: "maintenance", deep_cleaning: "cleaning" })[raw] || raw;
  const exact = catalog.find((item) => [item.id, item.title, item.defaultIssueType].some(value => String(value || "").toLowerCase() === raw));
  return exact || catalog.find((item) => item.id === target) || null;
};

module.exports = { getServiceCatalog, findServiceOffering };
