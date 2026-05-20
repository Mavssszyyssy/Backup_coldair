import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import PasswordField from "../../../../components/ui/PasswordField";
import StickyActionBar from "../../../../components/ui/StickyActionBar";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import {
  normalizeEmail,
  validateConfirmPassword,
  validateEmail,
  validatePasswordStrength,
} from "../../../../utils/authValidation";

function generateTotpSecret() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";

  for (let index = 0; index < 16; index += 1) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return secret;
}

function buildOtpAuthUrl(secret, email) {
  const issuer = encodeURIComponent("CAACT Mobile");
  const accountName = encodeURIComponent(email || "new-user");
  return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`;
}

function base32Decode(encoded) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of encoded.toUpperCase().replace(/=+$/, "")) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

async function generateTotpCode(secret, timeStep = 30) {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const keyBytes = base32Decode(secret);
  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, counterBytes);
  const hmac = new Uint8Array(sig);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1000000;
  return String(code).padStart(6, "0");
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
  const [totpSecret, setTotpSecret] = useState("");
  const [totpSent, setTotpSent] = useState(false);
  const [totpInput, setTotpInput] = useState("");

  const passwordScore = useMemo(() => {
    if (!form.password) return null;
    return validatePasswordStrength(form.password).score;
  }, [form.password]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
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

  const handleGenerateTotp = () => {
    const nextErrors = {};
    const normalizedEmail = normalizeEmail(form.email);

    if (!form.alias.trim()) {
      nextErrors.alias = "Sign-in alias is required.";
    } else if (form.alias.trim().length < 3) {
      nextErrors.alias = "Alias must be at least 3 characters.";
    }

    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      nextErrors.email = emailError;
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    } else if ((passwordScore ?? 0) < 65) {
      nextErrors.password =
        "Password is too weak. Please choose a stronger password.";
    }

    const confirmPasswordError = validateConfirmPassword(
      form.password,
      form.confirmPassword,
    );
    if (confirmPasswordError) {
      nextErrors.confirmPassword = confirmPasswordError;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const secret = generateTotpSecret();
    setTotpSecret(secret);
    setTotpSent(true);
    Alert.alert(
      "Authenticator Setup Started",
      "Use the debug card below to complete step 2 of 3.",
    );
  };

  const handleVerifyTotp = async () => {
    if (!/^\d{6}$/.test(totpInput.trim())) {
      Alert.alert("Invalid Code", "Enter the 6-digit code from your authenticator app.");
      return;
    }

    // Validate against current and previous window to allow for clock drift
    const [current, previous] = await Promise.all([
      generateTotpCode(totpSecret, 30),
      generateTotpCode(totpSecret, 30).then(() =>
        (async () => {
          const counter = Math.floor(Date.now() / 1000 / 30) - 1;
          const keyBytes = base32Decode(totpSecret);
          const counterBytes = new Uint8Array(8);
          let c = counter;
          for (let i = 7; i >= 0; i--) {
            counterBytes[i] = c & 0xff;
            c = Math.floor(c / 256);
          }
          const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "HMAC", hash: "SHA-1" },
            false,
            ["sign"],
          );
          const sig = await crypto.subtle.sign("HMAC", cryptoKey, counterBytes);
          const hmac = new Uint8Array(sig);
          const offset = hmac[hmac.length - 1] & 0x0f;
          const code =
            (((hmac[offset] & 0x7f) << 24) |
              ((hmac[offset + 1] & 0xff) << 16) |
              ((hmac[offset + 2] & 0xff) << 8) |
              (hmac[offset + 3] & 0xff)) %
            1000000;
          return String(code).padStart(6, "0");
        })(),
      ),
    ]);

    if (totpInput.trim() !== current && totpInput.trim() !== previous) {
      Alert.alert(
        "Incorrect Code",
        "The authenticator code is incorrect. Check your authenticator app and try again.",
      );
      return;
    }

    router.push({
      pathname: "/sign-up/step/2",
      params: {
        ...params,
        alias: form.alias.trim(),
        email: normalizeEmail(form.email),
        password: form.password,
        totpSecret,
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: SPACING.md,
          paddingBottom: 112,
        }}
      >
        <PageHeader
          title="Create Account"
          subtitle="Step 2 of 3: Sign-in and authenticator app"
          color={COLORS.primary}
          onBack={() => router.back()}
        />

        {!totpSent ? (
          <>
            <Card>
              <TextField
                label="Sign-in Alias"
                value={form.alias}
                onChangeText={(value) => updateField("alias", value)}
                placeholder="Choose a unique alias"
                error={errors.alias}
                autoCapitalize="none"
              />
              <TextField
                label="Email"
                value={form.email}
                onChangeText={(value) => updateField("email", value)}
                placeholder="you@example.com"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Card>

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
            {__DEV__ ? (
              <Card
                style={{
                  backgroundColor: COLORS.primaryLight,
                  borderColor: COLORS.primary,
                  borderWidth: 1,
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
                    marginBottom: SPACING.sm,
                  }}
                >
                  {totpSecret}
                </Text>
                <Text
                  style={{
                    fontSize: FONT.sm,
                    color: COLORS.textSecondary,
                    marginBottom: SPACING.sm,
                  }}
                >
                  Authenticator QR Code URL
                </Text>
                <Text
                  style={{
                    fontSize: FONT.sm,
                    color: COLORS.textPrimary,
                    fontFamily: "monospace",
                    backgroundColor: COLORS.surface,
                    padding: SPACING.sm,
                    borderRadius: RADIUS.sm,
                  }}
                >
                  {buildOtpAuthUrl(totpSecret, normalizeEmail(form.email))}
                </Text>
              </Card>
            ) : null}

            <Card>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  marginBottom: SPACING.sm,
                }}
              >
                Enter the 6-digit code from your authenticator app to continue.
              </Text>
              <TextField
                label="Authenticator Code"
                value={totpInput}
                onChangeText={setTotpInput}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={6}
              />
            </Card>
          </>
        )}
      </ScrollView>
      <StickyActionBar>
        <Button
          title={totpSent ? "Verify Authenticator Code" : "Next"}
          onPress={totpSent ? handleVerifyTotp : handleGenerateTotp}
          variant="primary"
        />
      </StickyActionBar>
    </SafeAreaView>
  );
}
