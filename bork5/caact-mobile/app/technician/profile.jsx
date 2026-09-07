import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { canonicalizePhMobile, sanitizePhMobileInput, validateAccountPassword, validatePhone } from "../../utils/authValidation";

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
        paddingVertical: SPACING.sm,
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
      <View style={{ flex: 1 }}>
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
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? null}
    </TouchableOpacity>
  );
}

function EditAction({ onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.74}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Edit technician profile"
      style={{
        width: 36,
        height: 36,
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

export default function TechProfile() {
  const router = useRouter();
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

  const handleSave = async () => {
    const phoneError = validatePhone(phone);
    if (phoneError) {
      Alert.alert("Invalid contact number", phoneError);
      return;
    }
    setSaving(true);
    try {
      const result = await updateMyAccount({ alias: alias.trim(), phone: canonicalizePhMobile(phone) });
      const ok = result.success;
      Alert.alert(
        ok ? "Saved" : "Not Saved",
        ok ? "Profile updated." : result.error || "Profile update failed.",
      );
      if (ok) {
        setPassword("");
        setIsEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (saving) return;
    const error = validateAccountPassword(password);
    if (!currentPassword || error || password !== confirmPassword) {
      Alert.alert("Check your password", !currentPassword ? "Enter your current password." : error || "New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const result = await changeMyPassword({ currentPassword, newPassword: password });
      if (!result.success) { Alert.alert("Password not changed", result.error || "Please try again."); return; }
      setCurrentPassword(""); setPassword(""); setConfirmPassword("");
      setIsChangingPassword(false);
      Alert.alert("Password changed", "Use your new password the next time you sign in.");
    } finally { setSaving(false); }
  };

  const handleLogout = () =>
    confirmAction({
      title: "Sign Out",
      message: "Sign out of your technician account?",
      confirmText: "Sign Out",
      destructive: true,
      onConfirm: async () => {
        await logout();
        router.replace("/sign-in");
      },
    });

  return (
    <TechnicianScreen
      title="Profile"
      subtitle={isChangingPassword ? "Change your password" : isEditing ? "Edit technician profile" : "Account, security, and sign-in settings"}
      icon="person-sharp"
      contentContainerStyle={{ paddingBottom: isEditing || isChangingPassword ? 160 : 96 }}
      stickyAction={
        isEditing || isChangingPassword ? (
          <StickyActionBar>
            <TechButton
              title={saving ? "Saving..." : "Save Changes"}
              onPress={isChangingPassword ? handlePasswordSave : handleSave}
              loading={saving}
              leftIcon={
                <Ionicons name="save-sharp" size={18} color={COLORS.surface} />
              }
            />
            <TechButton
              title="Cancel"
              onPress={() => { setIsEditing(false); setIsChangingPassword(false); setPassword(""); setConfirmPassword(""); setCurrentPassword(""); }}
              variant="secondary"
            />
          </StickyActionBar>
        ) : null
      }
    >
      <TechHero
        eyebrow="Account Settings"
        title={displayName}
        subtitle="Manage your contact details, password, and sign-in session."
        icon="id-card-sharp"
      />

      {isChangingPassword ? <Card>
        <TextField label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry maxLength={25} />
        <TextField helperText="8–25 characters: uppercase, lowercase, number, and @ $ ! % * ? &." label="New Password" value={password} onChangeText={setPassword} secureTextEntry maxLength={25} />
        <TextField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry maxLength={25} />
      </Card> : !isEditing ? (
        <>
          <Card>
            <SettingsRow
              icon="person-circle-sharp"
              title={displayName}
              subtitle={`${current?.alias || "No alias"} - ${current?.email || "No email"}`}
              right={<EditAction onPress={() => setIsEditing(true)} />}
            />
            <SettingsRow
              icon="call-sharp"
              title="Phone"
              subtitle={current?.phone || "No phone on file"}
              right={
                <Ionicons
                  name="checkmark-circle-sharp"
                  size={20}
                  color={COLORS.success}
                />
              }
            />
            <SettingsRow
              icon="briefcase-sharp"
              title="Status"
              subtitle={current?.status || "active"}
            />
          </Card>

          <Card>
            <SettingsRow
              icon="shield-checkmark-sharp"
              title="Account Security"
              subtitle="Sign in with your technician username and password."
              right={
                <Ionicons
                  name="checkmark-circle-sharp"
                  size={20}
                  color={COLORS.success}
                />
              }
            />
            <SettingsRow
              icon="refresh-sharp"
              title="Change Password"
              subtitle="Verify your current password and choose a new one."
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
          <TextField label="Sign-in Alias" value={alias} onChangeText={setAlias} />
          <TextField
            label="Contact Number"
            value={phone}
            onChangeText={(value) => setPhone(sanitizePhMobileInput(value))}
            keyboardType="phone-pad"
            placeholder="09XXXXXXXXX"
            maxLength={12}
          />

        </Card>
      )}

      <Card>
        <SettingsRow
          icon="log-out-sharp"
          title="Sign Out"
          subtitle="Sign out of this technician account on this device."
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
    </TechnicianScreen>
  );
}
