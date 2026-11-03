import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TechButton from "../../../components/technician/TechButton";
import Card from "../../../components/ui/Card";
import PageHeader from "../../../components/ui/PageHeader";
import KeyboardAwareScrollView from "../../../components/ui/KeyboardAwareScrollView";
import TextField from "../../../components/ui/TextField";
import PasswordField from "../../../components/ui/PasswordField";
import { COLORS, SPACING } from "../../../constants/theme";
import { useUserContext } from "../../../context/UserContext";
import { requiredSetupRoute } from "../../../services/accountSetupRoute";
import { canonicalizePhMobile, sanitizeLocalPhMobileInput, validateAccountPassword, validatePhone } from "../../../utils/authValidation";
import { confirmAction } from "../../../utils/confirmAction";
import { useInterfaceLanguage } from "../../../hooks/useInterfaceLanguage";

export default function TechnicianOobe() {
  const router = useRouter();
  const { current, completeTechnicianOnboarding, logout } = useUserContext();
  const { t } = useInterfaceLanguage();
  const [phone, setPhone] = useState(canonicalizePhMobile(current?.phone || ""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (current && !current.isFirstLogin) {
    return <Redirect href={requiredSetupRoute(current) || "/technician/home"} />;
  }

  const switchAccount = () => {
    if (saving) return false;
    return confirmAction({
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
  };
  const handleSubmit = async () => {
    if (saving) return;
    setSubmitted(true);
    const error = validatePhone(phone) || validateAccountPassword(password);
    if (error) { Alert.alert(t("Check your details"), t(error)); return; }
    if (password !== confirmPassword) { Alert.alert(t("Password mismatch"), t("Please confirm the same password.")); return; }
    setSaving(true);
    try {
      const result = await completeTechnicianOnboarding({
        phone: canonicalizePhMobile(phone),
        newPassword: password,
      });
      if (!result.success) Alert.alert(t("Setup not completed"), t(result.error || "Please try again."));
      // The updated account state selects the destination; do not race a second
      // navigation against the authenticated layout.
    } catch (error) {
      Alert.alert(t("Setup not completed"), t(error.message || "Please try again."));
    } finally { setSaving(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md }} minBottomPadding={128}>
      <PageHeader title={t("Technician Setup")} subtitle={t("Confirm your contact number and replace your initial password")} onBack={switchAccount} />
      <Card>
        <TextField translate={t} label={t("Username")} value={current?.username || current?.alias || ""} editable={false} />
        <TextField translate={t} label={t("Contact Number")} value={phone} onChangeText={(value) => setPhone((previous) => sanitizeLocalPhMobileInput(value, previous))} keyboardType="phone-pad" editable={!saving} showKeyboardDone
          error={submitted ? t(validatePhone(phone)) : ""} />
        <PasswordField label={t("New Password")} value={password} onChangeText={setPassword} showRequirements editable={!saving}
          error={submitted ? t(validateAccountPassword(password)) : ""} />
        <PasswordField label={t("Confirm Password")} value={confirmPassword} onChangeText={setConfirmPassword} editable={!saving}
          error={submitted && password !== confirmPassword ? t("Passwords do not match.") : ""} />
        <TechButton title={t("Save and Continue")} onPress={handleSubmit} loading={saving} disabled={saving} />
      </Card>
      <TechButton title={t("I have a different account")} variant="ghost" onPress={switchAccount} disabled={saving} />
    </KeyboardAwareScrollView>
  </SafeAreaView>;
}
