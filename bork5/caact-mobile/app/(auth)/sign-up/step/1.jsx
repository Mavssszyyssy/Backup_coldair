import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import PasswordField from "../../../../components/ui/PasswordField";
import QrCodeMatrix from "../../../../components/ui/QrCodeMatrix";
import StickyActionBar from "../../../../components/ui/StickyActionBar";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import {
  checkAliasAvailability,
  startRegistration,
  verifyRegistrationCode,
} from "../../../../services/api";
import {
  normalizeEmail,
  validateConfirmPassword,
  validateEmail,
  validatePasswordStrength,
} from "../../../../utils/authValidation";

function readParam(value) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function defaultAliasFromEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) return "";
  return normalized.split("@")[0].slice(0, 48);
}

function detectRole(email) {
  const normalized = normalizeEmail(email);
  if (normalized.includes("superadmin")) return "superadmin";
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("technician")) return "technician";
  return "customer";
}

function validateAlias(value) {
  const alias = String(value || "").trim();
  if (!alias) return "";
  if (alias.length < 6) return "Alias must be at least 6 characters.";
  if (alias.length > 36) return "Alias must not exceed 36 characters.";
  if (!/^[a-zA-Z0-9._-]+$/.test(alias)) {
    return "Alias may only use letters, numbers, dot, underscore, and hyphen.";
  }
  return "";
}

export default function SignUpStep1() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [form, setForm] = useState({
    alias: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [aliasStatus, setAliasStatus] = useState(null);
  const [registrationSecret, setRegistrationSecret] = useState("");
  const [provisioningUri, setProvisioningUri] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationInput, setVerificationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const normalizedEmail = useMemo(() => normalizeEmail(form.email), [form.email]);
  const aliasPlaceholder = useMemo(
    () => defaultAliasFromEmail(normalizedEmail) || "juan.dc",
    [normalizedEmail],
  );
  const finalAlias = useMemo(
    () => (form.alias.trim() || aliasPlaceholder).toLowerCase(),
    [aliasPlaceholder, form.alias],
  );
  const detectedRole = useMemo(() => detectRole(normalizedEmail), [normalizedEmail]);

  const passwordScore = useMemo(() => {
    if (!form.password) return null;
    return validatePasswordStrength(form.password).score;
  }, [form.password]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if (key === "alias") setAliasStatus(null);
    if (key === "email") {
      setRegistrationSecret("");
      setProvisioningUri("");
      setEmailVerified(false);
      setVerificationInput("");
      setAliasStatus(null);
    }
  };

  const getScoreLabel = (score) => {
    if (score === null) return "";
    if (score <= 0) return "Bad";
    if (score < 40) return "Poor";
    if (score < 65) return "Weak";
    if (score < 100) return "Good";
    return "Excellent";
  };

  const getScoreColor = (score) => {
    if (score === null) return COLORS.textMuted;
    if (score <= 0) return COLORS.danger;
    if (score < 40) return "#F59E0B";
    if (score < 65) return COLORS.warning;
    if (score < 100) return COLORS.success;
    return "#059669";
  };

  const validateProfileSecurity = () => {
    const nextErrors = {};
    const emailError = validateEmail(normalizedEmail);
    const aliasError = validateAlias(form.alias);
    const confirmPasswordError = validateConfirmPassword(
      form.password,
      form.confirmPassword,
    );

    if (aliasError) nextErrors.alias = aliasError;
    if (emailError) nextErrors.email = emailError;
    if (!form.password) {
      nextErrors.password = "Password is required.";
    } else if (form.password.length < 12) {
      nextErrors.password = "Password must be at least 12 characters.";
    } else if (form.password.length > 72) {
      nextErrors.password = "Password must not exceed 72 characters.";
    } else if ((passwordScore ?? 0) < 65) {
      nextErrors.password =
        "Password is not strong enough. Aim for Good strength.";
    }
    if (confirmPasswordError) nextErrors.confirmPassword = confirmPasswordError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAliasBlur = async () => {
    if (!finalAlias || finalAlias.length < 2) {
      setAliasStatus(null);
      return true;
    }

    setAliasStatus("checking");
    let result;
    try {
      result = await checkAliasAvailability(finalAlias);
    } catch {
      setAliasStatus(null);
      return true;
    }
    if (!result.success) {
      setAliasStatus(null);
      return true;
    }

    setAliasStatus(result.available ? "available" : "taken");
    if (!result.available) {
      setErrors((prev) => ({
        ...prev,
        alias: "This alias is already taken. Please choose another.",
      }));
      return false;
    }
    return true;
  };

  const handleStartVerification = async () => {
    if (!validateProfileSecurity()) return;

    setLoading(true);
    try {
      const aliasAvailable = await handleAliasBlur();
      if (!aliasAvailable) return;

      let response;
      try {
        response = await startRegistration(normalizedEmail);
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          email: error?.message || "Unable to start email verification.",
        }));
        return;
      }
      if (!response.success) {
        setErrors((prev) => ({
          ...prev,
          email: response.error || "Unable to start email verification.",
        }));
        return;
      }

      setRegistrationSecret(response.secret);
      setProvisioningUri(response.provisioningUri);
      setEmailVerified(Boolean(response.verifiedCode));
      Alert.alert(
        "Email Verification Started",
        "Use your authenticator app to scan or enter the security secret.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationInput.trim();
    if (!/^\d{6}$/.test(code)) {
      setErrors((prev) => ({
        ...prev,
        verification: "Enter the 6-digit authenticator code.",
      }));
      return;
    }

    setVerifying(true);
    setErrors((prev) => ({ ...prev, verification: "" }));
    try {
      let result;
      try {
        result = await verifyRegistrationCode({
          email: normalizedEmail,
          code,
          secret: registrationSecret,
        });
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          verification: error?.message || "Verification failed.",
        }));
        setVerificationInput("");
        return;
      }

      if (!result.success) {
        setErrors((prev) => ({
          ...prev,
          verification: result.error || "Verification failed.",
        }));
        setVerificationInput("");
        return;
      }

      setEmailVerified(true);
      setVerificationInput("");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (
      verificationInput.length === 6 &&
      registrationSecret &&
      !emailVerified &&
      !verifying
    ) {
      handleVerifyCode();
    }
  }, [verificationInput]);

  const handleContinue = () => {
    router.push({
      pathname: "/sign-up/step/2",
      params: {
        ...params,
        alias: finalAlias,
        email: normalizedEmail,
        password: form.password,
        registrationSecret,
        provisioningUri,
        role: detectedRole,
      },
    });
  };

  const resetEmailVerification = () => {
    setRegistrationSecret("");
    setProvisioningUri("");
    setEmailVerified(false);
    setVerificationInput("");
    setErrors((prev) => ({ ...prev, verification: "" }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: SPACING.md,
          paddingBottom: 112,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Create Account"
          subtitle="Step 2 of 3: Email, profile, and security"
          color={COLORS.primary}
          onBack={() => router.back()}
        />

        {!registrationSecret ? (
          <>
            <Card>
              <TextField
                label="Email"
                value={form.email}
                onChangeText={(value) => updateField("email", value)}
                placeholder="you@example.com"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField
                label="Sign-in Alias"
                value={form.alias}
                onChangeText={(value) =>
                  updateField("alias", value.toLowerCase().trim())
                }
                onBlur={handleAliasBlur}
                placeholder={aliasPlaceholder}
                error={errors.alias}
                autoCapitalize="none"
              />
              {aliasStatus === "checking" ? (
                <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>
                  Checking alias...
                </Text>
              ) : aliasStatus === "available" ? (
                <Text style={{ color: COLORS.success, fontSize: FONT.sm }}>
                  Alias available
                </Text>
              ) : null}
            </Card>

            {detectedRole !== "customer" ? (
              <Card>
                <Text style={{ color: COLORS.textSecondary }}>
                  Role detected:{" "}
                  <Text style={{ fontWeight: FONT.bold }}>
                    {detectedRole.toUpperCase()}
                  </Text>
                </Text>
              </Card>
            ) : null}

            <Card>
              <PasswordField
                label="Password"
                value={form.password}
                onChangeText={(value) => updateField("password", value)}
                error={errors.password}
              />
              {passwordScore !== null ? (
                <View
                  style={{
                    marginTop: SPACING.xs,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: getScoreColor(passwordScore),
                      marginRight: SPACING.xs,
                    }}
                  />
                  <Text
                    style={{
                      color: getScoreColor(passwordScore),
                      fontWeight: FONT.bold,
                      fontSize: FONT.sm,
                    }}
                  >
                    Strength: {getScoreLabel(passwordScore)} ({passwordScore}
                    /100)
                  </Text>
                </View>
              ) : null}
              <PasswordField
                label="Confirm Password"
                value={form.confirmPassword}
                onChangeText={(value) => updateField("confirmPassword", value)}
                error={errors.confirmPassword}
              />
            </Card>
          </>
        ) : (
          <>
            <Card>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  marginBottom: SPACING.md,
                }}
              >
                Scan the QR code or enter the secret in your authenticator app,
                then provide the 6-digit code.
              </Text>

              {provisioningUri ? (
                <View style={{ alignItems: "center", marginBottom: SPACING.md }}>
                  <QrCodeMatrix value={provisioningUri} size={184} />
                </View>
              ) : null}

              {__DEV__ ? (
                <View
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    borderColor: COLORS.primary,
                    borderWidth: 1,
                    borderRadius: RADIUS.md,
                    padding: SPACING.md,
                    marginBottom: SPACING.md,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: FONT.bold,
                      color: COLORS.primary,
                      marginBottom: SPACING.xs,
                    }}
                  >
                    Debug: Authenticator Secret
                  </Text>
                  <Text
                    style={{
                      fontSize: FONT.lg,
                      fontWeight: "800",
                      color: COLORS.textPrimary,
                    }}
                  >
                    {registrationSecret}
                  </Text>
                </View>
              ) : null}

              {emailVerified ? (
                <View
                  style={{
                    backgroundColor: COLORS.successLight,
                    borderRadius: RADIUS.md,
                    padding: SPACING.md,
                  }}
                >
                  <Text style={{ color: COLORS.success, fontWeight: FONT.bold }}>
                    Email verified
                  </Text>
                </View>
              ) : (
                <TextField
                  label="Authenticator Code"
                  value={verificationInput}
                  onChangeText={(value) => {
                    setVerificationInput(value.replace(/\D/g, "").slice(0, 6));
                    setErrors((prev) => ({ ...prev, verification: "" }));
                  }}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  maxLength={6}
                  error={errors.verification}
                />
              )}

              <TouchableOpacity
                onPress={resetEmailVerification}
                style={{ alignItems: "center", marginTop: SPACING.md }}
              >
                <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
                  Change email
                </Text>
              </TouchableOpacity>
            </Card>
          </>
        )}
      </ScrollView>

      <StickyActionBar>
        {!registrationSecret ? (
          <Button
            title={loading ? "Starting Verification..." : "Start Verification"}
            onPress={handleStartVerification}
            variant="primary"
            loading={loading}
            disabled={loading || aliasStatus === "checking"}
          />
        ) : emailVerified ? (
          <Button title="Continue" onPress={handleContinue} variant="primary" />
        ) : (
          <Button
            title={verifying ? "Verifying..." : "Verify Authenticator Code"}
            onPress={handleVerifyCode}
            variant="primary"
            loading={verifying}
            disabled={verifying}
          />
        )}
      </StickyActionBar>
    </SafeAreaView>
  );
}
