import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import KeyboardAwareScrollView from "../../../components/ui/KeyboardAwareScrollView";
import PageHeader from "../../../components/ui/PageHeader";
import { COLORS, SPACING } from "../../../constants/theme";
import { useUserContext } from "../../../context/UserContext";

export default function CustomerOobeScreen() {
  const router = useRouter();
  const { current, updateMyAccount } = useUserContext();
  const [saving, setSaving] = useState(false);

  const finishOnboarding = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (!current?.customerOnboardedAt) {
        const result = await updateMyAccount({ customer_onboarded_at: new Date().toISOString() });
        if (!result.success || !result.user?.customerOnboardedAt) throw new Error(result.error || "Unable to finish account setup.");
      }
      router.replace("/customer/home");
    } catch (error) {
      Alert.alert("Setup not completed", error.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: SPACING.md }}>
        <PageHeader title="Account Ready" subtitle="Your email address has been verified" color={COLORS.primary} />
        <Card>
          <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: "800", marginBottom: SPACING.sm }}>Welcome to Cold Air ACT</Text>
          <Text style={{ color: COLORS.textSecondary, lineHeight: 22 }}>Your account is ready. Future sign-ins use your password followed by a one-time code sent to your account email.</Text>
        </Card>
        <Button title={saving ? "Finishing…" : "Continue"} onPress={finishOnboarding} loading={saving} disabled={saving} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
