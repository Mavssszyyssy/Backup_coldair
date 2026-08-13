// app/(auth)/recover/factor/1.jsx
// Password recovery — send OTP, then enter OTP + new password.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import PasswordField from "../../../../components/ui/PasswordField";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import {
  forgotPassword,
  resetPassword,
} from "../../../../services/api";
import {
  validateConfirmPassword,
  validatePasswordStrength,
} from "../../../../utils/authValidation";

export default function RecoverPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = Array.isArray(params.email)
    ? params.email[0]
    : params.email || "";

  const [phase, setPhase] = useState("send"); // "send" | "verify" | "done"
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const result = await forgotPassword(email, "email");
      if (result.success) {
        setPhase("verify");
      } else {
        Alert.alert(
          "Not Found",
          result.error || "No account found with this email address.",
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
    if (!otp.trim() || !/^\d{6}$/.test(otp.trim())) {
      nextErrors.otp = "Enter the 6-digit reset code sent to your email.";
    }
    if (!newPassword) {
      nextErrors.newPassword = "New password is required.";
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
      // Reset validates and consumes the OTP in one request. Verifying it in
      // a separate request would invalidate a one-time code before reset.
      const resetResult = await resetPassword(
        email,
        otp.trim(),
        newPassword,
        "email",
      );
      if (!resetResult.success) {
        Alert.alert(
          "Reset Failed",
          resetResult.error || "Unable to reset password.",
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
      <ScrollView
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
            label="Email"
            value={email}
            onChangeText={() => {}}
            editable={false}
            style={{ color: COLORS.textMuted }}
          />
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
                value={otp}
                onChangeText={(v) => {
                  setOtp(v.replace(/\D/g, "").slice(0, 6));
                  setErrors((prev) => ({ ...prev, otp: "" }));
                }}
                placeholder="6-digit code from your email"
                keyboardType="number-pad"
                maxLength={6}
                error={errors.otp}
              />
            </Card>
            <Card>
              <PasswordField
                label="New Password"
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setErrors((prev) => ({ ...prev, newPassword: "" }));
                }}
                error={errors.newPassword}
              />
              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
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
      </ScrollView>
    </SafeAreaView>
  );
}
