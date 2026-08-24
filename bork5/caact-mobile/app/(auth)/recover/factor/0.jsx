// app/(auth)/recover/factor/0.jsx
// Alias recovery — sends the user's sign-in alias to their email.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import TextField from "../../../../components/ui/TextField";
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import { forgotPassword } from "../../../../services/api";

export default function RecoverAliasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = Array.isArray(params.email)
    ? params.email[0]
    : params.email || "";

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRecover = async () => {
    setLoading(true);
    try {
      const result = await forgotPassword(email, "email");
      if (result.success) {
        setSent(true);
      } else {
        Alert.alert(
          "Recovery unavailable",
          result.error || "Unable to send a verification code to this email address.",
        );
      }
    } catch {
      Alert.alert("Error", "Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: SPACING.md,
        }}
        minBottomPadding={SPACING.xxl + 40}
      >
        <PageHeader
          title="Recover Account"
          subtitle="Receive an email verification code to reset your password"
          color={COLORS.primary}
          onBack={() => router.back()}
        />

        <Card>
          <TextField
            label="Email"
            value={email}
            onChangeText={() => {}}
            editable={false}
            style={{ color: COLORS.textMuted }}
          />
        </Card>

        {sent ? (
          <Card
            style={{
              backgroundColor: COLORS.successLight,
              borderColor: COLORS.success,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                fontWeight: FONT.bold,
                color: COLORS.success,
                marginBottom: SPACING.xs,
              }}
            >
              Verification Code Sent
            </Text>
            <Text style={{ color: COLORS.success }}>
              If the account matches, a verification code was sent to {email}.
            </Text>
          </Card>
        ) : (
          <Button
            title={loading ? "Sending..." : "Send Verification Code"}
            onPress={handleRecover}
            variant="primary"
            loading={loading}
            disabled={loading}
          />
        )}

        {sent ? (
          <Button
            title="Continue to Reset Password"
            onPress={() => router.replace({ pathname: "/recover/factor/1", params: { email } })}
            variant="primary"
          />
        ) : null}

        <TouchableOpacity
          onPress={() => router.push("/sign-in")}
          style={{ alignItems: "center", marginTop: SPACING.md }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
