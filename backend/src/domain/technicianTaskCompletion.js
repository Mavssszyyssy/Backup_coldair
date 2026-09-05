const { validateStrictServicePayload } = require("./serviceCompletionService");

const text = (value) => String(value || "").trim();

const isInstallationWorkOrder = (task = {}, serialNumbers = []) => {
  const payload = task?.payload && typeof task.payload === "object" ? task.payload : {};
  if (Array.isArray(serialNumbers) && serialNumbers.length > 0) return true;
  if (text(payload.requestId || task.requestId)) return false;
  if (text(payload.orderId || task.orderId || payload.orderCode || task.orderCode)) return true;

  const description = [task.title, task.issueType, task.description, payload.source]
    .map((value) => text(value).toLowerCase())
    .join(" ");
  return /\b(install|installation|delivery|fulfillment)\b/.test(description);
};

const validateTechnicianTaskCompletion = ({ task = {}, payload = {}, serialNumbers = [] } = {}) => {
  if (isInstallationWorkOrder(task, serialNumbers)) {
    return { ok: true, kind: "installation", errors: {}, values: {} };
  }

  const validation = validateStrictServicePayload({
    ...(task?.payload && typeof task.payload === "object" ? task.payload : {}),
    ...(payload && typeof payload === "object" ? payload : {}),
  });
  return { ...validation, kind: "service" };
};

module.exports = { isInstallationWorkOrder, validateTechnicianTaskCompletion };
