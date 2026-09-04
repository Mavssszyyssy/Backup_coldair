const MAJOR_COMPONENTS = ["Compressor / Motor", "Control Board"];

const canonicalMajorComponent = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("compressor") || normalized.includes("motor")) {
    return "Compressor / Motor";
  }
  if (
    normalized.includes("control board") ||
    normalized.includes("board") ||
    normalized.includes("pcb") ||
    normalized.includes("controller") ||
    normalized.includes("electronics")
  ) {
    return "Control Board";
  }
  return "";
};

const summarizeMajorComponentUse = (histories = []) => {
  const counts = new Map(MAJOR_COMPONENTS.map((component) => [component, 0]));
  histories.forEach((history) => {
    (Array.isArray(history.partsUsed) ? history.partsUsed : []).forEach((part) => {
      const component = canonicalMajorComponent(part);
      if (component) counts.set(component, (counts.get(component) || 0) + 1);
    });
  });
  return MAJOR_COMPONENTS.map((component) => ({
    component,
    count: counts.get(component) || 0,
  }));
};

module.exports = {
  MAJOR_COMPONENTS,
  canonicalMajorComponent,
  summarizeMajorComponentUse,
};
