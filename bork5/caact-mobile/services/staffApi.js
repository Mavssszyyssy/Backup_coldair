import { apiFetch } from "../constants/config";

const STAFF_TIMEOUT_MS = 20000;

async function staffRequest(token, path, { method = "GET", body } = {}) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), STAFF_TIMEOUT_MS) : null;
  try {
    const response = await apiFetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(controller ? { signal: controller.signal } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || data?.error || "The server could not complete this request.");
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The request timed out. Please try again.");
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const fetchStaffDashboard = (token) => staffRequest(token, "/dashboard/me");
export const fetchStaffOrders = (token) => staffRequest(token, "/orders");
export const processStaffOrder = (token, orderId, payload) =>
  staffRequest(token, `/orders/${encodeURIComponent(orderId)}/process`, { method: "PATCH", body: payload });
export const verifyStaffOrderPayment = (token, orderId) =>
  staffRequest(token, `/orders/${encodeURIComponent(orderId)}/paymongo/verify`, { method: "POST" });

export const fetchStaffProducts = (token) => staffRequest(token, "/products");
export const createStaffProduct = (token, payload) =>
  staffRequest(token, "/products", { method: "POST", body: payload });
export const updateStaffProduct = (token, productId, payload) =>
  staffRequest(token, `/products/${encodeURIComponent(productId)}`, { method: "PATCH", body: payload });
export const restockStaffProduct = (token, productId, payload) =>
  staffRequest(token, `/products/${encodeURIComponent(productId)}/restock`, { method: "PATCH", body: payload });

export const fetchStaffUsers = (token) => staffRequest(token, "/users");
export const createStaffAccount = (token, payload) =>
  staffRequest(token, "/users/staff", { method: "POST", body: payload });
export const changeStaffUserStatus = (token, userId, status) =>
  staffRequest(token, `/users/${encodeURIComponent(userId)}/status`, { method: "PATCH", body: { status } });

export const fetchOperationalTasks = (token) => staffRequest(token, "/tasks?limit=200");
export const changeOperationalTaskStatus = (token, taskId, status) =>
  staffRequest(token, `/tasks/${encodeURIComponent(taskId)}/status`, { method: "PATCH", body: { status } });
export const fetchOperationalServices = (token) => staffRequest(token, "/service-requests");
export const changeOperationalServiceStatus = (token, requestId, status) =>
  staffRequest(token, `/service-requests/${encodeURIComponent(requestId)}/status`, { method: "PATCH", body: { status } });

export const fetchAmpPipeline = (token) => staffRequest(token, "/amp/manager/pipeline?days=30");
export const fetchAmpReportUnits = (token) => staffRequest(token, "/amp/report-units");
export const fetchAmpForecast = (token) => staffRequest(token, "/amp/owner/forecast?months=12");
export const generateStaffAmpReport = (token, payload) =>
  staffRequest(token, "/ai/amp-report", { method: "POST", body: payload });

export const fetchBranchCoverage = (token) => staffRequest(token, "/branches");
export const saveBranchCoverage = (token, branchName, payload) =>
  staffRequest(token, `/branches/${encodeURIComponent(branchName)}`, { method: "PUT", body: payload });

export const fetchSalesReport = (token) => staffRequest(token, "/reports/sales");
export const fetchStaffAuditLogs = (token) => staffRequest(token, "/reports/audit-logs");

export const fetchWarrantyClaims = (token) => staffRequest(token, "/warranties/claims");
export const reviewWarrantyClaim = (token, unitId, claimId, payload) =>
  staffRequest(token, `/warranties/units/${encodeURIComponent(unitId)}/claims/${encodeURIComponent(claimId)}`, { method: "PATCH", body: payload });
export const fetchPartsRequests = (token) => staffRequest(token, "/parts-requests");
export const updatePartsRequest = (token, requestId, payload) =>
  staffRequest(token, `/parts-requests/${encodeURIComponent(requestId)}/status`, { method: "PATCH", body: payload });
export const fetchReorderRequests = (token) => staffRequest(token, "/reorders");
export const createReorderRequest = (token, payload) =>
  staffRequest(token, "/reorders", { method: "POST", body: payload });
export const reviewReorderRequest = (token, reorderId, payload) =>
  staffRequest(token, `/reorders/${encodeURIComponent(reorderId)}`, { method: "PATCH", body: payload });
