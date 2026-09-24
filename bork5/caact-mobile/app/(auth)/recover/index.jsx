// app/(auth)/recover/index.jsx
// Email recovery begins here and is available to every account role.
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import PageHeader from "../../../components/ui/PageHeader";
import TextField from "../../../components/ui/TextField";
import KeyboardAwareScrollView from "../../../components/ui/KeyboardAwareScrollView";
import { COLORS, SPACING } from "../../../constants/theme";
import { validateEmail } from "../../../utils/authValidation";

export default function RecoverScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    const nextErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = "Email or account login ID is required.";
    } else if (identifier.includes("@")) {
      const emailError = validateEmail(identifier);
      if (emailError) nextErrors.identifier = emailError;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // The backend sends the reset OTP through its configured email provider
    // channel.  Go directly to the working code-and-password step.
    router.push({
      pathname: "/recover/factor/1",
      params: { identifier: identifier.trim().toLowerCase() },
    });
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
          subtitle="Use your registered email or unique account login ID"
          color={COLORS.primary}
          onBack={() => router.push("/sign-in")}
        />

        <Card>
          <TextField
            label="Email or Account Login ID"
            value={identifier}
            onChangeText={(v) => {
              setIdentifier(v);
              setErrors((prev) => ({ ...prev, identifier: "" }));
            }}
            placeholder="you@example.com or tech.cavite.name"
            error={errors.identifier}
            autoCapitalize="none"
          />
        </Card>

        <Button title="Continue" onPress={handleSubmit} variant="primary" />

        <TouchableOpacity
          onPress={() => router.push("/recover/factor/2")}
          style={{ alignItems: "center", marginTop: SPACING.md }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
            Use a Recovery Code Instead
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/sign-in")}
          style={{ alignItems: "center", marginTop: SPACING.sm }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
