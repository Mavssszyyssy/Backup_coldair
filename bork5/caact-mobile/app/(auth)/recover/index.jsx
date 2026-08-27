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
import { normalizeEmail, validateEmail } from "../../../utils/authValidation";

export default function RecoverScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else {
      const emailError = validateEmail(email);
      if (emailError) nextErrors.email = emailError;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // The backend sends the reset OTP through the configured Infobip email
    // channel.  Go directly to the working code-and-password step.
    router.push({
      pathname: "/recover/factor/1",
      params: { email: normalizeEmail(email) },
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
          subtitle="Use your registered email to receive an Infobip verification code"
          color={COLORS.primary}
          onBack={() => router.push("/sign-in")}
        />

        <Card>
          <TextField
            label="Email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="you@example.com"
            error={errors.email}
            keyboardType="email-address"
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
