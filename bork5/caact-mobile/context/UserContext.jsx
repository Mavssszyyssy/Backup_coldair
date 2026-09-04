// context/UserContext.jsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import * as api from "../services/api";
import { clearOperationalSessionCache } from "../services/sessionCache";

const TOKEN_KEY = "auth_token";
const MOBILE_ACCOUNT_ROLES = ["customer", "technician"];
const SESSION_HYDRATE_TIMEOUT_MS = 10000;

// The context value is assembled dynamically below. Keep the initial null
// state while preventing TypeScript 6 from narrowing every consumer to null.
const UserContext = createContext(/** @type {any} */ (null));

const withTimeout = (promise, timeoutMs, fallback) =>
  new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
    Promise.resolve(promise)
      .then(resolve)
      .catch(() => resolve(fallback))
      .finally(() => clearTimeout(timeoutId));
  });

// ---------------------------------------------------------------------------
// Normalisation — keeps user objects consistent across the app
// ---------------------------------------------------------------------------

function normalizeUser(user = {}) {
  if (!user) return null;

  const rawRole =
    user.role ||
    user.accountType ||
    user.account_type ||
    user.type ||
    (user.isTechnician ? "technician" : "customer");
  const role = String(rawRole).trim().toLowerCase().replace(/-/g, "_");
  const addresses = Array.isArray(user.addresses) ? user.addresses : [];
  const defaultAddress =
    addresses.find((item) => item?.isDefault) || addresses[0] || {};
  const serviceAddress =
    user.billingAddress ||
    user.billing_address ||
    user.location?.address ||
    defaultAddress ||
    {};
  const serviceStreet =
    user.thoroughfare ||
    serviceAddress.street ||
    defaultAddress.street ||
    "";
  const serviceMunicipality =
    user.municipality || serviceAddress.city || defaultAddress.city || "";
  const serviceSubmunicipality =
    user.submunicipality ||
    serviceAddress.barangay ||
    defaultAddress.barangay ||
    "";
  const serviceAddressLine =
    user.address ||
    [
      serviceStreet,
      serviceSubmunicipality,
      serviceMunicipality,
      serviceAddress.province || defaultAddress.province,
      serviceAddress.region || defaultAddress.region,
    ]
      .filter(Boolean)
      .join(", ");

  return {
    ...user,
    role,
    // legacy flag aliases kept for backwards compat with screens
    isTechnician: role === "technician",
    status: user.status || "active",
    alias: user.alias || "",
    suffix: user.suffix || "",
    defaultAddressId: defaultAddress?._id || defaultAddress?.id || "",
    address: serviceAddressLine || "",
    landmark: user.landmark || "",
    plusCode: user.plus_code || user.plusCode || "",
    plus_code: user.plus_code || user.plusCode || "",
    municipality: serviceMunicipality,
    municipalityCode: user.municipality_code || user.municipalityCode || "",
    municipality_code: user.municipality_code || user.municipalityCode || "",
    submunicipality: serviceSubmunicipality,
    submunicipalityCode:
      user.submunicipality_code || user.submunicipalityCode || "",
    submunicipality_code:
      user.submunicipality_code || user.submunicipalityCode || "",
    thoroughfare: serviceStreet,
    propertyBlockLot: user.property_block_lot || user.propertyBlockLot || "",
    property_block_lot: user.property_block_lot || user.propertyBlockLot || "",
    apartmentUnit: user.apartment_unit || user.apartmentUnit || "",
    apartment_unit: user.apartment_unit || user.apartmentUnit || "",
    customerOnboardedAt:
      user.customer_onboarded_at || user.customerOnboardedAt || "",
    customer_onboarded_at:
      user.customer_onboarded_at || user.customerOnboardedAt || "",
    technicianOnboardedAt:
      user.technician_onboarded_at || user.technicianOnboardedAt || "",
    technician_onboarded_at:
      user.technician_onboarded_at || user.technicianOnboardedAt || "",
    contactMethod: user.contact_method || user.contactMethod || "",
    contact_method: user.contact_method || user.contactMethod || "",
    messengerHandle: user.messenger_handle || user.messengerHandle || "",
    messenger_handle: user.messenger_handle || user.messengerHandle || "",
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    deliveryInstructions:
      user.delivery_instructions || user.deliveryInstructions || "",
    delivery_instructions:
      user.delivery_instructions || user.deliveryInstructions || "",
    profilePhoto: user.profile_photo || user.profilePhoto || null,
    profile_photo: user.profile_photo || user.profilePhoto || null,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [current, setCurrent] = useState(null);
  const [token, setToken] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // ── Hydrate session on mount ──────────────────────────────────────────────
  useEffect(() => {
    hydrate();
  }, []);

  const hydrate = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        const result = await withTimeout(
          api.me(storedToken),
          SESSION_HYDRATE_TIMEOUT_MS,
          { success: false },
        );
        if (result.success) {
          setToken(storedToken);
          setCurrent(normalizeUser(result.user));
        } else {
          // Token expired or invalid — clear it
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to hydrate user session:", error);
    } finally {
      setInitialized(true);
    }
  };

  // ── Persist token helper ──────────────────────────────────────────────────
  const storeToken = async (newToken) => {
    setToken(newToken);
    if (newToken) {
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────

  /**
   * Login with email + password.
   * Returns { success, user? } on success.
   * Returns { success: false, error } on failure.
   */
  const login = async (email, password) => {
    try {
      const result = await api.login(email, password);
      if (result.requiresTotp) return result;
      if (result.success) {
        const normalized = normalizeUser(result.user);
        await clearOperationalSessionCache();
        await storeToken(result.token);
        setCurrent(normalized);
        return { success: true, user: normalized };
      }
      return result;
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error. Is the server running?" };
    }
  };

  const verifyTotpLogin = async (challengeToken, code) => {
    try {
      const result = await api.verifyLoginTotp(challengeToken, code);
      if (!result.success) return result;
      const normalized = normalizeUser(result.user);
      await clearOperationalSessionCache();
      await storeToken(result.token);
      setCurrent(normalized);
      return { success: true, user: normalized };
    } catch (error) {
      return {
        success: false,
        error: error?.message || "Unable to verify the authenticator code.",
      };
    }
  };

  const recoverWithCode = async (identifier, code) => {
    try {
      const result = await api.consumeRecoveryCode(identifier, code);
      if (!result.success) return result;
      const normalized = normalizeUser(result.user);
      await clearOperationalSessionCache();
      await storeToken(result.token);
      setCurrent(normalized);
      return { ...result, user: normalized };
    } catch (error) {
      return {
        success: false,
        error: error?.message || "Unable to verify the recovery code.",
      };
    }
  };

  const verifySecuritySetup = async (code) => {
    if (!token) return { success: false, error: "Please sign in again." };
    try {
      const result = await api.verifyTotpSetup(token, code);
      if (!result.success) return result;
      if (result.token) await storeToken(result.token);
      if (result.user) setCurrent(normalizeUser(result.user));
      return result;
    } catch (error) {
      return { success: false, error: error?.message || "Unable to verify the authenticator code." };
    }
  };

  /**
   * Register a new customer account.
   * Returns { success, user? } or { success: false, error }.
   */
  const register = async (payload) => {
    try {
      const result = await api.register(payload);
      if (result.success) {
        const normalized = normalizeUser(result.user);
        await clearOperationalSessionCache();
        await storeToken(result.token);
        setCurrent(normalized);
        return { success: true, user: normalized };
      }
      return result;
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, error: "Network error. Is the server running?" };
    }
  };

  /**
   * Logout — clears session server-side and locally.
   */
  const logout = async () => {
    try {
      await api.logout(token);
    } catch {
      // Best-effort — clear locally regardless
    }
    await clearOperationalSessionCache();
    await storeToken(null);
    setCurrent(null);
    setUsers([]);
  };

  // ── User management ───────────────────────────────────────────────────

  /**
   * Load all users from the API into local state (technician list, etc.).
   */
  const fetchUsers = async () => {
    if (!token) return;
    try {
      const result = await api.fetchUsers(token);
      if (result.success) {
        setUsers(result.users.map(normalizeUser));
      }
    } catch (error) {
      console.error("fetchUsers error:", error);
    }
  };

  /**
   * Update any user's profile fields.
   * If updating own profile, routes to PATCH /profile; otherwise PATCH /users/:id.
   */
  const updateUser = async (updatedUser) => {
    if (!updatedUser?.id) return false;

    try {
      const isSelf =
        current?.id && String(current.id) === String(updatedUser.id);

      // Normalise field names to snake_case for the API
      const serviceStreet = [
        updatedUser.apartment_unit || updatedUser.apartmentUnit,
        updatedUser.property_block_lot || updatedUser.propertyBlockLot,
        updatedUser.thoroughfare,
      ]
        .filter(Boolean)
        .join(", ");
      const serviceAddress = {
        region: updatedUser.region || "",
        province: updatedUser.province || "",
        city: updatedUser.municipality || "",
        barangay: updatedUser.submunicipality || "",
        street: serviceStreet || updatedUser.address || "",
      };
      const payload = {
        name_first: updatedUser.name_first,
        name_last: updatedUser.name_last,
        suffix: updatedUser.suffix,
        alias: updatedUser.alias,
        phone: updatedUser.phone,
        address: updatedUser.address,
        municipality: updatedUser.municipality,
        municipality_code:
          updatedUser.municipality_code || updatedUser.municipalityCode,
        submunicipality: updatedUser.submunicipality,
        submunicipality_code:
          updatedUser.submunicipality_code || updatedUser.submunicipalityCode,
        thoroughfare: updatedUser.thoroughfare,
        property_block_lot:
          updatedUser.property_block_lot || updatedUser.propertyBlockLot,
        apartment_unit: updatedUser.apartment_unit || updatedUser.apartmentUnit,
        customer_onboarded_at:
          updatedUser.customer_onboarded_at || updatedUser.customerOnboardedAt,
        technician_onboarded_at:
          updatedUser.technician_onboarded_at ||
          updatedUser.technicianOnboardedAt,
        landmark: updatedUser.landmark,
        plus_code: updatedUser.plus_code || updatedUser.plusCode,
        contact_method: updatedUser.contact_method || updatedUser.contactMethod,
        messenger_handle:
          updatedUser.messenger_handle || updatedUser.messengerHandle,
        latitude: updatedUser.latitude ?? null,
        longitude: updatedUser.longitude ?? null,
        delivery_instructions:
          updatedUser.delivery_instructions || updatedUser.deliveryInstructions,
        profile_photo: updatedUser.profile_photo || updatedUser.profilePhoto,
        billingAddress: serviceAddress,
        addresses: [
          {
            label: "Service Address",
            type: "home",
            name:
              updatedUser.name ||
              [updatedUser.name_first, updatedUser.name_last]
                .filter(Boolean)
                .join(" "),
            phone: updatedUser.phone || "",
            ...serviceAddress,
            postalCode: updatedUser.postalCode || "",
            isDefault: true,
          },
        ],
        password: updatedUser.password,
      };

      const result = isSelf
        ? await api.updateProfile(token, payload)
        : await api.updateUser(token, updatedUser.id, payload);

      if (result.success) {
        const normalized = normalizeUser(result.user);
        setUsers((prev) =>
          prev.map((u) =>
            String(u.id) === String(normalized.id) ? normalized : u,
          ),
        );
        if (isSelf) setCurrent(normalized);
        return true;
      }
      return false;
    } catch (error) {
      console.error("updateUser error:", error);
      return false;
    }
  };

  // Saved addresses are a first-class checkout resource. Refresh the full
  // session after each mutation so the selected address and backend-resolved
  // branch change together everywhere in the app.
  const refreshCurrentUser = async () => {
    if (!token) return { success: false, error: "Please sign in again." };
    try {
      const result = await api.me(token);
      if (!result.success || !result.user) {
        return { success: false, error: result.error || "Unable to refresh your account." };
      }
      const normalized = normalizeUser(result.user);
      setCurrent(normalized);
      return { success: true, user: normalized };
    } catch (error) {
      return { success: false, error: error?.message || "Unable to refresh your account." };
    }
  };

  const updateMyAccount = async (payload) => {
    if (!token) return { success: false, error: "Please sign in again." };
    try {
      const result = await api.updateProfile(token, payload);
      if (!result.success || !result.user) return result;
      const normalized = normalizeUser(result.user);
      setCurrent(normalized);
      return { success: true, user: normalized };
    } catch (error) {
      return { success: false, error: error?.message || "Unable to update your account." };
    }
  };

  const completeTechnicianOnboarding = async (payload) => {
    if (!token) return { success: false, error: "Please sign in again." };
    try {
      const result = await api.completeTechnicianOnboarding(token, payload);
      if (!result.success || !result.user) return result;
      const normalized = normalizeUser(result.user);
      setCurrent(normalized);
      setUsers((prev) =>
        prev.map((user) =>
          String(user.id) === String(normalized.id) ? normalized : user,
        ),
      );
      return { ...result, user: normalized };
    } catch (error) {
      return {
        success: false,
        error: error?.message || "Unable to complete technician onboarding.",
      };
    }
  };

  const saveDeliveryAddress = async (address, addressId = "") => {
    if (!token) return { success: false, error: "Please sign in again." };
    try {
      const result = addressId
        ? await api.updateAddress(token, addressId, address)
        : await api.addAddress(token, address);
      if (!result.success) return result;
      const refreshed = await refreshCurrentUser();
      return refreshed.success ? { success: true, user: refreshed.user } : refreshed;
    } catch (error) {
      return { success: false, error: error?.message || "Unable to save the delivery address." };
    }
  };

  const deleteDeliveryAddress = async (addressId) => {
    if (!token) return { success: false, error: "Please sign in again." };
    try {
      const result = await api.removeAddress(token, addressId);
      if (!result.success) return result;
      const refreshed = await refreshCurrentUser();
      return refreshed.success ? { success: true, user: refreshed.user } : refreshed;
    } catch (error) {
      return { success: false, error: error?.message || "Unable to delete the delivery address." };
    }
  };

  const makeDefaultDeliveryAddress = async (addressId) => {
    if (!token) return { success: false, error: "Please sign in again." };
    try {
      const result = await api.setDefaultAddress(token, addressId);
      if (!result.success) return result;
      const refreshed = await refreshCurrentUser();
      return refreshed.success ? { success: true, user: refreshed.user } : refreshed;
    } catch (error) {
      return { success: false, error: error?.message || "Unable to update the default address." };
    }
  };

  /**
   * Update just the profile photo for a user.
   */
  const updateProfilePhoto = async (userId, uri) => {
    return updateUser({ id: userId, profilePhoto: uri });
  };

  const removeProfilePhoto = async (userId) => {
    return updateUser({ id: userId, profilePhoto: null });
  };

  // ── Routing helper ────────────────────────────────────────────────────────

  // Returns the expo-router href for a user's home screen.
  const resolveHomeRoute = (user) => {
    if (!user) return "/sign-in";
    const normalized = normalizeUser(user);
    if (normalized.security?.totpResetRequired) {
      return normalized.role === "technician"
        ? "/technician/oobe/reset"
        : "/customer/oobe/reset";
    }
    if (String(normalized.status || "active").toLowerCase() !== "active") {
      return "/sign-in";
    }
    if (!MOBILE_ACCOUNT_ROLES.includes(normalized.role)) return "/manager";
    switch (normalized.role) {
      case "technician":
        if (!normalized.technicianOnboardedAt) return "/technician/oobe";
        return "/technician";
      default:
        if (!normalized.customerOnboardedAt) return "/customer/oobe";
        return "/customer/home";
    }
  };

  // ── Context value ─────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      users,
      current,
      token,
      initialized,

      // Auth
      login,
      verifyTotpLogin,
      recoverWithCode,
      verifySecuritySetup,
      register,
      logout,

      // User management
      fetchUsers,
      updateUser,
      updateProfilePhoto,
      removeProfilePhoto,
      refreshCurrentUser,
      updateMyAccount,
      completeTechnicianOnboarding,
      saveDeliveryAddress,
      deleteDeliveryAddress,
      makeDefaultDeliveryAddress,

      // Routing
      resolveHomeRoute,

    }),
    [users, current, token, initialized],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within UserProvider");
  }
  return context;
}
