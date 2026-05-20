// services/api.jsx
// HTTP client for the Express API server in ../../backend.
//
// Base URL selection:
//   - Expo LAN / real device -> derived from Metro host, e.g. http://192.168.1.x:5000/api
//   - Android emulator fallback -> http://10.0.2.2:5000/api
//   - Override with EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_API_BASE.

import { API_BASE } from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 10000;

async function request(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Backend request timed out.");
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  let data;
  try {
    data = await res.json();
  } catch {
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

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function checkBackendConnection() {
  try {
    const { ok, status, data } = await get("/health");
    return {
      connected: ok && data?.status === "ok",
      status,
      baseUrl: API_BASE,
      message: ok
        ? "Backend is reachable."
        : getErrorMessage(data, "Backend health check failed."),
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
 * Returns { success: false, error, locked?, secondsLeft? } on failure.
 */
export async function login(identifier, password) {
  const { ok, data } = await post("/auth/login", {
    identifier,
    email: identifier,
    password,
  });
  if (ok) return { success: true, token: data.token, user: data.user };
  return {
    success: false,
    error: getErrorMessage(data, "Login failed."),
    locked: data.locked || false,
    secondsLeft: data.seconds_left || 0,
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
  if (!token) return { success: false };
  const { ok, data } = await get("/auth/me", token);
  if (ok) return { success: true, user: data.user || data };
  return { success: false };
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function forgotPassword(email, role = "customer") {
  const { ok, data } = await post("/auth/forgot-password", { email, role });
  if (ok) return { success: true, message: data.message };
  return { success: false, error: getErrorMessage(data, "Request failed.") };
}

export async function verifyOtp(email, code) {
  const { ok, data } = await post("/auth/verify-otp", {
    email,
    code,
    action: "password_reset",
    channel: "email",
  });
  if (ok) return { success: true };
  return { success: false, error: getErrorMessage(data, "Invalid OTP.") };
}

export async function resetPassword(email, code, newPassword) {
  const { ok, data } = await post("/auth/reset-password", {
    email,
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
 * Create a new user (technician or customer).
 */
export async function createUser(token, payload) {
  const { ok, status, data } = await post("/users", payload, token);
  if (ok) return { success: true, user: data.user };
  return {
    success: false,
    error:
      status === 409
        ? "An account with this email already exists."
        : getErrorMessage(data, "Failed to create user."),
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

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

/**
 * Fetch all audit logs.
 */
export async function fetchAuditLogs(token) {
  const { ok, data } = await get("/audit-logs", token);
  if (ok) return { success: true, logs: data.logs || [] };
  return {
    success: false,
    error: data.error || "Failed to fetch logs.",
    logs: [],
  };
}

/**
 * Write an audit log entry.
 */
export async function createAuditLog(token, { action, target_id, details }) {
  const { ok, data } = await post(
    "/audit-logs",
    { action, target_id, details },
    token,
  );
  if (ok) return { success: true, id: data.id };
  return { success: false, error: data.error || "Failed to log action." };
}

// ---------------------------------------------------------------------------
// Technician tasks
// ---------------------------------------------------------------------------

export async function fetchTasks(token, { technicianId } = {}) {
  const query = technicianId ? `?technician_id=${encodeURIComponent(technicianId)}` : "";
  const { ok, data } = await get(`/tasks${query}`, token);
  if (ok) return { success: true, tasks: data.tasks || [] };
  return {
    success: false,
    error: getErrorMessage(data, "Failed to fetch tasks."),
    tasks: [],
  };
}

export async function fetchTask(token, taskId) {
  const { ok, data } = await get(`/tasks/${encodeURIComponent(taskId)}`, token);
  if (ok) return { success: true, task: data.task };
  return { success: false, error: getErrorMessage(data, "Failed to fetch task.") };
}

export async function createTask(token, payload) {
  const { ok, data } = await post("/tasks", payload, token);
  if (ok) return { success: true, task: data.task };
  return { success: false, error: getErrorMessage(data, "Failed to create task.") };
}

export async function patchTask(token, taskId, payload) {
  const { ok, data } = await patch(`/tasks/${encodeURIComponent(taskId)}`, payload, token);
  if (ok) return { success: true, task: data.task };
  return { success: false, error: getErrorMessage(data, "Failed to update task.") };
}

// ---------------------------------------------------------------------------
// Security and recovery
// ---------------------------------------------------------------------------

export async function fetchRecoveryCodes(token) {
  const { ok, data } = await get("/security/recovery-codes", token);
  if (ok) return { success: true, codes: data.codes || [] };
  return { success: false, error: data.error || "Failed to fetch recovery codes." };
}

export async function regenerateRecoveryCodes(token) {
  const { ok, data } = await post("/security/recovery-codes/regenerate", {}, token);
  if (ok) return { success: true, codes: data.codes || [] };
  return { success: false, error: data.error || "Failed to regenerate recovery codes." };
}

export async function consumeRecoveryCode(identifier, code) {
  const { ok, data } = await post("/security/recovery-codes/consume", {
    identifier,
    email: identifier,
    code,
  });
  if (ok) return { success: true };
  return { success: false, error: data.error || "Invalid recovery code." };
}

export async function fetchTotpSecret(token) {
  const { ok, data } = await get("/security/totp-secret", token);
  if (ok) return { success: true, secret: data.secret || "" };
  return { success: false, error: data.error || "Failed to fetch TOTP secret." };
}

export async function regenerateTotpSecret(token) {
  const { ok, data } = await post("/security/totp-secret/regenerate", {}, token);
  if (ok) return { success: true, secret: data.secret || "" };
  return { success: false, error: data.error || "Failed to regenerate TOTP secret." };
}
