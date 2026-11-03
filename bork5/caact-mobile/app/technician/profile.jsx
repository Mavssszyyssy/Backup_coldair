import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import TechnicianScreen, {
  TechHero,
} from "../../components/technician/TechnicianScreen";
import TechButton from "../../components/technician/TechButton";
import Card from "../../components/ui/Card";
import StickyActionBar from "../../components/ui/StickyActionBar";
import TextField from "../../components/ui/TextField";
import { COLORS, FONT, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { getDisplayName } from "../../services/profileService";
import { confirmAction } from "../../utils/confirmAction";
import { canonicalizePhMobile, sanitizeLocalPhMobileInput, validateAccountPassword, validatePhone } from "../../utils/authValidation";
import PasswordField from "../../components/ui/PasswordField";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

function SettingsRow({ icon, title, subtitle, right, danger, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.74 : 1}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? title : undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 56,
        paddingVertical: SPACING.sm + 4,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: danger ? COLORS.dangerLight : COLORS.techLight,
          marginRight: SPACING.sm,
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? COLORS.danger : COLORS.tech}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: danger ? COLORS.danger : COLORS.textPrimary,
            fontWeight: FONT.black,
          }}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: FONT.sm,
              marginTop: 2,
              lineHeight: 18,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right ? <View style={{ marginLeft: SPACING.sm }}>{right}</View> : null}
    </TouchableOpacity>
  );
}

function EditAction({ onPress, label = "Edit technician profile" }) {
  return (
    <TouchableOpacity
      activeOpacity={0.74}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <Ionicons name="create-outline" size={18} color={COLORS.tech} />
    </TouchableOpacity>
  );
}

function ProfileSectionHeader({ title, description }) {
  return (
    <View style={{ paddingBottom: SPACING.sm, marginBottom: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
      <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>{title}</Text>
      {description ? <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 18, marginTop: SPACING.xs }}>{description}</Text> : null}
    </View>
  );
}

export default function TechProfile() {
  const router = useRouter();
  const { language, t, updateLanguage } = useInterfaceLanguage();
  const [savingLanguage, setSavingLanguage] = useState(false);
  const { current, logout, updateMyAccount, changeMyPassword } = useUserContext();
  const displayName = getDisplayName(current);
  const [alias, setAlias] = useState(current?.alias || "");
  const [phone, setPhone] = useState(canonicalizePhMobile(current?.phone || ""));
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);

  const selectLanguage = async (nextLanguage) => {
    if (savingLanguage || nextLanguage === language) return;
    setSavingLanguage(true);
    const result = await updateLanguage(nextLanguage);
    setSavingLanguage(false);
    if (!result.success) Alert.alert(t("Unable to save preferences."), result.error || t("Please try again."));
  };

  const handleSave = async () => {
    if (saveInFlight.current) return;
    const nextAlias = alias.trim().toLowerCase();
    if (nextAlias !== String(current?.alias || "").trim().toLowerCase() &&
      !/^[a-z0-9_.-]{3,30}$/.test(nextAlias)) {
      Alert.alert(t("Invalid username"), t("Username must be 3-30 letters, numbers, dots, underscores, or hyphens."));
      return;
    }
    const phoneError = validatePhone(phone);
    if (phoneError) {
      Alert.alert(t("Invalid contact number"), t(phoneError));
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    try {
      const normalizedPhone = canonicalizePhMobile(phone);
      const result = await updateMyAccount({ alias: nextAlias, phone: normalizedPhone });
      const ok = result.success;
      Alert.alert(
        t(ok ? "Saved" : "Not Saved"),
        t(ok ? "Profile updated." : result.error || "Profile update failed."),
      );
      if (ok) {
        setAlias(result.user?.alias ?? nextAlias);
        setPhone(canonicalizePhMobile(result.user?.phone ?? normalizedPhone));
        setPassword("");
        setIsEditing(false);
      }
    } catch (error) {
      Alert.alert(t("Not Saved"), t(error.message || "Profile update failed. Please try again."));
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (saveInFlight.current) return;
    const error = validateAccountPassword(password);
    if (!currentPassword || error || password !== confirmPassword) {
      Alert.alert(t("Check your password"), t(!currentPassword ? "Enter your current password." : error || "New passwords do not match."));
      return;
    }
    if (password === currentPassword) {
      Alert.alert(t("Check your password"), t("New password must be different from current password."));
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    try {
      const result = await changeMyPassword({ currentPassword, newPassword: password });
      if (!result.success) { Alert.alert(t("Password not changed"), t(result.error || "Please try again.")); return; }
      setCurrentPassword(""); setPassword(""); setConfirmPassword("");
      setIsChangingPassword(false);
      Alert.alert(t("Password changed"), t("Use your new password the next time you sign in."));
    } catch (error) {
      Alert.alert(t("Password not changed"), t(error.message || "Please try again."));
    } finally { saveInFlight.current = false; setSaving(false); }
  };

  const handleLogout = () =>
    confirmAction({
      title: t("Sign out?"),
      message: t("Are you sure you want to sign out of your account?"),
      confirmText: t("Sign out"),
      pendingText: t("Signing out..."),
      destructive: true,
      onConfirm: async () => {
        await logout();
        router.replace("/sign-in");
      },
    });

  return (
    <TechnicianScreen
      title={t("Account")}
      subtitle={t(isChangingPassword ? "Reset your password" : isEditing ? "Edit technician profile" : "Account, security, and sign-in settings")}
      icon="person-sharp"
      contentContainerStyle={{ paddingBottom: isEditing || isChangingPassword ? 160 : SPACING.lg }}
      stickyAction={
        isEditing || isChangingPassword ? (
          <StickyActionBar>
            <TechButton
              title={t(saving ? "Saving..." : isChangingPassword ? "Reset Password" : "Save Changes")}
              onPress={isChangingPassword ? handlePasswordSave : handleSave}
              loading={saving}
              leftIcon={
                <Ionicons name="save-sharp" size={18} color={COLORS.surface} />
              }
            />
            <TechButton
              title={t("Cancel")}
              disabled={saving}
              onPress={() => { if (saveInFlight.current) return; setIsEditing(false); setIsChangingPassword(false); setAlias(current?.alias || ""); setPhone(canonicalizePhMobile(current?.phone || "")); setPassword(""); setConfirmPassword(""); setCurrentPassword(""); }}
              variant="secondary"
            />
          </StickyActionBar>
        ) : null
      }
    >
      <TechHero
        eyebrow={t("Technician account")}
        title={displayName}
        subtitle={t("Manage your contact details, password, and sign-in session.")}
        icon="id-card-sharp"
      />

      {isChangingPassword ? <Card>
        <ProfileSectionHeader title={t("Reset Password")} description={t("Verify your current password and choose a new one.")} />
        <PasswordField label={t("Current Password")} value={currentPassword} onChangeText={setCurrentPassword} editable={!saving} />
        <PasswordField label={t("New Password")} value={password} onChangeText={setPassword} showRequirements editable={!saving} />
        <PasswordField label={t("Confirm New Password")} value={confirmPassword} onChangeText={setConfirmPassword} editable={!saving} />
      </Card> : !isEditing ? (
        <>
          <Card>
            <ProfileSectionHeader title={t("Profile details")} description={t("Review your username, contact details, and work status.")} />
            <SettingsRow
              icon="person-circle-sharp"
              title={t("Username")}
              subtitle={current?.alias || t("No username")}
              right={<EditAction onPress={() => { setAlias(current?.alias || ""); setPhone(canonicalizePhMobile(current?.phone || "")); setIsEditing(true); }} label={t("Edit technician profile")} />}
            />
            <SettingsRow icon="mail-sharp" title={t("Email")} subtitle={current?.email || t("No email")} />
            <SettingsRow
              icon="call-sharp"
              title={t("Phone")}
              subtitle={current?.phone || t("No phone on file")}
            />
            <SettingsRow
              icon="briefcase-sharp"
              title={t("Status")}
              subtitle={t(current?.status || "active")}
            />
          </Card>

          <Card>
            <ProfileSectionHeader title={t("Security & Session")} description={t("Review sign-in requirements and manage your password.")} />
            <SettingsRow
              icon="shield-checkmark-sharp"
              title={t("Email Sign-in Verification")}
              subtitle={t("After your password is accepted, verify the code sent to your email.")}
              right={
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.tech}
                />
              }
            />
            <SettingsRow
              icon="refresh-sharp"
              title={t("Reset Password")}
              subtitle={t("Verify your current password and choose a new one.")}
              onPress={() => setIsChangingPassword(true)}
              right={
                <Ionicons
                  name="chevron-forward-sharp"
                  size={18}
                  color={COLORS.textMuted}
                />
              }
            />
          </Card>
        </>
      ) : (
        <Card>
          <ProfileSectionHeader title={t("Edit technician profile")} description={t("Update your username and contact number.")} />
          <TextField translate={t} label={t("Username")} value={alias} onChangeText={setAlias} editable={!saving} />
          <TextField translate={t}
            label={t("Contact Number")}
            value={phone}
            onChangeText={(value) => setPhone((previous) => sanitizeLocalPhMobileInput(value, previous))}
            keyboardType="phone-pad"
            placeholder="09XXXXXXXXX"
            showKeyboardDone
            editable={!saving}
          />

        </Card>
      )}

      {!isEditing && !isChangingPassword ? <>
      <Card>
        <ProfileSectionHeader title={t("Account settings")} description={t("Choose how the app displays its controls.")} />
        <View style={{ paddingVertical: SPACING.sm }}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, marginBottom: SPACING.xs }}>{t("Interface language")}</Text>
          <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>{t("Choose the language used for buttons, labels, and navigation.")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {["English", "Filipino"].map((choice) => (
              <TouchableOpacity key={choice} accessibilityRole="radio" accessibilityState={{ checked: language === choice, disabled: savingLanguage }} disabled={savingLanguage} onPress={() => selectLanguage(choice)} style={{ minWidth: 112, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 10, borderWidth: 1, borderColor: language === choice ? COLORS.tech : COLORS.border, backgroundColor: language === choice ? COLORS.techLight : COLORS.surface }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, textAlign: "center" }}>{t(choice)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>
      <Card>
        <ProfileSectionHeader title={t("Session")} description={t("Sign out of this device when you are done.")} />
        <SettingsRow
          icon="log-out-sharp"
          title={t("Sign out")}
          subtitle={t("Sign out of this technician account on this device.")}
          danger
          onPress={handleLogout}
          right={
            <Ionicons
              name="chevron-forward-sharp"
              size={18}
              color={COLORS.danger}
            />
          }
        />
      </Card>
      </> : null}
    </TechnicianScreen>
  );
}
