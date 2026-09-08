// Keep the technician form aligned with backend domain/serviceEvidence.js.
export function serviceReportError(findings = "", resolution = "") {
  const observed = String(findings).trim();
  if (observed.length < 10 || /^(?:AMP recommended\b|service completed\.?$|no findings recorded\.?$|pending technician findings\.?$)/i.test(observed)) {
    return "Describe what you actually found (at least 10 characters), not the service recommendation.";
  }
  const actions = String(resolution).split(",").map((action) => action.trim());
  if (!actions.some((action) => action.length >= 3 && !/^(?:service completed|completed|done|n\/?a|none|not recorded)\.?$/i.test(action))) {
    return "Describe the work you actually performed. 'Service completed' alone is not enough.";
  }
  return "";
}
