import { Fingerprint, Key } from "@phosphor-icons/react";
import { useState } from "react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueBadge from "../common/boutique/BoutiqueBadge";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

export default function AccountSecurityManagement({
  user,
  onChangePassword,
  onResetAuthenticator,
  onBeginAuthenticatorSetup,
}) {
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [authenticator, setAuthenticator] = useState({ currentPassword: "", currentCode: "" });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [authenticatorMessage, setAuthenticatorMessage] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [resettingAuthenticator, setResettingAuthenticator] = useState(false);
  const usesLocalPassword = user?.authProvider !== "google";
  const totpEnabled = Boolean(user?.security?.totpEnabled);

  const updatePassword = (key, value) => {
    setPasswords((current) => ({ ...current, [key]: value }));
    setPasswordMessage(null);
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      setPasswordMessage({ type: "error", text: "Complete all password fields." });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    if (passwords.current === passwords.next) {
      setPasswordMessage({ type: "error", text: "Choose a new password that is different from the current password." });
      return;
    }
    setSavingPassword(true);
    try {
      const result = await onChangePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setPasswordMessage({ type: "success", text: result?.message || "Password changed successfully." });
      setActiveSection(null);
    } catch (error) {
      setPasswordMessage({ type: "error", text: error.message || "Unable to change your password." });
    } finally {
      setSavingPassword(false);
    }
  };

  const resetAuthenticator = async (event) => {
    event.preventDefault();
    if (usesLocalPassword && !authenticator.currentPassword) {
      setAuthenticatorMessage({ type: "error", text: "Enter your current password." });
      return;
    }
    if (totpEnabled && !/^\d{6}$/.test(authenticator.currentCode)) {
      setAuthenticatorMessage({ type: "error", text: "Enter the six-digit code from your current authenticator." });
      return;
    }
    setResettingAuthenticator(true);
    setAuthenticatorMessage(null);
    try {
      await onResetAuthenticator(authenticator);
    } catch (error) {
      setAuthenticatorMessage({ type: "error", text: error.message || "Unable to reset your authenticator." });
      setResettingAuthenticator(false);
    }
  };

  return (
    <BoutiqueStack gap={24}>
      <BoutiqueBox direction="row" align="center" gap={12}>
        <BoutiqueBox width={40} height={40} background={BQ_COLORS.bg} align="center" justify="center" style={{ borderRadius: 12, color: BQ_COLORS.brand }}>
          <Fingerprint size={20} weight="bold" />
        </BoutiqueBox>
        <BoutiqueStack gap={2}>
          <BoutiqueText variant="h2">Security</BoutiqueText>
          <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>Manage your password and authenticator without using account recovery.</BoutiqueText>
        </BoutiqueStack>
      </BoutiqueBox>

      <BoutiqueBox style={{ borderTop: `1px solid ${BQ_COLORS.border}`, paddingTop: 22 }}>
        <BoutiqueStack gap={14}>
          <BoutiqueBox direction="row" align="center" justify="space-between" gap={12} wrap="wrap">
            <BoutiqueStack gap={4}>
              <BoutiqueText weight={800}>Change Password</BoutiqueText>
              <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                {usesLocalPassword ? "Update the password for this account." : "This account signs in through Google, so its password is managed by Google."}
              </BoutiqueText>
            </BoutiqueStack>
            {usesLocalPassword && activeSection !== "password" ? (
              <BoutiqueButton
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveSection("password");
                  setPasswordMessage(null);
                }}
              >
                Change Password
              </BoutiqueButton>
            ) : null}
          </BoutiqueBox>
          {passwordMessage ? <BoutiqueText role="status" color={passwordMessage.type === "error" ? BQ_COLORS.danger : BQ_COLORS.success} weight={700}>{passwordMessage.text}</BoutiqueText> : null}
          {usesLocalPassword && activeSection === "password" ? (
            <form onSubmit={submitPassword}>
              <BoutiqueStack gap={14}>
                <BoutiqueInput label="Current Password" aria-label="Current Password" type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => updatePassword("current", event.target.value)} />
                <BoutiqueInput label="New Password" aria-label="New Password" type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => updatePassword("next", event.target.value)} hint="Use 8–25 characters with uppercase, lowercase, a number, and a symbol." />
                <BoutiqueInput label="Confirm New Password" aria-label="Confirm New Password" type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => updatePassword("confirm", event.target.value)} />
                <BoutiqueBox direction="row" gap={10} wrap="wrap">
                  <BoutiqueButton type="submit" loading={savingPassword}>Save New Password</BoutiqueButton>
                  <BoutiqueButton type="button" variant="outline" onClick={() => { setActiveSection(null); setPasswords({ current: "", next: "", confirm: "" }); setPasswordMessage(null); }}>Cancel</BoutiqueButton>
                </BoutiqueBox>
              </BoutiqueStack>
            </form>
          ) : null}
        </BoutiqueStack>
      </BoutiqueBox>

      <BoutiqueBox style={{ borderTop: `1px solid ${BQ_COLORS.border}`, paddingTop: 22 }}>
        <BoutiqueStack gap={14}>
          <BoutiqueBox direction="row" align="center" justify="space-between" gap={12} wrap="wrap">
            <BoutiqueBox direction="row" align="center" gap={10}>
              <Key size={20} weight="bold" color={BQ_COLORS.brand} />
              <BoutiqueStack gap={4}>
                <BoutiqueBox direction="row" align="center" gap={8} wrap="wrap">
                  <BoutiqueText weight={800}>Authenticator</BoutiqueText>
                  <BoutiqueBadge variant={totpEnabled ? "success" : "muted"} pill size="sm">
                    {totpEnabled ? "Enabled" : "Not set up"}
                  </BoutiqueBadge>
                </BoutiqueBox>
                <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                  {totpEnabled
                    ? "Your authenticator is active. Open the reset form only when you want to replace it."
                    : "Set up an authenticator app for this account."}
                </BoutiqueText>
              </BoutiqueStack>
            </BoutiqueBox>
            {totpEnabled && activeSection !== "authenticator" ? (
              <BoutiqueButton
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveSection("authenticator");
                  setAuthenticatorMessage(null);
                }}
              >
                Change / Reset Authenticator
              </BoutiqueButton>
            ) : null}
          </BoutiqueBox>
          {totpEnabled && activeSection === "authenticator" ? (
            <form onSubmit={resetAuthenticator}>
              <BoutiqueStack gap={14}>
                <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                  Verify your current credentials to replace the authenticator registered to this account. Other signed-in sessions and old recovery codes will be revoked.
                </BoutiqueText>
                {usesLocalPassword ? <BoutiqueInput label="Current Password" aria-label="Current Password" type="password" autoComplete="current-password" value={authenticator.currentPassword} onChange={(event) => { setAuthenticator((current) => ({ ...current, currentPassword: event.target.value })); setAuthenticatorMessage(null); }} /> : null}
                <BoutiqueInput label="Current Authenticator Code" aria-label="Current Authenticator Code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={authenticator.currentCode} onChange={(event) => { setAuthenticator((current) => ({ ...current, currentCode: event.target.value.replace(/\D/g, "").slice(0, 6) })); setAuthenticatorMessage(null); }} />
                {authenticatorMessage ? <BoutiqueText role="alert" color={BQ_COLORS.danger} weight={700}>{authenticatorMessage.text}</BoutiqueText> : null}
                <BoutiqueBox direction="row" gap={10} wrap="wrap">
                  <BoutiqueButton type="submit" variant="outline" loading={resettingAuthenticator}>Continue Authenticator Reset</BoutiqueButton>
                  <BoutiqueButton type="button" variant="outline" onClick={() => { setActiveSection(null); setAuthenticator({ currentPassword: "", currentCode: "" }); setAuthenticatorMessage(null); }}>Cancel</BoutiqueButton>
                </BoutiqueBox>
              </BoutiqueStack>
            </form>
          ) : !totpEnabled ? (
            <BoutiqueButton type="button" variant="outline" onClick={onBeginAuthenticatorSetup}>Set Up Authenticator</BoutiqueButton>
          ) : null}
        </BoutiqueStack>
      </BoutiqueBox>
    </BoutiqueStack>
  );
}
