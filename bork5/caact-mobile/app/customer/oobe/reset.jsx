import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text } from "react-native";

import CustomerScreen from "../../../components/customer/CustomerScreen";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import TextField from "../../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../../constants/theme";
import { useUserContext } from "../../../context/UserContext";
import {
  ensureCustomerTotpSecret,
  regenerateCustomerTotpSecret,
} from "../../../services/customerSecurityService";

function buildOtpAuthUrl(secret, email) {
  const issuer = encodeURIComponent("CAACT Mobile");
  const accountName = encodeURIComponent(email || "customer-reset");
  return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`;
}

export default function CustomerOobeResetScreen() {
  const router = useRouter();
  const { current, verifySecuritySetup } = useUserContext();
  const [totpSecret, setTotpSecret] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      ensureCustomerTotpSecret(current?.id).then((secret) => {
        if (active) setTotpSecret(secret);
      });
      return () => {
        active = false;
      };
    }, [current]),
  );

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert("Invalid Code", "Enter the 6-digit code from your authenticator app.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifySecuritySetup(code.trim());
      if (!result.success) {
        Alert.alert(
          "Incorrect Code",
          result.error || "The authenticator code is incorrect. Check your authenticator app.",
        );
        return;
      }
      Alert.alert("Authenticator Verified", "Customer account recovery setup is complete.", [
        {
          text: "Continue",
          onPress: () => router.replace("/customer/home"),
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshSecret = async () => {
    const nextSecret = await regenerateCustomerTotpSecret(current?.id);
    setTotpSecret(nextSecret);
    setCode("");
  };

  return (
    <CustomerScreen
      title="Reset Authenticator App"
      subtitle="Use this flow after signing in with a recovery code"
      onBack={() => router.back()}
      withBottomNav={false}
    >
      {__DEV__ ? <Card
        style={{
          backgroundColor: COLORS.primaryLight,
          borderColor: COLORS.primary,
          borderWidth: 1,
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
            fontWeight: FONT.black,
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
          {buildOtpAuthUrl(totpSecret, current?.email)}
        </Text>
      </Card> : null}

      <Card>
        <TextField
          label="Authenticator Code"
          value={code}
          onChangeText={setCode}
          placeholder="Enter 6-digit code"
          keyboardType="number-pad"
          maxLength={6}
        />
        <Button
          title={submitting ? "Verifying..." : "Verify Authenticator Code"}
          onPress={handleVerify}
          loading={submitting}
          disabled={submitting}
        />
        <Button
          title="Refresh Secret"
          variant="secondary"
          onPress={handleRefreshSecret}
        />
      </Card>
    </CustomerScreen>
  );
}
