// services/api.jsx
// HTTP client for the Express API server in ../../backend.
//
// Base URL selection:
//   - Expo LAN / real device -> derived from Metro host, e.g. http://192.168.1.x:5001/api
//   - Local API fallback -> the same host on port 5000
//   - Android emulator fallback -> http://10.0.2.2:5001/api
//   - Override with EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_API_BASE.

import { API_BASE, apiFetch } from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  confirmBackendRecovery,
  failBackendConnection,
} from "./backendConnectionState";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 10000;
const OPERATIONAL_WRITE_TIMEOUT_MS = 25000;
// A database-backed read can legitimately take longer after a serverless
// function has been idle: the API first detects the stale Atlas socket, then
// establishes a fresh connection. Keep mutations short, but allow ordinary
// reads enough time for each bounded, safe recovery attempt.
export const READ_REQUEST_TIMEOUT_MS = 15000;
const PROOF_UPLOAD_TIMEOUT_MS = 45000;
const AMP_REPORT_TIMEOUT_MS = 30000;
const CUSTOMER_CHAT_TIMEOUT_MS = 15000;

async function request(method, path, { token, body, timeoutMs, maxAttempts } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const normalizedMethod = String(method || "GET").toUpperCase();
  const effectiveTimeoutMs =
    timeoutMs ??
    (["GET", "HEAD"].includes(normalizedMethod)
      ? READ_REQUEST_TIMEOUT_MS
      : OPERATIONAL_WRITE_TIMEOUT_MS);

  let res;
  try {
    res = await apiFetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      timeoutMs: effectiveTimeoutMs,
      ...(maxAttempts ? { maxAttempts } : {}),
    });
  } catch (error) {
    const timedOut =
      error?.code === "BACKEND_FETCH_TIMEOUT" ||
      error?.name === "TimeoutError" ||
      error?.name === "AbortError";
    if (timedOut && path === "/ai/amp-report") {
      throw new Error("Your AC report took too long to load. Please try again. No service visit was booked.");
    }
    if (timedOut && effectiveTimeoutMs === PROOF_UPLOAD_TIMEOUT_MS) {
      throw new Error(
        "The installation photo upload timed out. Check your connection, then tap Complete installation again.",
      );
    }
    // Network and timeout failures deliberately use one customer-facing
    // message. The app-wide connection banner provides a Retry action.
    const connectionError = new Error(
      "Unable to connect to the server. Please check your connection and try again.",
    );
    connectionError.code = error?.code || "API_NETWORK_ERROR";
    connectionError.status = 0;
    connectionError.uncertainMutation = !["GET", "HEAD"].includes(normalizedMethod);
    throw connectionError;
  }

  let data;
  try {
    data = await res.json();
  } catch (error) {
    if (res.ok && Number(res.status) !== 204) {
      failBackendConnection(path);
      const responseError = new Error(
        "The server response was interrupted. Please check your connection and try again.",
      );
      responseError.code = "BACKEND_RESPONSE_INTERRUPTED";
      responseError.status = 0;
      responseError.uncertainMutation = !["GET", "HEAD"].includes(normalizedMethod);
      throw responseError;
    }
    data = {};
  }

  return { status: res.status, ok: res.ok, data };
}

const getErrorMessage = (data, fallback) =>
  data?.error || data?.message || data?.errors?.email || fallback;

const get = (path, token) => request("GET", path, { token });
const post = (path, body, token) => request("POST", path, { token, body });
const patch = (path, body, token) => request("PATCH", path, { token, body });
const del = (path, token) => request("DELETE", path, { token });
const TOKEN_KEY = "auth_token";

const mutationId = (scope = "write") =>
  `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

// A weak connection can deliver a write to the API but lose its response.
// Never replay that write automatically. Instead, perform one bounded read
// and accept success only when the server record proves that exact outcome.
async function reconcileUncertainMutation(path, originalError, verify) {
  if (!originalError?.uncertainMutation || typeof verify !== "function") {
    throw originalError;
  }
  try {
    const reconciled = await verify();
    if (reconciled) {
      confirmBackendRecovery(path);
      return reconciled;
    }
  } catch {
    // Preserve the original uncertain-write message. The global Retry action
    // will refresh the focused screen after connectivity is restored.
  }
  throw originalError;
}

async function fetchTaskForReconciliation(token, taskId) {
  const path = `/tasks/${encodeURIComponent(taskId)}`;
  const { ok, data } = await request("GET", path, {
    token,
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxAttempts: 1,
  });
  return ok ? data.task || null : null;
}

async function fetchMyRequestsForReconciliation(token) {
  const path = "/service-requests/me";
  const { ok, data } = await request("GET", path, {
    token,
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxAttempts: 1,
  });
  return ok ? data.requests || [] : [];
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function checkBackendConnection() {
  try {
    // /health intentionally works without MongoDB, so it cannot prove that
    // dashboards and work orders are available. Probe a database-backed route
    // instead; authenticated users use /auth/me and signed-out users use the
    // public catalog.
    const token = await getStoredToken();
    const probePath = token ? "/auth/me" : "/products/public";
    const { ok, status, data } = await get(probePath, token || undefined);
    const connected = ok;
    if (connected) confirmBackendRecovery(probePath);
    else failBackendConnection(probePath);
    return {
      connected,
      status,
      baseUrl: API_BASE,
      message: ok
        ? "Backend and database are reachable."
        : getErrorMessage(data, "Backend database check failed."),
    };
  } catch (error) {
    return {
      connected: false,
      status: 0,
      baseUrl: API_BASE,
      message: error?.message || "Backend is not reachable.",
    };
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Login with email + password.
 * Returns { success, token, user } on success.
 * Returns { success: false, error } on failure.
 */
export async function login(identifier, password) {
  const { ok, data } = await post("/auth/login", {
    identifier,
    email: identifier,
    password,
  });
  if (ok && data.requiresEmailVerification) {
    return {
      success: false,
      requiresEmailVerification: true,
      challengeToken: data.challengeToken,
      maskedEmail: data.maskedEmail,
      expiresAt: data.expiresAt,
      resendAvailableAt: data.resendAvailableAt,
      message: data.message || "Enter the code sent to your account email.",
    };
  }
  if (ok) return { success: true, token: data.token, user: data.user };
  return {
    success: false,
    error: getErrorMessage(data, "Login failed."),
  };
}

/**
 * Register a new customer account.
 * Returns { success, token, user } on success.
 */
export async function register({
  name_first,
  name_last,
  suffix,
  alias,
  email,
  phone,
  password,
  address,
  municipality,
  municipality_code,
  submunicipality,
  submunicipality_code,
  thoroughfare,
  property_block_lot,
  apartment_unit,
  landmark,
  plus_code,
  contact_method,
  messenger_handle,
  delivery_instructions,
  locations,
  role,
  branch,
  registrationVerificationToken,
  legalConsent,
}) {
  const { ok, status, data } = await post("/auth/register", {
    name_first,
    name_last,
    suffix,
    alias,
    email,
    phone,
    password,
    address,
    municipality,
    municipality_code,
    submunicipality,
    submunicipality_code,
    thoroughfare,
    property_block_lot,
    apartment_unit,
    landmark,
    plus_code,
    contact_method,
    messenger_handle,
    delivery_instructions,
    locations,
    role,
    branch,
    registrationVerificationToken,
    legalConsent,
  });
  if (ok) return { success: true, token: data.token, user: data.user };
  return {
    success: false,
    error:
      status === 409
        ? "That email or alias is already in use."
        : getErrorMessage(data, "Registration failed."),
  };
}

export async function checkAliasAvailability(alias) {
  const query = encodeURIComponent(String(alias || "").trim());
  const { ok, data } = await get(`/auth/check-alias?alias=${query}`);
  if (ok) return { success: true, available: Boolean(data.available) };
  return {
    success: false,
    error: getErrorMessage(data, "Unable to check alias availability."),
  };
}

export async function requestVerificationOtp({
  action,
  channel,
  email,
  phone,
  messenger_handle,
}) {
  const { ok, data } = await post("/auth/request-otp", {
    action,
    channel,
    email,
    phone,
    messenger_handle,
  });
  if (ok) {
    return {
      success: true,
      message: data.message,
      expiresAt: data.expiresAt || "",
      resendAvailableAt: data.resendAvailableAt || "",
    };
  }
  return {
    success: false,
    error: getErrorMessage(data, "Unable to send verification code."),
  };
}

export async function verifyRegistrationOtp({
  action,
  channel,
  email,
  phone,
  messenger_handle,
  code,
}) {
  const { ok, data } = await post("/auth/verify-otp", {
    action,
    channel,
    email,
    phone,
    messenger_handle,
    code,
  });
  if (ok) return {
    success: true,
    message: data.message,
    registrationProgress: data.registrationProgress || null,
    registrationVerificationToken: data.registrationVerificationToken || "",
  };
  return {
    success: false,
    error: getErrorMessage(data, "Invalid or expired code."),
  };
}

/**
 * Logout — invalidates the server session token.
 */
export async function logout(token) {
  if (!token) return;
  await post("/auth/logout", {}, token);
}

/**
 * Fetch the current user from a stored token.
 * Returns { success, user } or { success: false }.
 */
export async function me(token) {
  if (!token) return { success: false, status: 0 };
  const { ok, status, data } = await get("/auth/me", token);
  if (ok) return { success: true, user: data.user || data };
  return {
    success: false,
    status,
    error: getErrorMessage(data, "Unable to restore your account."),
  };
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function forgotPassword(identifier, channel = "email", accountLoginId = "") {
  const { ok, data } = await post("/auth/forgot-password", {
    identifier,
    channel,
    ...(accountLoginId ? { accountLoginId } : {}),
  });
  if (ok) return {
    success: true,
    message: data.message,
    expiresAt: data.expiresAt || "",
    resendAvailableAt: data.resendAvailableAt || "",
  };
  return {
    success: false,
    error: getErrorMessage(data, "Request failed."),
    retryAfterSeconds: data.retryAfterSeconds,
  };
}

export async function resetPassword(identifier, code, newPassword, channel = "email", accountLoginId = "") {
  const { ok, data } = await post("/auth/reset-password", {
    identifier,
    channel,
    ...(accountLoginId ? { accountLoginId } : {}),
    code,
    newPassword,
  });
  if (ok) return { success: true };
  return { success: false, error: getErrorMessage(data, "Reset failed.") };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * Fetch all users. Requires authentication token.
 */
export async function fetchUsers(token) {
  const { ok, data } = await get("/users", token);
  if (ok) return { success: true, users: data.users || [] };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to fetch users."),
    users: [],
  };
}

/**
 * Update a user's fields.
 */
export async function updateUser(token, userId, payload) {
  const { ok, data } = await patch(`/users/${userId}`, payload, token);
  if (ok) return { success: true, user: data.user };
  return { success: false, error: getErrorMessage(data, "Update failed.") };
}

/**
 * Toggle a user's status (active ↔ disabled).
 */
export async function toggleStatus(token, userId, status) {
  const { ok, data } = await patch(
    `/users/${userId}/status`,
    { status },
    token,
  );
  if (ok) return { success: true, user: data.user };
  return {
    success: false,
    error: getErrorMessage(data, "Status update failed."),
  };
}

/**
 * Delete a user.
 */
export async function deleteUser(token, userId) {
  const { ok, data } = await del(`/users/${userId}`, token);
  if (ok) return { success: true };
  return { success: false, error: getErrorMessage(data, "Delete failed.") };
}

// ---------------------------------------------------------------------------
// Profile (self-service)
// ---------------------------------------------------------------------------

/**
 * Update the current user's own profile.
 */
export async function updateProfile(token, payload) {
  const { ok, data } = await patch("/users/profile", payload, token);
  if (ok) return { success: true, user: data.user };
  return {
    success: false,
    error: getErrorMessage(data, "Profile update failed."),
  };
}

export async function verifyLoginEmail(challengeToken, code) {
  const { ok, data } = await post("/auth/login/verify-email", { challengeToken, code });
  if (ok) return { success: true, token: data.token, user: data.user };
  return {
    success: false,
    error: getErrorMessage(data, "Email verification failed."),
  };
}

export async function resendLoginEmail(challengeToken) {
  const { ok, data } = await post("/auth/login/resend-email", { challengeToken });
  if (ok) return { success: true, ...data };
  return { success: false, error: getErrorMessage(data, "Unable to resend the sign-in code."), retryAfterSeconds: data.retryAfterSeconds };
}

export async function changeAccountPassword(token, payload) {
  const { ok, data } = await patch("/users/password", payload, token);
  return ok ? { success: true, user: data.user, message: data.message }
    : { success: false, error: getErrorMessage(data, "Unable to change your password.") };
}

export async function completeTechnicianOnboarding(token, payload) {
  const isCompleted = (user) => Boolean(user && (user.id || user._id) &&
    user.role === "technician" && user.isFirstLogin === false);
  let failure = "Unable to confirm technician setup. Please try again.";
  try {
    const { ok, data } = await patch("/users/password", payload, token);
    if (ok && isCompleted(data.user)) {
      return { success: true, user: data.user, message: data.message || "Technician onboarding completed." };
    }
    if (!ok) failure = getErrorMessage(data, failure);
  } catch (error) {
    failure = error?.message || failure;
  }

  // A timed-out write may have committed. Read the authenticated account once
  // before offering a retry; never repeat the password write automatically.
  try {
    const session = await me(token);
    if (session.success && isCompleted(session.user)) {
      return { success: true, user: session.user, message: "Technician setup is complete." };
    }
  } catch {
    // Keep the original failure if the read also cannot reach the server.
  }
  return { success: false, error: failure };
}

// ---------------------------------------------------------------------------
// Technician tasks
// ---------------------------------------------------------------------------

export async function fetchTasks(token, { technicianId, limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (technicianId) params.set("technician_id", technicianId);
  params.set("limit", String(Math.min(Math.max(Number(limit) || 100, 1), 200)));
  const query = `?${params.toString()}`;
  const { ok, data } = await get(`/tasks${query}`, token);
  if (ok) return { success: true, tasks: data.tasks || [] };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to fetch tasks."),
    tasks: [],
  };
}

export async function fetchTask(token, taskId) {
  const { ok, status, data } = await get(`/tasks/${encodeURIComponent(taskId)}`, token);
  if (ok) return { success: true, task: data.task };
  return {
    success: false,
    status,
    error: getErrorMessage(data, "Failed to fetch task."),
  };
}

export async function createTask(token, payload) {
  const { ok, data } = await post("/tasks", payload, token);
  if (ok) return { success: true, task: data.task };
  return { success: false, error: getErrorMessage(data, "Failed to create task.") };
}

export async function patchTask(token, taskId, payload) {
  const clientMutationId = String(payload?.clientMutationId || mutationId("task"));
  const requestPayload = { ...payload, clientMutationId };
  const proofPhotos = [
    ...(Array.isArray(requestPayload?.proof?.afterPhotos) ? requestPayload.proof.afterPhotos : []),
    ...(Array.isArray(requestPayload?.proof?.beforePhotos) ? requestPayload.proof.beforePhotos : []),
  ];
  const hasPhotoProof = proofPhotos
    .some((photo) => String(photo?.uri || photo || "").startsWith("data:image/"));
  const path = `/tasks/${encodeURIComponent(taskId)}`;
  let response;
  try {
    response = await request("PATCH", path, {
      token,
      body: requestPayload,
      timeoutMs: hasPhotoProof ? PROOF_UPLOAD_TIMEOUT_MS : OPERATIONAL_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    return reconcileUncertainMutation(path, error, async () => {
      const task = await fetchTaskForReconciliation(token, taskId);
      return String(task?.clientMutationId || "") === clientMutationId
        ? { success: true, task, reconciled: true }
        : null;
    });
  }
  const { ok, status, data } = response;
  if (ok) return { success: true, task: data.task };
  const fallback = status === 413
    ? "The installation photo is too large to upload. Retake the photo and try again."
    : "Failed to update task.";
  return { success: false, status, error: getErrorMessage(data, fallback) };
}

export async function acceptTask(token, taskId) {
  const { ok, data } = await patch(`/tasks/${encodeURIComponent(taskId)}/accept`, {}, token);
  if (ok) return { success: true, task: data.task };
  return { success: false, error: getErrorMessage(data, "Failed to accept task.") };
}

export async function fetchRegistrationContext(token, serialNumber) {
  const { ok, data } = await get(
    `/tasks/registration-context/${encodeURIComponent(serialNumber)}`,
    token,
  );
  if (ok) {
    return {
      success: true,
      task: data.task || null,
      unit: data.unit || null,
    };
  }
  return {
    success: false,
    error: getErrorMessage(data, "Failed to load QR registration context."),
  };
}

export async function registerAmpUnit(token, taskId, payload) {
  const path = `/tasks/${encodeURIComponent(taskId)}/amp-registration`;
  let response;
  try {
    response = await request("PATCH", path, {
      token,
      body: payload,
      timeoutMs: OPERATIONAL_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    return reconcileUncertainMutation(path, error, async () => {
      const task = await fetchTaskForReconciliation(token, taskId);
      const serial = String(payload?.serialNumber || "").trim();
      const registration = task?.ampRegistrations?.[serial];
      if (!registration || !["registered", "defective_hold"].includes(registration.status)) return null;
      return {
        success: true,
        task,
        registration,
        registrationProgress: task.registrationProgress,
        reconciled: true,
      };
    });
  }
  const { ok, data } = response;
  if (ok) {
    return {
      success: true,
      task: data.task,
      registration: data.registration,
      registrationProgress: data.registrationProgress,
    };
  }
  return {
    success: false,
    error: getErrorMessage(data, "Failed to submit AMP registration."),
    missingFields: data.missingFields || [],
  };
}

// ---------------------------------------------------------------------------
// Technician parts requests
// ---------------------------------------------------------------------------

export async function fetchMyPartsRequests(token) {
  const { ok, data } = await get("/parts-requests/me", token);
  if (ok) return { success: true, requests: data.requests || [] };
  return { success: false, error: getErrorMessage(data, "Failed to load parts requests."), requests: [] };
}

export async function createPartsRequest(token, payload) {
  const { ok, data } = await post("/parts-requests", payload, token);
  if (ok) return { success: true, request: data.request };
  return { success: false, error: getErrorMessage(data, "Failed to submit parts request.") };
}

// ---------------------------------------------------------------------------
// Customer service requests
// ---------------------------------------------------------------------------

export async function fetchMyServiceRequests(token) {
  const { ok, data } = await get("/service-requests/me", token);
  if (ok) return { success: true, requests: data.requests || [] };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to fetch service requests."),
    requests: [],
  };
}

export async function createOrder(token, payload) {
  const { ok, status, data } = await post("/orders", payload, token);
  if (ok) return { success: true, order: data.order, payment: data.payment || null };
  return {
    success: false,
    status,
    error: getErrorMessage(data, "Unable to create the order."),
  };
}

export async function fetchServiceCatalog(token) {
  const { ok, data } = await get("/service-requests/catalog", token);
  if (ok) return { success: true, offerings: data.offerings || [] };
  return { success: false, error: getErrorMessage(data, "Unable to load the current service catalog."), offerings: [] };
}

// ---------------------------------------------------------------------------
// Saved delivery addresses
// ---------------------------------------------------------------------------
// Address records are deliberately managed through their own endpoints rather
// than by overwriting a profile object. This keeps add/edit/default/delete in
// sync with checkout and the backend branch-routing rule.
export async function listAddresses(token) {
  const { ok, data } = await get("/users/addresses", token);
  if (ok) return { success: true, addresses: data.addresses || [] };
  return { success: false, error: getErrorMessage(data, "Unable to load delivery addresses."), addresses: [] };
}

export async function addAddress(token, payload) {
  const { ok, data } = await post("/users/addresses", payload, token);
  if (ok) return { success: true, addresses: data.addresses || [] };
  return { success: false, error: getErrorMessage(data, "Unable to save the delivery address."), errors: data.errors || null };
}

export async function updateAddress(token, addressId, payload) {
  const { ok, data } = await patch(`/users/addresses/${encodeURIComponent(addressId)}`, payload, token);
  if (ok) return { success: true, addresses: data.addresses || [] };
  return { success: false, error: getErrorMessage(data, "Unable to update the delivery address."), errors: data.errors || null };
}

export async function removeAddress(token, addressId) {
  const { ok, data } = await del(`/users/addresses/${encodeURIComponent(addressId)}`, token);
  if (ok) return { success: true, addresses: data.addresses || [] };
  return { success: false, error: getErrorMessage(data, "Unable to delete the delivery address.") };
}

export async function setDefaultAddress(token, addressId) {
  const { ok, data } = await patch(`/users/addresses/${encodeURIComponent(addressId)}/default`, {}, token);
  if (ok) return { success: true, addresses: data.addresses || [] };
  return { success: false, error: getErrorMessage(data, "Unable to set the default delivery address.") };
}

export async function fetchTechnicianUnitHistory(token, serialNumber, taskId = "") {
  const query = taskId ? `?taskId=${encodeURIComponent(taskId)}` : "";
  const { ok, status, data } = await get(
    `/tasks/unit-history/${encodeURIComponent(serialNumber)}${query}`,
    token,
  );
  if (ok) return { success: true, ...data };
  return {
    success: false,
    status,
    error: getErrorMessage(data, "Failed to load AC unit history."),
  };
}

export async function verifyPaymongoCheckout(token, orderId) {
  const response = await apiFetch(`/orders/${encodeURIComponent(orderId)}/paymongo/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Unable to verify PayMongo payment.");
  }
  return data;
}

export async function retryPaymongoCheckout(token, orderId) {
  const response = await apiFetch(`/orders/${encodeURIComponent(orderId)}/paymongo/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentReturnTarget: "mobile" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Unable to start PayMongo checkout.");
  }
  return data;
}

export async function checkInTask(token, taskId, coordinates) {
  const path = `/tasks/${encodeURIComponent(taskId)}/check-in`;
  let response;
  try {
    response = await request("PATCH", path, {
      token,
      body: { coordinates },
      timeoutMs: OPERATIONAL_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    return reconcileUncertainMutation(path, error, async () => {
      const task = await fetchTaskForReconciliation(token, taskId);
      return task?.checkIn?.checkedInAt
        ? { success: true, task, checkIn: task.checkIn, reconciled: true }
        : null;
    });
  }
  const { ok, data } = response;
  if (ok) return { success: true, task: data.task, checkIn: data.checkIn };
  return { success: false, error: getErrorMessage(data, "Unable to check in to this work order.") };
}

export async function confirmInstallationArrival(token, taskId) {
  const path = `/tasks/${encodeURIComponent(taskId)}/arrival-validation`;
  let response;
  try {
    response = await request("PATCH", path, {
      token,
      body: { customerPresent: true },
      timeoutMs: OPERATIONAL_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    return reconcileUncertainMutation(path, error, async () => {
      const task = await fetchTaskForReconciliation(token, taskId);
      return task?.arrivalValidation?.customerPresent
        ? { success: true, task, arrivalValidation: task.arrivalValidation, reconciled: true }
        : null;
    });
  }
  const { ok, data } = response;
  if (ok) return { success: true, task: data.task, arrivalValidation: data.arrivalValidation };
  return { success: false, error: getErrorMessage(data, "Unable to confirm customer presence.") };
}

export async function getVisitAttempt(token, taskId) {
  const { ok, data } = await get(`/tasks/${encodeURIComponent(taskId)}/visit-attempt`, token);
  if (!ok) throw new Error(getErrorMessage(data, 'Unable to load visit proof.'));
  return data.attempt;
}

export async function submitVisitAttempt(token, taskId, input) {
  const path = `/tasks/${encodeURIComponent(taskId)}/visit-attempt`;
  let response;
  try {
    response = await request("PATCH", path, {
      token,
      body: input,
      timeoutMs: OPERATIONAL_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    return reconcileUncertainMutation(path, error, async () => {
      const { ok, data } = await request("GET", path, {
        token,
        timeoutMs: REQUEST_TIMEOUT_MS,
        maxAttempts: 1,
      });
      const attempt = ok ? data.attempt : null;
      const sameArrival = String(attempt?.checkedInAt || "") === String(input?.checkedInAt || "");
      const sameOutcome = String(attempt?.outcome || "") === String(input?.outcome || "");
      return attempt && sameArrival && sameOutcome
        ? { ...attempt, reconciled: true }
        : null;
    });
  }
  const { ok, data } = response;
  if (!ok) throw new Error(getErrorMessage(data, 'Unable to save this visit.'));
  return data.attempt;
}

export async function confirmCodCollection(token, taskId) {
  const path = `/tasks/${encodeURIComponent(taskId)}/cod-collection`;
  let response;
  try {
    response = await request("PATCH", path, {
      token,
      body: { confirmed: true },
      timeoutMs: OPERATIONAL_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    return reconcileUncertainMutation(path, error, async () => {
      const task = await fetchTaskForReconciliation(token, taskId);
      return task?.codPayment?.collectedAt
        ? { success: true, task, reconciled: true }
        : null;
    });
  }
  const { ok, data } = response;
  return ok ? { success: true, task: data.task } : { success: false, error: getErrorMessage(data, "Unable to confirm cash collection.") };
}

export async function collectServicePayment(token, taskId, payment) {
  const path = `/tasks/${encodeURIComponent(taskId)}/service-payment`;
  let response;
  try {
    response = await request("PATCH", path, {
      token,
      body: { confirmed: true, amount: payment.amount, quoteId: payment.quoteId },
      timeoutMs: OPERATIONAL_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    return reconcileUncertainMutation(path, error, async () => {
      const task = await fetchTaskForReconciliation(token, taskId);
      return task?.servicePayment?.status === "paid" || task?.servicePayment?.collectedAt
        ? { success: true, task, reconciled: true }
        : null;
    });
  }
  const { ok, data } = response;
  return ok ? { success: true } : { success: false, error: getErrorMessage(data, "Unable to confirm service payment.") };
}

export async function createMyServiceRequest(token, payload) {
  const path = "/service-requests/me";
  let response;
  try {
    response = await request("POST", path, {
      token,
      body: payload,
      timeoutMs: OPERATIONAL_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    return reconcileUncertainMutation(path, error, async () => {
      const requests = await fetchMyRequestsForReconciliation(token);
      const request = requests.find((item) =>
        payload?.idempotencyKey && String(item?.idempotencyKey || "") === String(payload.idempotencyKey));
      return request ? { success: true, request, reconciled: true } : null;
    });
  }
  const { ok, data } = response;
  if (ok) return { success: true, request: data.request };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to create service request."),
  };
}

export async function createContactMessage(token, payload) {
  const { ok, data } = await post("/contact-messages", payload, token);
  if (ok) return { success: true, message: data.message, duplicate: Boolean(data.duplicate) };
  return {
    success: false,
    error: getErrorMessage(data, "Unable to send your message."),
  };
}

export async function patchServiceRequestStatus(token, requestId, payload) {
  const path = `/service-requests/${encodeURIComponent(requestId)}/status`;
  let response;
  try {
    response = await request("PATCH", path, {
      token,
      body: payload,
      timeoutMs: OPERATIONAL_WRITE_TIMEOUT_MS,
    });
  } catch (error) {
    return reconcileUncertainMutation(path, error, async () => {
      const requests = await fetchMyRequestsForReconciliation(token);
      const request = requests.find((item) => String(item?.id || item?._id || "") === String(requestId));
      const expected = String(payload?.status || "").trim().toLowerCase();
      const actual = String(request?.status || "").trim().toLowerCase();
      return request && expected && actual === expected
        ? { success: true, request, reconciled: true }
        : null;
    });
  }
  const { ok, data } = response;
  if (ok) return { success: true, request: data.request };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to update service request."),
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function fetchNotifications(token) {
  const { ok, data } = await get("/notifications/me", token);
  if (ok) return { success: true, notifications: data.notifications || [] };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to fetch notifications."),
    notifications: [],
  };
}

export async function markNotificationRead(token, notificationId) {
  const { ok, data } = await patch(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    {},
    token,
  );
  if (ok) return { success: true, notification: data.notification };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to mark notification read."),
  };
}

export async function markAllNotificationsRead(token) {
  const { ok, data } = await patch("/notifications/me/read-all", {}, token);
  if (ok) return { success: true, modifiedCount: data.modifiedCount || 0 };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to mark notifications read."),
  };
}

export async function createWarrantyClaim(token, unitId, payload) {
  const { ok, data } = await post(
    `/warranties/units/${encodeURIComponent(unitId)}/claims`,
    payload,
    token,
  );
  if (ok) return { success: true, claim: data.claim, warranty: data.warranty };
  return {
    success: false,
    error: getErrorMessage(data, "Unable to submit the warranty claim."),
  };
}

export async function registerPushToken(token, expoPushToken) {
  const { ok, data } = await post(
    "/notifications/push-token",
    { expoPushToken },
    token,
  );
  if (ok) return {
    success: true,
    message: data.message,
    registrationVerificationToken: data.registrationVerificationToken || "",
  };
  return {
    success: false,
    error: getErrorMessage(data, "Unable to enable push notifications."),
  };
}

// ---------------------------------------------------------------------------
// AMP technician service completion
// ---------------------------------------------------------------------------

export async function fetchRecordedPartsPreparation(token, unitId) {
  const { ok, data } = await get(
    `/predictions/parts?unitId=${encodeURIComponent(unitId)}`,
    token,
  );
  if (ok) return { success: true, parts: data.parts || [], generatedAt: data.generatedAt };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to load recorded parts preparation."),
    parts: [],
  };
}

export async function completeAmpService(token, unitId, payload) {
  const { ok, data } = await post(
    `/amp/units/${encodeURIComponent(unitId)}/complete-service`,
    payload,
    token,
  );
  if (ok) {
    return {
      success: true,
      serviceHistory: data.serviceHistory,
      unit: data.unit,
      recommendation: data.recommendation,
    };
  }
  return {
    success: false,
    error: getErrorMessage(data, "Failed to complete service."),
    errors: data.errors || null,
  };
}

export async function fetchCustomerAmpUnits(token) {
  const { ok, data } = await get("/amp/customer/units", token);
  if (ok) return { success: true, units: data.units || [] };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to fetch installed AC units."),
    units: [],
  };
}

export async function generateAmpReport(token, { unitId, reportType = "predictive_maintenance" } = {}) {
  const { ok, data } = await request("POST", "/ai/amp-report", {
    body: { unitId, reportType }, token, timeoutMs: AMP_REPORT_TIMEOUT_MS,
  });
  if (ok) return { success: true, report: data.report || null, provider: data.provider || "" };
  return {
    success: false,
    error: getErrorMessage(data, "Unable to generate AMP report."),
    report: null,
  };
}

export async function sendCustomerChatMessage(token, { message, history = [], currentPage = "" } = {}) {
  const { ok, data } = await request("POST", "/ai/customer-chat", {
    body: { message, history, currentPage },
    token,
    timeoutMs: CUSTOMER_CHAT_TIMEOUT_MS,
  });
  if (ok && data?.reply?.text) {
    return {
      success: true,
      reply: data.reply,
      provider: data.provider || "",
    };
  }
  return {
    success: false,
    error: getErrorMessage(data, "The AEROPULSE assistant is unavailable right now."),
  };
}

export async function updateAmpRoomSize(token, unitId, roomSizeSqm) {
  const { ok, data } = await patch(`/amp/units/${encodeURIComponent(unitId)}/room-size`, { roomSizeSqm }, token);
  if (ok) return { success: true, unit: data.unit, recommendation: data.recommendation };
  return { success: false, error: getErrorMessage(data, "Unable to update room size.") };
}
