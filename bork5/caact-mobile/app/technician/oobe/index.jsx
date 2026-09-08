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
import { canonicalizePhMobile, sanitizeLocalPhMobileInput, validateAccountPassword, validatePhone } from "../../../utils/authValidation";

export default function TechnicianOobe() {
  const router = useRouter();
  const { current, completeTechnicianOnboarding, logout } = useUserContext();
  const [phone, setPhone] = useState(canonicalizePhMobile(current?.phone || ""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (current && !current.isFirstLogin) return <Redirect href="/technician/home" />;

  const switchAccount = async () => { if (saving) return; await logout(); router.replace("/sign-in"); };
  const handleSubmit = async () => {
    if (saving) return;
    setSubmitted(true);
    const error = validatePhone(phone) || validateAccountPassword(password);
    if (error) { Alert.alert("Check your details", error); return; }
    if (password !== confirmPassword) { Alert.alert("Password mismatch", "Please confirm the same password."); return; }
    setSaving(true);
    try {
      const result = await completeTechnicianOnboarding({
        phone: canonicalizePhMobile(phone),
        newPassword: password,
      });
      if (!result.success) Alert.alert("Setup not completed", result.error || "Please try again.");
      // The updated account state selects the destination; do not race a second
      // navigation against the authenticated layout.
    } catch (error) {
      Alert.alert("Setup not completed", error.message || "Please try again.");
    } finally { setSaving(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md }} minBottomPadding={128}>
      <PageHeader title="Technician Setup" subtitle="Confirm your contact number and replace your initial password" onBack={switchAccount} />
      <Card>
        <TextField label="Username" value={current?.username || current?.alias || ""} editable={false} />
        <TextField label="Contact Number" value={phone} onChangeText={(value) => setPhone((previous) => sanitizeLocalPhMobileInput(value, previous))} keyboardType="phone-pad" editable={!saving} showKeyboardDone
          error={submitted ? validatePhone(phone) : ""} />
        <PasswordField label="New Password" value={password} onChangeText={setPassword} showRequirements editable={!saving}
          error={submitted ? validateAccountPassword(password) : ""} />
        <PasswordField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} editable={!saving}
          error={submitted && password !== confirmPassword ? "Passwords do not match." : ""} />
        <TechButton title="Save and Continue" onPress={handleSubmit} loading={saving} disabled={saving} />
      </Card>
      <TechButton title="I have a different account" variant="ghost" onPress={switchAccount} disabled={saving} />
    </KeyboardAwareScrollView>
  </SafeAreaView>;
}
