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
import { regenerateRecoveryCodes } from "../../services/customerSecurityService";
import { getDisplayName } from "../../services/profileService";
import { confirmAction } from "../../utils/confirmAction";
import { canonicalizePhMobile, sanitizePhMobileInput, validatePassword, validatePhone } from "../../utils/authValidation";

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
  const { current, logout, updateUser } = useUserContext();
  const displayName = getDisplayName(current);
  const [alias, setAlias] = useState(current?.alias || "");
  const [phone, setPhone] = useState(canonicalizePhMobile(current?.phone || ""));
  const [password, setPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const phoneError = validatePhone(phone);
    if (phoneError) {
      Alert.alert("Invalid contact number", phoneError);
      return;
    }
    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        Alert.alert("Invalid password", passwordError);
        return;
      }
    }
    setSaving(true);
    try {
      const ok = await updateUser({
        ...current,
        alias: alias.trim(),
        phone: canonicalizePhMobile(phone),
        password: password || undefined,
      });
      Alert.alert(
        ok ? "Saved" : "Not Saved",
        ok ? "Profile updated." : "Profile update failed.",
      );
      if (ok) {
        setPassword("");
        setIsEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshCodes = async () => {
    const codeEntries = await regenerateRecoveryCodes(current?.id);
    setRecoveryCodes(codeEntries);
    Alert.alert("Recovery Codes Refreshed", "Six new recovery codes were generated.");
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
      subtitle={isEditing ? "Edit technician profile" : "Account, security, and sign-in settings"}
      icon="person-sharp"
      contentContainerStyle={{ paddingBottom: isEditing ? 160 : 96 }}
      stickyAction={
        isEditing ? (
          <StickyActionBar>
            <TechButton
              title={saving ? "Saving..." : "Save Changes"}
              onPress={handleSave}
              loading={saving}
              leftIcon={
                <Ionicons name="save-sharp" size={18} color={COLORS.surface} />
              }
            />
            <TechButton
              title="Cancel"
              onPress={() => setIsEditing(false)}
              variant="secondary"
            />
          </StickyActionBar>
        ) : null
      }
    >
      <TechHero
        eyebrow="Account Settings"
        title={displayName}
        subtitle="Manage your contact details, recovery codes, and sign-in session."
        icon="id-card-sharp"
      />

      {!isEditing ? (
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
              subtitle="Password, authenticator app, and recovery codes protect your account."
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
              title="Generate New Recovery Codes"
              subtitle="Generate six new single-use recovery codes."
              onPress={handleRefreshCodes}
              right={
                <Ionicons
                  name="chevron-forward-sharp"
                  size={18}
                  color={COLORS.textMuted}
                />
              }
            />
            {recoveryCodes.map((entry) => (
              <Text
                key={entry.code}
                style={{
                  color: entry.used ? COLORS.textMuted : COLORS.textSecondary,
                  marginBottom: 4,
                  letterSpacing: 1,
                  textDecorationLine: entry.used ? "line-through" : "none",
                }}
              >
                {entry.code} {entry.used ? "(used)" : ""}
              </Text>
            ))}
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
          <TextField
            label="New Password"
            value={password}
            onChangeText={setPassword}
            maxLength={25}
            secureTextEntry
            placeholder="Leave blank to keep current password"
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
