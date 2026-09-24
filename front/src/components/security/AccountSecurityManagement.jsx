import { Fingerprint, Key } from "@phosphor-icons/react";
import { useState } from "react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

export default function AccountSecurityManagement({ user, onChangePassword }) {
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
      setMessage({ type: "error", text: "Complete all password fields." });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    if (passwords.current === passwords.next) {
      setMessage({ type: "error", text: "Choose a new password that is different from the current password." });
      return;
    }
    setSaving(true);
    try {
      const result = await onChangePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setMessage({ type: "success", text: result?.message || "Password changed successfully." });
      setEditing(false);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Unable to change your password." });
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
          <BoutiqueText variant="h2">Security</BoutiqueText>
          <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>Manage your password. Sign-ins are verified with a one-time code sent to your account email.</BoutiqueText>
        </BoutiqueStack>
      </BoutiqueBox>

      <BoutiqueBox style={{ borderTop: `1px solid ${BQ_COLORS.border}`, paddingTop: 22 }}>
        <BoutiqueStack gap={14}>
          <BoutiqueBox direction="row" align="center" justify="space-between" gap={12} wrap="wrap">
            <BoutiqueBox direction="row" align="center" gap={10}>
              <Key size={20} weight="bold" color={BQ_COLORS.brand} />
              <BoutiqueStack gap={4}>
                <BoutiqueText weight={800}>Change Password</BoutiqueText>
                <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>{usesLocalPassword ? "Update the password for this account." : "This account signs in through Google, so its password is managed by Google."}</BoutiqueText>
              </BoutiqueStack>
            </BoutiqueBox>
            {usesLocalPassword && !editing ? <BoutiqueButton type="button" variant="outline" onClick={() => { setEditing(true); setMessage(null); }}>Change Password</BoutiqueButton> : null}
          </BoutiqueBox>
          {message ? <BoutiqueText role="status" color={message.type === "error" ? BQ_COLORS.danger : BQ_COLORS.success} weight={700}>{message.text}</BoutiqueText> : null}
          {usesLocalPassword && editing ? (
            <form onSubmit={submitPassword}>
              <BoutiqueStack gap={14}>
                <BoutiqueInput label="Current Password" aria-label="Current Password" type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => updatePassword("current", event.target.value)} />
                <BoutiqueInput label="New Password" aria-label="New Password" type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => updatePassword("next", event.target.value)} hint="Use 8–25 characters with uppercase, lowercase, a number, and a symbol." />
                <BoutiqueInput label="Confirm New Password" aria-label="Confirm New Password" type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => updatePassword("confirm", event.target.value)} />
                <BoutiqueBox direction="row" gap={10} wrap="wrap">
                  <BoutiqueButton type="submit" loading={saving}>Save New Password</BoutiqueButton>
                  <BoutiqueButton type="button" variant="outline" onClick={() => { setEditing(false); setPasswords({ current: "", next: "", confirm: "" }); setMessage(null); }}>Cancel</BoutiqueButton>
                </BoutiqueBox>
              </BoutiqueStack>
            </form>
          ) : null}
        </BoutiqueStack>
      </BoutiqueBox>
    </BoutiqueStack>
  );
}
