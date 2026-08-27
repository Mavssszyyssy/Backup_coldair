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
import { useUserContext } from "../../../../context/UserContext";

export default function RecoverCodeScreen() {
  const router = useRouter();
  const { recoverWithCode } = useUserContext();
  const params = useLocalSearchParams();
  const initialIdentifier = Array.isArray(params.email)
    ? params.email[0]
    : params.email || "";

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const code = recoveryCode.trim().toUpperCase();
    if (!identifier.trim()) {
      setErrors({ identifier: "Email or sign-in alias is required." });
      return;
    }
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
      const result = await recoverWithCode(identifier.trim(), code);
      if (!result.success) {
        setErrors({ code: result.error || "Invalid or already-used recovery code." });
        return;
      }

      Alert.alert(
        "Code Accepted",
        "Your recovery code has been verified. Please reset your authenticator app to regain full access.",
        [
          {
            text: "Continue",
            onPress: () => router.replace(result.recoveryDestination || "/customer/oobe/reset"),
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
            label="Email or Sign-in Alias"
            value={identifier}
            onChangeText={(value) => {
              setIdentifier(value);
              setErrors((previous) => ({ ...previous, identifier: "" }));
            }}
            placeholder="you@example.com or tech.cavite.name"
            error={errors.identifier}
            autoCapitalize="none"
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
