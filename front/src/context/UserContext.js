import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest } from "../config/api";
import { ACTIVE_BRANCH_KEY } from "../domain/branches/branches";
import {
  getAuthSessionItem,
  removeAuthSessionItem,
  setAuthSessionItem,
} from "../utils/authSession";

const UserContext = createContext();
const ACTIVE_ACCOUNT_SESSION_KEY = "activeAccountSession";

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

const saveSession = (token, user, branch = "") => {
  setAuthSessionItem("accessToken", token);
  setAuthSessionItem("currentUser", JSON.stringify(user));
  setAuthSessionItem("userRole", user.role);
  if (branch) {
    setAuthSessionItem(ACTIVE_BRANCH_KEY, branch);
  } else {
    removeAuthSessionItem(ACTIVE_BRANCH_KEY);
  }
};

const clearSession = () => {
  removeAuthSessionItem("accessToken");
  removeAuthSessionItem("currentUser");
  removeAuthSessionItem("userRole");
  removeAuthSessionItem(ACTIVE_BRANCH_KEY);
  removeAuthSessionItem(ACTIVE_ACCOUNT_SESSION_KEY);
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState(
    "Please log in to access this feature.",
  );

  const forceLogout = useCallback(() => {
    clearSession();
    setUser(null);
    setUserRole(null);
    setCurrentSession(null);
    setIsAuthenticated(false);
  }, []);

  // Theme is strictly light-mode-only
  const currentTheme = "light";

  // Language derived from browser locale or user preference
  const currentLanguage = useMemo(() => {
    if (user?.preferences?.language) return user.preferences.language;
    const locale = navigator.language || "en-US";
    return locale.startsWith("fil") ? "Filipino" : "English";
  }, [user?.preferences?.language]);

  useEffect(() => {
    const bootstrap = async () => {
      const token = getAuthSessionItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await apiRequest("/auth/me");
        setUser(result.user);
        setUserRole(result.user.role || null);
        setCurrentSession(result.user);
        setIsAuthenticated(true);
        setAuthSessionItem("currentUser", JSON.stringify(result.user));
        const activeBranch =
          result.user?.activeBranch || result.user?.assignedBranch || "";
        if (activeBranch) {
          setAuthSessionItem(ACTIVE_BRANCH_KEY, activeBranch);
        } else {
          removeAuthSessionItem(ACTIVE_BRANCH_KEY);
        }
      } catch (_error) {
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const handler = () => {
      forceLogout();
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [forceLogout]);

  useEffect(() => {
    // Enforce light theme attributes
    document.body.classList.remove("dark-mode");
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  useEffect(() => {
    document.documentElement.lang =
      currentLanguage === "Filipino" ? "fil" : "en";
    document.documentElement.setAttribute("data-language", currentLanguage);
  }, [currentLanguage]);

  const login = async (identifier, password) => {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    const userBranch =
      result.user?.activeBranch || result.user?.assignedBranch || "";
    saveSession(result.token, result.user, userBranch);
    setUser(result.user);
    setUserRole(result.user.role || null);
    setCurrentSession(result.user);
    setIsAuthenticated(true);

    return result.user;
  };

  const register = async (userData) => {
    const result = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    const userBranch =
      result.user?.activeBranch || result.user?.assignedBranch || "";
    saveSession(result.token, result.user, userBranch);
    setUser(result.user);
    setUserRole(result.user.role || null);
    setCurrentSession(result.user);
    setIsAuthenticated(true);
    return result.user;
  };

  const logout = () => {
    removeAuthSessionItem(ACTIVE_ACCOUNT_SESSION_KEY);
    forceLogout();
  };

  const updateProfile = async (updatedData) => {
    const result = await apiRequest("/users/profile", {
      method: "PATCH",
      body: JSON.stringify(updatedData),
    });
    setUser(result.user);
    setUserRole(result.user.role || null);
    setCurrentSession(result.user);
    setAuthSessionItem("currentUser", JSON.stringify(result.user));
    return result.user;
  };

  // Address routes return the saved address list rather than a full user.
  // Keep the shared session in sync immediately so Shop, Checkout, and every
  // other customer screen use the newly selected default address.
  const synchronizeAddresses = useCallback((addresses = []) => {
    const nextAddresses = Array.isArray(addresses) ? addresses : [];
    const defaultAddress =
      nextAddresses.find((address) => address?.isDefault) ||
      nextAddresses[0] ||
      null;

    const applyAddresses = (previousUser) => {
      if (!previousUser) return previousUser;
      const nextUser = { ...previousUser, addresses: nextAddresses };
      if (defaultAddress) {
        nextUser.billingAddress = {
          ...(previousUser.billingAddress || {}),
          region: defaultAddress.region || "",
          province: defaultAddress.province || "",
          city: defaultAddress.city || "",
          barangay: defaultAddress.barangay || "",
          street: defaultAddress.street || "",
          postalCode: defaultAddress.postalCode || "",
        };
      }
      return nextUser;
    };

    setUser((previousUser) => {
      const nextUser = applyAddresses(previousUser);
      if (nextUser) {
        setAuthSessionItem("currentUser", JSON.stringify(nextUser));
      }
      return nextUser;
    });
    setCurrentSession((previousUser) => applyAddresses(previousUser));
  }, []);

  const updatePreferences = async (preferences) => {
    const result = await apiRequest("/users/preferences", {
      method: "PATCH",
      body: JSON.stringify(preferences),
    });
    setUser(result.user);
    setCurrentSession(result.user);
    setAuthSessionItem("currentUser", JSON.stringify(result.user));
    return result.user;
  };

  const updatePrivacy = async (privacy) => {
    const result = await apiRequest("/users/privacy", {
      method: "PATCH",
      body: JSON.stringify(privacy),
    });
    setUser(result.user);
    setCurrentSession(result.user);
    setAuthSessionItem("currentUser", JSON.stringify(result.user));
    return result.user;
  };

  const updateNotifications = async (notifications) => {
    const result = await apiRequest("/users/notifications", {
      method: "PATCH",
      body: JSON.stringify(notifications),
    });
    setUser(result.user);
    setCurrentSession(result.user);
    setAuthSessionItem("currentUser", JSON.stringify(result.user));
    return result.user;
  };

  const updateSettings = async (settingsPayload) => {
    const result = await apiRequest("/users/settings/update", {
      method: "PUT",
      body: JSON.stringify(settingsPayload),
    });
    setUser(result.user);
    setCurrentSession(result.user);
    setAuthSessionItem("currentUser", JSON.stringify(result.user));
    return result.user;
  };

  const changePassword = async (currentPassword, newPassword) => {
    return apiRequest("/users/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  };

  const requestPasswordChangeEmail = async () => {
    return apiRequest("/users/password/request-email", {
      method: "POST",
      body: JSON.stringify({}),
    });
  };

  const deleteAccount = async (payload = {}) => {
    const result = await apiRequest("/users/account", {
      method: "DELETE",
      body: JSON.stringify(payload),
    });
    logout();
    return result;
  };

  const showAuthRequiredPrompt = (
    message = "Please log in to access this feature.",
  ) => {
    setLoginPromptMessage(message);
    setShowLoginPrompt(true);
  };

  const hideAuthRequiredPrompt = () => {
    setShowLoginPrompt(false);
  };

  const getUserByEmail = () => null;
  const getAllUsers = () => [];
  const getUsersByRole = () => [];
  const getAllCustomers = () => [];
  const getAllAdmins = () => [];
  const hasRole = (role) => userRole === role;
  const isAdmin = () => userRole === "admin" || userRole === "superadmin";
  const isCustomer = () => userRole === "customer";

  const value = {
    user,
    userRole,
    isAuthenticated,
    loading,
    currentSession,
    currentLanguage,
    currentTheme,
    showLoginPrompt,
    loginPromptMessage,
    register,
    login,
    logout,
    updateProfile,
    synchronizeAddresses,
    updatePreferences,
    updatePrivacy,
    updateNotifications,
    updateSettings,
    changePassword,
    requestPasswordChangeEmail,
    deleteAccount,
    showAuthRequiredPrompt,
    hideAuthRequiredPrompt,
    getUserByEmail,
    getAllUsers,
    getUsersByRole,
    getAllCustomers,
    getAllAdmins,
    hasRole,
    isAdmin,
    isCustomer,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;
