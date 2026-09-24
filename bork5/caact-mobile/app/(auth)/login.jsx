// app/(auth)/login.jsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import PasswordField from "../../components/ui/PasswordField";
import TextField from "../../components/ui/TextField";
import KeyboardAwareScrollView from "../../components/ui/KeyboardAwareScrollView";
import { COLORS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import {
  hasValidationErrors,
  normalizeEmail,
  validateLoginForm,
} from "../../utils/authValidation";

export function LoginScreen() {
  const router = useRouter();
  const { login, verifyEmailLogin, resendLoginEmail } = useUserContext();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleLogin = async () => {
    if (submitting) return;

    const nextErrors = challengeToken
      ? (/^\d{6}$/.test(verificationCode)
        ? {}
        : { verificationCode: "Enter the six-digit code sent to your email." })
      : validateLoginForm(form);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      const result = challengeToken
        ? await verifyEmailLogin(challengeToken, verificationCode)
        : await login(normalizeEmail(form.email), form.password);

      if (result.requiresEmailVerification) {
        setChallengeToken(result.challengeToken);
        setMaskedEmail(result.maskedEmail || "your account email");
        setErrors({});
        return;
      }

      if (result.success) {
        // AuthLayout owns the session redirect. A second replace here races
        // that guard while the native stack and cart provider are updating.
        return;
      }

      setErrors(challengeToken
        ? { verificationCode: result.error || "Incorrect or expired email code." }
        : {
          email: result.error || " ",
          password: result.error || "Check your username and password, then try again.",
        });
    } catch {
      setErrors({ email: "Unable to login right now.", password: "" });
    } finally {
      setSubmitting(false);
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
          title="Sign in"
          subtitle={challengeToken ? `Enter the code sent to ${maskedEmail}` : "Sign in to your account"}
          color={COLORS.primary}
        />

        <Card>
          {challengeToken ? (
            <TextField
              label="Email verification code"
              value={verificationCode}
              onChangeText={(value) => {
                setVerificationCode(value.replace(/\D/g, "").slice(0, 6));
                setErrors({});
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              error={errors.verificationCode}
            />
          ) : (
            <>
              <TextField
                label="Email or Alias"
                value={form.email}
                onChangeText={(v) => updateField("email", v)}
                placeholder="you@example.com or your username"
                error={errors.email}
                autoCapitalize="none"
              />
              <PasswordField
                label="Password"
                value={form.password}
                onChangeText={(v) => updateField("password", v)}
                error={errors.password}
              />
            </>
          )}
        </Card>

        <Button
          title={submitting ? "Verifying…" : challengeToken ? "Verify and Sign In" : "Sign In"}
          onPress={handleLogin}
          variant="primary"
          loading={submitting}
          disabled={submitting}
        />

        {challengeToken ? (
          <TouchableOpacity
            onPress={() => {
              setChallengeToken("");
              setVerificationCode("");
              setMaskedEmail("");
              setErrors({});
            }}
            style={{ alignItems: "center", marginTop: SPACING.sm }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
              I have a different account
            </Text>
          </TouchableOpacity>
        ) : null}

        {challengeToken ? (
          <TouchableOpacity
            onPress={async () => {
              if (submitting) return;
              setSubmitting(true);
              const result = await resendLoginEmail(challengeToken);
              if (result.challengeToken) setChallengeToken(result.challengeToken);
              setErrors(result.success ? {} : { verificationCode: result.error || "Unable to resend the code." });
              setSubmitting(false);
            }}
            style={{ alignItems: "center", marginTop: SPACING.sm }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>Resend code</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={() => router.push("/recover")}
          style={{ alignItems: "center", marginTop: SPACING.md }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/sign-up")}
          style={{ alignItems: "center", marginTop: SPACING.sm }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
            I don't have an account
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export default LoginScreen;
