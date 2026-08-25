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

export default function CustomerOobeResetScreen() {
  const router = useRouter();
  const { current } = useUserContext();
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
      const expected = await generateTotpCode(totpSecret, 30);
      if (code.trim() !== expected) {
        Alert.alert(
          "Incorrect Code",
          "The authenticator code is incorrect. Check your authenticator app.",
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
