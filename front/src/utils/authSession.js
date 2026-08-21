import { ACTIVE_BRANCH_KEY } from "../domain/branches/branches";

// Authentication must be scoped to one browser tab/window. localStorage is
// shared by every tab at this domain, which previously made separate Admin,
// Customer, and Technician sign-ins overwrite each other during live testing.
const AUTH_SESSION_KEYS = [
  "accessToken",
  "currentUser",
  "userRole",
  ACTIVE_BRANCH_KEY,
  "activeAccountSession",
];

const canUseBrowserStorage = () => typeof window !== "undefined";

export const getAuthSessionItem = (key) => {
  if (!canUseBrowserStorage()) return null;
  const scopedValue = window.sessionStorage.getItem(key);
  if (scopedValue !== null) return scopedValue;

  // One-time seamless migration for users who were already signed in before
  // tab-isolated sessions were introduced. Removing the legacy value prevents
  // it from taking over new tabs again after this tab is logged out.
  if (AUTH_SESSION_KEYS.includes(key)) {
    const legacyValue = window.localStorage.getItem(key);
    if (legacyValue !== null) {
      window.sessionStorage.setItem(key, legacyValue);
      window.localStorage.removeItem(key);
      return legacyValue;
    }
  }
  return null;
};

export const setAuthSessionItem = (key, value) => {
  if (!canUseBrowserStorage()) return;
  window.sessionStorage.setItem(key, value);
};

export const removeAuthSessionItem = (key) => {
  if (!canUseBrowserStorage()) return;
  window.sessionStorage.removeItem(key);
  // activeAccountSession belonged to the former cross-tab single-session rule.
  if (key === "activeAccountSession") window.localStorage.removeItem(key);
};

export const clearAuthSession = () => {
  AUTH_SESSION_KEYS.forEach(removeAuthSessionItem);
};

export const getSessionActiveBranch = () => getAuthSessionItem(ACTIVE_BRANCH_KEY) || "";

