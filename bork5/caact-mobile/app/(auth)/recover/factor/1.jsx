// app/(auth)/recover/factor/1.jsx
// Password recovery — send an email code, then enter it with a new password.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import PasswordField from "../../../../components/ui/PasswordField";
import TextField from "../../../../components/ui/TextField";
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import {
  forgotPassword,
  resetPassword,
} from "../../../../services/api";
import {
  validateConfirmPassword,
  validatePassword,
  validatePasswordStrength,
} from "../../../../utils/authValidation";

const SHARED_DEMO_EMAIL = "lanlords2025@gmail.com";

export default function RecoverPasswordScreen() {
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

  const handleSendCode = async () => {
    const selectedAccountLoginId = accountLoginId.trim().toLowerCase();
    if (usesSharedDemoEmail && !selectedAccountLoginId) {
      setErrors({ accountLoginId: "Enter the unique login ID for the demo account you want to recover." });
      return;
    }
    setLoading(true);
    try {
      const result = await forgotPassword(identifier, "email", selectedAccountLoginId);
      if (result.success) {
        setPhase("verify");
      } else {
        Alert.alert(
          "Unable to Send Code",
          result.error || "The email verification code could not be sent. Please try again.",
        );
      }
    } catch {
      Alert.alert("Error", "Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const nextErrors = {};
    if (!verificationCode.trim() || !/^\d{6}$/.test(verificationCode.trim())) {
      nextErrors.verificationCode = "Enter the 6-digit reset code sent to your email.";
    }
    const passwordError = validatePassword(newPassword);
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
          "Reset Failed",
          message,
        );
        return;
      }
      setPhase("done");
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
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Reset Password"
          subtitle={
            phase === "send"
              ? "Request a reset code"
              : phase === "verify"
                ? "Enter code and new password"
                : "Password reset complete"
          }
          color={COLORS.primary}
          onBack={() => router.back()}
        />

        <Card>
          <TextField
            label="Email or Account Login ID"
            value={identifier}
            onChangeText={() => {}}
            editable={false}
            style={{ color: COLORS.textMuted }}
          />
          {usesSharedDemoEmail && (
            <TextField
              label="Demo Account Login ID"
              value={accountLoginId}
              onChangeText={(value) => {
                setAccountLoginId(value);
                setErrors((previous) => ({ ...previous, accountLoginId: "" }));
              }}
              placeholder="admin.cavite or tech.cavite.carl"
              autoCapitalize="none"
              editable={phase === "send"}
              error={errors.accountLoginId}
              helperText="Required because this demo inbox belongs to five separate accounts."
            />
          )}
        </Card>

        {phase === "send" && (
          <Button
            title={loading ? "Sending..." : "Send Reset Code"}
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
                label="Reset Code"
                value={verificationCode}
                onChangeText={(v) => {
                  setVerificationCode(v.replace(/\D/g, "").slice(0, 6));
                  setErrors((prev) => ({ ...prev, verificationCode: "" }));
                }}
                placeholder="6-digit code from your email"
                keyboardType="number-pad"
                maxLength={6}
                error={errors.verificationCode}
              />
            </Card>
            <Card>
              <PasswordField
                label="New Password"
                value={newPassword}
                maxLength={25}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setErrors((prev) => ({ ...prev, newPassword: "" }));
                }}
                error={errors.newPassword}
              />
              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                maxLength={25}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                error={errors.confirmPassword}
              />
            </Card>
            <Button
              title={loading ? "Resetting..." : "Reset Password"}
              onPress={handleReset}
              variant="primary"
              loading={loading}
              disabled={loading}
            />
            <TouchableOpacity
              onPress={handleSendCode}
              disabled={loading}
              style={{ alignItems: "center", marginTop: SPACING.sm }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: "600" }}>Resend Code</Text>
            </TouchableOpacity>
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
              Password Reset
            </Text>
            <Text style={{ color: COLORS.success }}>
              Your password has been updated. You can now sign in with your new
              password.
            </Text>
          </Card>
        )}

        {phase === "done" && (
          <Button
            title="Go to Sign In"
            onPress={() => router.replace("/sign-in")}
            variant="primary"
            style={{ marginTop: SPACING.sm }}
          />
        )}

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
