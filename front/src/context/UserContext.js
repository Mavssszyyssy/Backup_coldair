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
  localStorage.setItem("accessToken", token);
  localStorage.setItem("currentUser", JSON.stringify(user));
  localStorage.setItem("userRole", user.role);
  if (branch) {
    localStorage.setItem(ACTIVE_BRANCH_KEY, branch);
  } else {
    localStorage.removeItem(ACTIVE_BRANCH_KEY);
  }
};

const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userRole");
  localStorage.removeItem(ACTIVE_BRANCH_KEY);
};

const readActiveSession = () => {
  try {
    const val = localStorage.getItem(ACTIVE_ACCOUNT_SESSION_KEY);
    return val ? JSON.parse(val) : null;
  } catch (_error) {
    return null;
  }
};

const activateSingleSession = (user) => {
  const session = {
    accountId: user?.id || user?.email || "unknown",
    email: user?.email || "",
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(ACTIVE_ACCOUNT_SESSION_KEY, JSON.stringify(session));
  return session;
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
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await apiRequest("/auth/me");
        const active = readActiveSession();
        const accountId = result.user?.id || result.user?.email || "unknown";
        if (active?.accountId && active.accountId !== accountId) {
          clearSession();
          setLoading(false);
          return;
        }
        setUser(result.user);
        setUserRole(result.user.role || null);
        setCurrentSession(result.user);
        setIsAuthenticated(true);
        localStorage.setItem("currentUser", JSON.stringify(result.user));
        const activeBranch =
          result.user?.activeBranch || result.user?.assignedBranch || "";
        if (activeBranch) {
          localStorage.setItem(ACTIVE_BRANCH_KEY, activeBranch);
        } else {
          localStorage.removeItem(ACTIVE_BRANCH_KEY);
        }
        activateSingleSession(result.user);
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
    const onStorage = (event) => {
      if (event.key !== ACTIVE_ACCOUNT_SESSION_KEY || !isAuthenticated || !user)
        return;
      const next = readActiveSession();
      const accountId = user.id || user.email || "unknown";
      if (next?.accountId && next.accountId !== accountId) {
        clearSession();
        setUser(null);
        setUserRole(null);
        setCurrentSession(null);
        setIsAuthenticated(false);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isAuthenticated, user]);

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
    activateSingleSession(result.user);
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

    return result.user;
  };

  const logout = () => {
    const active = readActiveSession();
    const accountId = user?.id || user?.email || "unknown";
    if (!active?.accountId || active.accountId === accountId) {
      localStorage.removeItem(ACTIVE_ACCOUNT_SESSION_KEY);
    }
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
    localStorage.setItem("currentUser", JSON.stringify(result.user));
    return result.user;
  };

  const updatePreferences = async (preferences) => {
    const result = await apiRequest("/users/preferences", {
      method: "PATCH",
      body: JSON.stringify(preferences),
    });
    setUser(result.user);
    setCurrentSession(result.user);
    localStorage.setItem("currentUser", JSON.stringify(result.user));
    return result.user;
  };

  const updatePrivacy = async (privacy) => {
    const result = await apiRequest("/users/privacy", {
      method: "PATCH",
      body: JSON.stringify(privacy),
    });
    setUser(result.user);
    setCurrentSession(result.user);
    localStorage.setItem("currentUser", JSON.stringify(result.user));
    return result.user;
  };

  const updateNotifications = async (notifications) => {
    const result = await apiRequest("/users/notifications", {
      method: "PATCH",
      body: JSON.stringify(notifications),
    });
    setUser(result.user);
    setCurrentSession(result.user);
    localStorage.setItem("currentUser", JSON.stringify(result.user));
    return result.user;
  };

  const updateSettings = async (settingsPayload) => {
    const result = await apiRequest("/users/settings/update", {
      method: "PUT",
      body: JSON.stringify(settingsPayload),
    });
    setUser(result.user);
    setCurrentSession(result.user);
    localStorage.setItem("currentUser", JSON.stringify(result.user));
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
