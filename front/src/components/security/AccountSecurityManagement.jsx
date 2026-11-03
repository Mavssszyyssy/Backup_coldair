import { Fingerprint, Key } from "@phosphor-icons/react";
import { useState } from "react";
import { translateText } from "../../utils/customerI18n";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

export default function AccountSecurityManagement({ user, onChangePassword }) {
  const t = (value) => translateText(value, user?.preferences?.language);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const usesLocalPassword = user?.authProvider !== "google";

  const updatePassword = (key, value) => {
    setPasswords((current) => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      setMessage({ type: "error", text: t("Complete all password fields.") });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setMessage({ type: "error", text: t("New password and confirmation do not match.") });
      return;
    }
    if (passwords.current === passwords.next) {
      setMessage({ type: "error", text: t("Choose a new password that is different from the current password.") });
      return;
    }
    setSaving(true);
    try {
      const result = await onChangePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setMessage({ type: "success", text: t(result?.message || "Password changed successfully.") });
      setEditing(false);
    } catch (error) {
      setMessage({ type: "error", text: t(error.message || "Unable to change your password.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BoutiqueStack gap={24}>
      <BoutiqueBox direction="row" align="center" gap={12}>
        <BoutiqueBox width={40} height={40} background={BQ_COLORS.bg} align="center" justify="center" style={{ borderRadius: 12, color: BQ_COLORS.brand }}>
          <Fingerprint size={20} weight="bold" />
        </BoutiqueBox>
        <BoutiqueStack gap={2}>
          <BoutiqueText variant="h2">{t("Security")}</BoutiqueText>
          <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>{t("Manage your password. Sign-ins are verified with a one-time code sent to your account email.")}</BoutiqueText>
        </BoutiqueStack>
      </BoutiqueBox>

      <BoutiqueBox style={{ borderTop: `1px solid ${BQ_COLORS.border}`, paddingTop: 22 }}>
        <BoutiqueStack gap={14}>
          <BoutiqueBox direction="row" align="center" justify="space-between" gap={12} wrap="wrap">
            <BoutiqueBox direction="row" align="center" gap={10}>
              <Key size={20} weight="bold" color={BQ_COLORS.brand} />
              <BoutiqueStack gap={4}>
                <BoutiqueText weight={800}>{t("Change Password")}</BoutiqueText>
                <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>{t(usesLocalPassword ? "Update the password for this account." : "This account signs in through Google, so its password is managed by Google.")}</BoutiqueText>
              </BoutiqueStack>
            </BoutiqueBox>
            {usesLocalPassword && !editing ? <BoutiqueButton type="button" variant="outline" onClick={() => { setEditing(true); setMessage(null); }}>{t("Change Password")}</BoutiqueButton> : null}
          </BoutiqueBox>
          {message ? <BoutiqueText role="status" color={message.type === "error" ? BQ_COLORS.danger : BQ_COLORS.success} weight={700}>{message.text}</BoutiqueText> : null}
          {usesLocalPassword && editing ? (
            <form onSubmit={submitPassword}>
              <BoutiqueStack gap={14}>
                <BoutiqueInput label={t("Current Password")} aria-label={t("Current Password")} language={user?.preferences?.language} type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => updatePassword("current", event.target.value)} />
                <BoutiqueInput label={t("New Password")} aria-label={t("New Password")} language={user?.preferences?.language} type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => updatePassword("next", event.target.value)} hint={t("Use 8–25 characters with uppercase, lowercase, a number, and a symbol.")} />
                <BoutiqueInput label={t("Confirm New Password")} aria-label={t("Confirm New Password")} language={user?.preferences?.language} type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => updatePassword("confirm", event.target.value)} />
                <BoutiqueBox direction="row" gap={10} wrap="wrap">
                  <BoutiqueButton type="submit" loading={saving}>{t("Save New Password")}</BoutiqueButton>
                  <BoutiqueButton type="button" variant="outline" onClick={() => { setEditing(false); setPasswords({ current: "", next: "", confirm: "" }); setMessage(null); }}>{t("Cancel")}</BoutiqueButton>
                </BoutiqueBox>
              </BoutiqueStack>
            </form>
          ) : null}
        </BoutiqueStack>
      </BoutiqueBox>
    </BoutiqueStack>
  );
}
