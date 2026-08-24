// app/(auth)/recover/factor/2.jsx
// Recovery code entry — consumes a single-use 12-character recovery code.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import TextField from "../../../../components/ui/TextField";
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import { COLORS, SPACING } from "../../../../constants/theme";
import { consumeRecoveryCode } from "../../../../services/customerSecurityService";
import { normalizeEmail } from "../../../../utils/authValidation";

export default function RecoverCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = Array.isArray(params.email)
    ? params.email[0]
    : params.email || "";

  const [recoveryCode, setRecoveryCode] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const code = recoveryCode.trim().toUpperCase();
    if (!code) {
      setErrors({ code: "Recovery code is required." });
      return;
    }
    if (code.length !== 12) {
      setErrors({ code: "Recovery codes are 12 characters long." });
      return;
    }

    setLoading(true);
    try {
      // We need the user's id to consume the code. Sign in via the API
      // using a special recovery-code flow. Since we don't have the password,
      // we use the recovery code as the credential via the API's recovery endpoint.
      // For now, look up the user by email via the forgot-password API to get their
      // id, then consume the code locally.
      //
      // Practical flow: attempt to consume the code from local storage keyed by
      // the normalised email. If successful, redirect to the authenticator reset flow.
      const result = await consumeRecoveryCode(normalizeEmail(email), code);
      if (!result.success) {
        setErrors({ code: "Invalid or already-used recovery code." });
        return;
      }

      Alert.alert(
        "Code Accepted",
        "Your recovery code has been verified. Please reset your authenticator app to regain full access.",
        [
          {
            text: "Continue",
            onPress: () =>
              router.replace({
                pathname: "/customer/oobe/reset",
              }),
          },
        ],
      );
    } catch {
      Alert.alert("Error", "Unable to verify recovery code. Please try again.");
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
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Recovery Code"
          subtitle="Enter one of your 12-character single-use recovery codes"
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
          <TextField
            label="Recovery Code"
            value={recoveryCode}
            onChangeText={(v) => {
              setRecoveryCode(
                v
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 12),
              );
              setErrors((prev) => ({ ...prev, code: "" }));
            }}
            placeholder="12-character code (e.g. AB3K9MXPQR2T)"
            error={errors.code}
            autoCapitalize="characters"
            maxLength={12}
          />
        </Card>

        <Button
          title={loading ? "Verifying..." : "Verify Recovery Code"}
          onPress={handleVerify}
          variant="primary"
          loading={loading}
          disabled={loading}
        />

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
