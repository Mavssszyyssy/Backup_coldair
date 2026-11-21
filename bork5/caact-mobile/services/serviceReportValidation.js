// Keep the technician form aligned with backend domain/serviceEvidence.js.
import { validateHumanText } from "../utils/textFieldValidation";
export function serviceReportError(findings = "", resolution = "") {
  const textError = validateHumanText(findings, { max: 1500, label: "Findings" }) || validateHumanText(resolution, { max: 1500, label: "Work performed" });
  if (textError) return textError;
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
