import {
  Bell,
  Fingerprint,
  Globe,
  MapPin,
  ShieldCheck,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { translateText } from "../../utils/customerI18n";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import {
  BQ_COLORS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";
import AccountSettings from "./AccountSettings";
import GeneralProfileSettings from "./GeneralProfileSettings";
import MyAddressesSettings from "./MyAddressesSettings";
import NotificationSettings from "./NotificationSettings";
import PreferencesSettings from "./PreferencesSettings";
import PrivacySettings from "./PrivacySettings";
import "./Settings.css";

const SETTINGS_TABS = [
  { id: "profile", title: "Profile", icon: UserCircle },
  { id: "preferences", title: "Preferences", icon: Globe },
  { id: "addresses", title: "My Addresses", icon: MapPin },
  { id: "privacy", title: "Privacy", icon: ShieldCheck },
  { id: "notifications", title: "Notifications", icon: Bell },
  { id: "security", title: "Security", icon: Fingerprint },
];

function Settings() {
  const {
    user,
    updateProfile,
    updatePreferences,
    updatePrivacy,
    updateNotifications,
    updateSettings,
    requestPasswordChangeEmail,
    deleteAccount,
    logout,
  } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = SETTINGS_TABS.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : "profile";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (SETTINGS_TABS.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const formattedUser = useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      name:
        user.name ||
        `${user.name_first || ""} ${user.name_last || ""}`.trim() ||
        user.email?.split("@")[0] ||
        "User",
      fullName:
        user.name || `${user.name_first || ""} ${user.name_last || ""}`.trim(),
      username: user.username || "",
      role: user.role || "customer",
      preferences: user.preferences || {},
      privacy: user.privacy || {},
      notifications: user.notifications || {},
    };
  }, [user]);

  const language = formattedUser?.preferences?.language || "English";
  const t = (text) => translateText(text, language);

  const pushToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2400);
  };

  const callWithToast = async (action, successMessage) => {
    try {
      const result = await action();
      pushToast(successMessage, "success");
      return result;
    } catch (error) {
      pushToast(error.message || "Unable to save changes.", "error");
      throw error;
    }
  };

  const handleUpdateProfile = (payload) =>
    callWithToast(() => updateProfile(payload), "Profile updated.");

  const handleUpdatePreferences = (payload) =>
    callWithToast(() => updatePreferences(payload), "Preferences saved.");

  const handleUpdatePrivacy = (payload) =>
    callWithToast(() => updatePrivacy(payload), "Privacy settings saved.");

  const handleUpdateNotifications = (payload) =>
    callWithToast(
      () => updateNotifications(payload),
      "Notification settings saved.",
    );

  const handleBulkUpdateSettings = (payload) =>
    callWithToast(() => updateSettings(payload), "Settings saved.");

  const handleDeleteAccount = (payload) =>
    callWithToast(async () => {
      await deleteAccount(payload);
      navigate("/login", { replace: true });
    }, "Account deleted successfully.");

  const handleRequestPasswordChangeEmail = () =>
    callWithToast(
      () => requestPasswordChangeEmail(),
      "Password change link sent to your email.",
    );

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/home");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      logout();
      navigate("/home", { replace: true });
    }
  };

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title={t("Account Settings")}
        leftAction="back"
        onLeftAction={handleBack}
      />

      <BoutiqueBox
        direction="row"
        flex={1}
        width="100%"
        padding="40px 24px"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
        className="settings-layout"
      >
        {/* NAV SIDEBAR */}
        <BoutiqueBox
          tag="aside"
          width={320}
          padding="0 32px 0 0"
          className="settings-sidebar"
        >
          <BoutiqueStack gap={32}>
            <BoutiqueBox direction="row" align="center" gap={16}>
              <BoutiqueBox
                width={56}
                height={56}
                background={BQ_COLORS.bgAlt}
                align="center"
                justify="center"
                style={{
                  borderRadius: "16px",
                  color: BQ_COLORS.brand,
                  border: `1px solid ${BQ_COLORS.border}`,
                }}
              >
                <BoutiqueText weight={900} size="20px">
                  {(formattedUser?.name || "U").charAt(0).toUpperCase()}
                </BoutiqueText>
              </BoutiqueBox>
              <BoutiqueStack gap={0}>
                <BoutiqueText weight={800} size="16px">
                  {formattedUser?.name}
                </BoutiqueText>
                <BoutiqueText size="12px" color={BQ_COLORS.inkMuted}>
                  {formattedUser?.email}
                </BoutiqueText>
              </BoutiqueStack>
            </BoutiqueBox>

            <BoutiqueStack gap={8} tag="nav">
              {SETTINGS_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`bq-nav-item ${isActive ? "active" : ""}`}
                    onClick={() => selectTab(tab.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "16px 20px",
                      border: "none",
                      background: isActive ? "white" : "transparent",
                      color: isActive ? BQ_COLORS.brand : BQ_COLORS.inkMuted,
                      borderRadius: BQ_GEOMETRY.radiusMd,
                      fontWeight: isActive ? 700 : 600,
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      boxShadow: isActive ? BQ_SHADOWS.soft : "none",
                      textAlign: "left",
                    }}
                  >
                    <tab.icon size={20} weight={isActive ? "fill" : "bold"} />
                    <span>{t(tab.title)}</span>
                  </button>
                );
              })}
            </BoutiqueStack>

            <BoutiqueBox
              padding="32px 0 0"
              style={{ borderTop: `1px solid ${BQ_COLORS.border}` }}
            >
              <BoutiqueButton
                variant="cancel"
                size="sm"
                fullWidth
                onClick={handleLogout}
              >
                <SignOut size={18} weight="bold" /> {t("Logout")}
              </BoutiqueButton>
            </BoutiqueBox>
          </BoutiqueStack>
        </BoutiqueBox>

        {/* CONTENT AREA */}
        <BoutiqueBox flex={1} className="settings-panel">
          <BoutiqueStack gap={24}>
            {activeTab === "profile" && (
              <GeneralProfileSettings
                user={formattedUser}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
            {activeTab === "preferences" && (
              <PreferencesSettings
                user={formattedUser}
                onUpdatePreferences={handleUpdatePreferences}
                onUpdateSettings={handleBulkUpdateSettings}
              />
            )}
            {activeTab === "privacy" && (
              <PrivacySettings
                user={formattedUser}
                onUpdatePrivacy={handleUpdatePrivacy}
                onUpdateSettings={handleBulkUpdateSettings}
              />
            )}
            {activeTab === "notifications" && (
              <NotificationSettings
                user={formattedUser}
                onUpdateNotifications={handleUpdateNotifications}
                onUpdateSettings={handleBulkUpdateSettings}
              />
            )}
            {activeTab === "addresses" && (
              <MyAddressesSettings user={formattedUser} />
            )}
            {activeTab === "security" && (
              <AccountSettings
                user={formattedUser}
                onRequestPasswordChangeEmail={handleRequestPasswordChangeEmail}
                onDeleteAccount={handleDeleteAccount}
              />
            )}
          </BoutiqueStack>
        </BoutiqueBox>
      </BoutiqueBox>

      {toast && (
        <BoutiqueBox
          padding="12px 24px"
          background={
            toast.type === "error" ? BQ_COLORS.danger : BQ_COLORS.brand
          }
          color="white"
          style={{
            position: "fixed",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            borderRadius: "50px",
            boxShadow: BQ_SHADOWS.float,
            zIndex: 10000,
          }}
          className="bq-slide-up"
        >
          <BoutiqueText weight={700} color="white">
            {toast.message}
          </BoutiqueText>
        </BoutiqueBox>
      )}

      <BoutiqueFooter />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-nav-item:hover:not(.active) { color: ${BQ_COLORS.brand} !important; background: rgba(0,0,0,0.02) !important; }
        @media (max-width: 900px) {
          .settings-layout { flex-direction: column !important; }
          .settings-sidebar { width: 100% !important; padding: 0 0 40px 0 !important; }
        }
      `,
        }}
      />
    </BoutiqueScreen>
  );
}

export default Settings;
