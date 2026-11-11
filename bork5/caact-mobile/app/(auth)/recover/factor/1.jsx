// app/(auth)/recover/factor/1.jsx
// Password recovery — send an email code, then enter it with a new password.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import PasswordField from "../../../../components/ui/PasswordField";
import TextField from "../../../../components/ui/TextField";
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import { useInterfaceLanguage } from "../../../../hooks/useInterfaceLanguage";
import { useOtpResendCooldown } from "../../../../hooks/useOtpResendCooldown";
import {
  forgotPassword,
  resetPassword,
} from "../../../../services/api";
import {
  validateConfirmPassword,
  validateAccountPassword,
  validatePasswordStrength,
} from "../../../../utils/authValidation";

const SHARED_DEMO_EMAIL = "lanlords2025@gmail.com";

export default function RecoverPasswordScreen() {
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawIdentifier = params.identifier || params.email || "";
  const identifier = Array.isArray(rawIdentifier) ? rawIdentifier[0] : rawIdentifier;
  const usesSharedDemoEmail = String(identifier || "").trim().toLowerCase() === SHARED_DEMO_EMAIL;

  const [phase, setPhase] = useState("send"); // "send" | "verify" | "done"
  const [loading, setLoading] = useState(false);
  const [accountLoginId, setAccountLoginId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const requestInFlight = useRef(false);
  const { secondsRemaining, useServerDeadline } = useOtpResendCooldown();

  const handleSendCode = async () => {
    if (requestInFlight.current || (phase === "verify" && secondsRemaining > 0)) return;
    const selectedAccountLoginId = accountLoginId.trim().toLowerCase();
    if (usesSharedDemoEmail && !selectedAccountLoginId) {
      setErrors({ accountLoginId: "Enter the unique login ID for the demo account you want to recover." });
      return;
    }
    requestInFlight.current = true;
    setLoading(true);
    try {
      const result = await forgotPassword(identifier, "email", selectedAccountLoginId);
      if (result.success) {
        setPhase("verify");
        setVerificationCode("");
        useServerDeadline(result.resendAvailableAt, 60);
      } else {
        if (result.retryAfterSeconds) useServerDeadline("", result.retryAfterSeconds);
        Alert.alert(
          t("Unable to Send Code"),
          t(result.error || "The email verification code could not be sent. Please try again."),
        );
      }
    } catch {
      Alert.alert(t("Error"), t("Unable to reach the server. Please try again."));
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (requestInFlight.current) return;
    const nextErrors = {};
    if (!verificationCode.trim() || !/^\d{6}$/.test(verificationCode.trim())) {
      nextErrors.verificationCode = "Enter the 6-digit reset code sent to your email.";
    }
    const passwordError = validateAccountPassword(newPassword);
    if (passwordError) {
      nextErrors.newPassword = passwordError;
    } else if ((validatePasswordStrength(newPassword).score ?? 0) < 65) {
      nextErrors.newPassword =
        "Password is too weak. Choose a stronger password.";
    }
    const confirmErr = validateConfirmPassword(newPassword, confirmPassword);
    if (confirmErr) nextErrors.confirmPassword = confirmErr;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    requestInFlight.current = true;
    setLoading(true);
    try {
      // Reset validates and consumes the email code in one request. Verifying it in
      // a separate request would invalidate a one-time code before reset.
      const resetResult = await resetPassword(
        identifier,
        verificationCode.trim(),
        newPassword,
        "email",
        usesSharedDemoEmail ? accountLoginId.trim().toLowerCase() : "",
      );
      if (!resetResult.success) {
        const message = resetResult.error || "Unable to reset password.";
        const field = /password|uppercase|lowercase|special|character|spaces?/i.test(message)
          ? "newPassword"
          : /match/i.test(message)
            ? "confirmPassword"
            : /code|verification|expired/i.test(message)
              ? "verificationCode"
              : "";
        if (field) setErrors({ [field]: message });
        Alert.alert(
          t("Reset Failed"),
          t(message),
        );
        return;
      }
      setPhase("done");
    } catch {
      Alert.alert(t("Error"), t("Unable to reach the server. Please try again."));
    } finally {
      requestInFlight.current = false;
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
          title={t("Reset Password")}
          subtitle={
            phase === "send"
              ? t("Request a reset code")
              : phase === "verify"
                ? t("Enter code and new password")
                : t("Password reset complete")
          }
          color={COLORS.primary}
          onBack={() => router.back()}
        />

        <Card>
          <TextField
            label={t("Email or Account Login ID")}
            value={identifier}
            onChangeText={() => {}}
            editable={false}
            style={{ color: COLORS.textMuted }}
          />
          {usesSharedDemoEmail && (
            <TextField
              label={t("Demo Account Login ID")}
              value={accountLoginId}
              onChangeText={(value) => {
                setAccountLoginId(value);
                setErrors((previous) => ({ ...previous, accountLoginId: "" }));
              }}
              placeholder="admin.cavite or tech.main"
              autoCapitalize="none"
              editable={phase === "send"}
              error={t(errors.accountLoginId)}
              helperText={t("Required because this demo inbox belongs to six separate accounts.")}
            />
          )}
        </Card>

        {phase === "send" && (
          <Button
            title={t(loading ? "Sending..." : "Send Reset Code")}
            onPress={handleSendCode}
            variant="primary"
            loading={loading}
            disabled={loading}
          />
        )}

        {phase === "verify" && (
          <>
            <Card>
              <TextField
                label={t("Reset Code")}
                value={verificationCode}
                onChangeText={(v) => {
                  setVerificationCode(v.replace(/\D/g, "").slice(0, 6));
                  setErrors((prev) => ({ ...prev, verificationCode: "" }));
                }}
                placeholder={t("6-digit code from your email")}
                keyboardType="number-pad"
                maxLength={6}
                error={t(errors.verificationCode)}
              />
            </Card>
            <Card>
              <PasswordField
                label={t("New Password")}
                value={newPassword}
                maxLength={25}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setErrors((prev) => ({ ...prev, newPassword: "" }));
                }}
                error={t(errors.newPassword)}
              />
              <PasswordField
                label={t("Confirm New Password")}
                value={confirmPassword}
                maxLength={25}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                error={t(errors.confirmPassword)}
              />
            </Card>
            <Button
              title={t(loading ? "Resetting..." : "Reset Password")}
              onPress={handleReset}
              variant="primary"
              loading={loading}
              disabled={loading}
            />
            <Button
              title={loading ? t("Sending…") : secondsRemaining > 0 ? `${t("Resend Code")} (${secondsRemaining}s)` : t("Resend Code")}
              onPress={handleSendCode}
              disabled={loading || secondsRemaining > 0}
              loading={loading}
              variant="secondary"
              size="sm"
              style={{ marginTop: SPACING.sm }}
            />
          </>
        )}

        {phase === "done" && (
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
              {t("Password Reset")}
            </Text>
            <Text style={{ color: COLORS.success }}>
              {t("Your password has been updated. You can now sign in with your new password.")}
            </Text>
          </Card>
        )}

        {phase === "done" && (
          <Button
            title={t("Go to Sign In")}
            onPress={() => router.replace("/sign-in")}
            variant="primary"
            style={{ marginTop: SPACING.sm }}
          />
        )}

        <Button
          title={t("Back to Login")}
          onPress={() => router.push("/sign-in")}
          variant="ghost"
          size="sm"
          style={{ marginTop: SPACING.md }}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
