// app/(auth)/login.jsx
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import PasswordField from "../../components/ui/PasswordField";
import TextField from "../../components/ui/TextField";
import KeyboardAwareScrollView from "../../components/ui/KeyboardAwareScrollView";
import { COLORS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { useOtpResendCooldown } from "../../hooks/useOtpResendCooldown";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";
import {
  hasValidationErrors,
  normalizeEmail,
  validateLoginForm,
} from "../../utils/authValidation";

export function LoginScreen() {
  const router = useRouter();
  const { login, verifyEmailLogin, resendLoginEmail } = useUserContext();
  const { t } = useInterfaceLanguage();
  const requestInFlight = useRef(false);
  const { secondsRemaining, useServerDeadline } = useOtpResendCooldown();

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
    if (requestInFlight.current) return;

    const nextErrors = challengeToken
      ? (/^\d{6}$/.test(verificationCode)
        ? {}
        : { verificationCode: "Enter the six-digit code sent to your email." })
      : validateLoginForm(form);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) return;

    requestInFlight.current = true;
    setSubmitting(true);
    try {
      const result = challengeToken
        ? await verifyEmailLogin(challengeToken, verificationCode)
        : await login(normalizeEmail(form.email), form.password);

      if (result.requiresEmailVerification) {
        setChallengeToken(result.challengeToken);
        setMaskedEmail(result.maskedEmail || "your account email");
        setVerificationCode("");
        useServerDeadline(result.resendAvailableAt, 60);
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
      setErrors(challengeToken
        ? { verificationCode: "Unable to verify the code right now." }
        : { email: "Unable to login right now.", password: "" });
    } finally {
      requestInFlight.current = false;
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
                label={t("Email or Username")}
                value={form.email}
                onChangeText={(v) => updateField("email", v)}
                placeholder={t("Email address or username")}
                error={errors.email}
                autoCapitalize="none"
              />
              <PasswordField
                label={t("Password")}
                placeholder={t("Enter your password")}
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
          <View style={{ gap: SPACING.xs, marginTop: SPACING.sm }}>
            <Button
              title={submitting ? t("Resending…") : secondsRemaining > 0 ? `${t("Resend code")} (${secondsRemaining}s)` : t("Resend code")}
              onPress={async () => {
                if (requestInFlight.current || secondsRemaining > 0) return;
                requestInFlight.current = true;
                setSubmitting(true);
                try {
                  const result = await resendLoginEmail(challengeToken);
                  if (result.challengeToken) setChallengeToken(result.challengeToken);
                  if (result.success) {
                    setVerificationCode("");
                    useServerDeadline(result.resendAvailableAt, 60);
                  } else if (result.retryAfterSeconds) {
                    useServerDeadline("", result.retryAfterSeconds);
                  }
                  setErrors(result.success ? {} : { verificationCode: result.error || "Unable to resend the code." });
                } catch {
                  setErrors({ verificationCode: "Unable to resend the code right now." });
                } finally {
                  requestInFlight.current = false;
                  setSubmitting(false);
                }
              }}
              variant="secondary"
              size="sm"
              disabled={submitting || secondsRemaining > 0}
            />
            <Button
              title="I have a different account"
              onPress={() => {
                setChallengeToken("");
                setVerificationCode("");
                setMaskedEmail("");
                useServerDeadline("");
                setErrors({});
              }}
              variant="ghost"
              size="sm"
              disabled={submitting}
            />
          </View>
        ) : null}

        <Button
          title="Reset Password"
          onPress={() => router.push("/recover")}
          variant="ghost"
          size="sm"
          disabled={submitting}
          style={{ marginTop: SPACING.md }}
        />

        <Button
          title="I don't have an account"
          onPress={() => router.push("/sign-up")}
          variant="ghost"
          size="sm"
          disabled={submitting}
          style={{ marginTop: 0 }}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export default LoginScreen;
