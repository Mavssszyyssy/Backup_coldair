import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";

import CustomerScreen from "../../../components/customer/CustomerScreen";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import QrCodeMatrix from "../../../components/ui/QrCodeMatrix";
import TextField from "../../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../../constants/theme";
import { useUserContext } from "../../../context/UserContext";
import {
  ensureCustomerTotpSecret,
  ensureRecoveryCodes,
  getAccountSecurityStatus,
  regenerateRecoveryCodes,
} from "../../../services/customerSecurityService";

export default function CustomerOobeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { current, updateMyAccount, verifySecuritySetup, logout } = useUserContext();
  const [codes, setCodes] = useState([]);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const totpUri = totpSecret
    ? `otpauth://totp/ColdAir:${encodeURIComponent(current?.email || current?.alias || "customer")}?secret=${encodeURIComponent(totpSecret)}&issuer=ColdAir`
    : "";

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadSecurity = async () => {
        try {
          const status = await getAccountSecurityStatus();
          const nextCodes = await ensureRecoveryCodes(current?.id);
          const nextSecret = status.totpEnabled
            ? ""
            : await ensureCustomerTotpSecret(current?.id);
          if (!active) return;
          setCodes(nextCodes);
          setTotpSecret(nextSecret);
          setTotpEnabled(Boolean(status.totpEnabled));
          setSecurityError("");
        } catch (error) {
          if (active) setSecurityError(error?.message || "Unable to load account security.");
        }
      };
      loadSecurity();

      return () => {
        active = false;
      };
    }, [current]),
  );

  const handleRegenerate = async () => {
    const nextCodes = await regenerateRecoveryCodes(current?.id);
    setCodes(nextCodes);
    Alert.alert("Recovery Codes Refreshed", "Your recovery codes were regenerated.");
  };

  const handleSwitchAccount = async () => {
    await logout();
    router.replace("/sign-in");
  };

  const handleContinueHome = async () => {
    if (!totpEnabled) {
      Alert.alert("Authenticator required", "Verify the six-digit authenticator code before continuing.");
      return;
    }
    if (finishing) return;
    setFinishing(true);
    setSecurityError("");
    try {
      if (!current?.customerOnboardedAt) {
        const result = await updateMyAccount({ customer_onboarded_at: new Date().toISOString() });
        if (!result.success || !result.user?.customerOnboardedAt) {
          setSecurityError(result.error || "Unable to finish account setup. Please try again.");
          return;
        }
      }
      router.replace("/customer/home");
    } catch (error) {
      setSecurityError(error?.message || "Unable to finish account setup. Please try again.");
    } finally {
      setFinishing(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!/^\d{6}$/.test(totpCode)) {
      setSecurityError("Enter the six-digit code from your authenticator app.");
      return;
    }
    setVerifying(true);
    try {
      const result = await verifySecuritySetup(totpCode);
      if (!result.success) {
        setSecurityError(result.error || "Incorrect authenticator code.");
        return;
      }
      setTotpEnabled(true);
      setTotpCode("");
      setSecurityError("");
      Alert.alert("Authenticator Enabled", "Future sign-ins will require your authenticator code.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <CustomerScreen
      onBack={handleSwitchAccount}
      title={params.registered ? "Registration Complete" : "Account Security"}
      subtitle={
        params.registered
          ? "Your customer account is ready"
          : "Keep these 6 single-use recovery codes somewhere safe"
      }
    >
      {params.registered ? (
        <Card
          style={{
            backgroundColor: COLORS.successLight,
            borderWidth: 1,
            borderColor: COLORS.success,
          }}
        >
          <Text
            style={{
              color: COLORS.success,
              fontSize: FONT.lg,
              fontWeight: FONT.black,
              marginBottom: SPACING.xs,
            }}
          >
            Successfully registered
          </Text>
          <Text style={{ color: COLORS.textPrimary, lineHeight: 21 }}>
            Review your account recovery options below. When you continue, setup
            will be marked complete and you will be brought to your home page.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text
          style={{
            color: COLORS.textSecondary,
            lineHeight: 22,
            marginBottom: SPACING.sm,
          }}
        >
          These 12-character recovery codes are shown only during account setup.
          Each code can be used once to help you recover access.
        </Text>
        {codes.length === 0 ? (
          <Text style={{ color: COLORS.textSecondary }}>
            Recovery codes are already configured. Generate new codes only if you no longer have your saved copy.
          </Text>
        ) : null}
        {codes.map((entry, index) => (
          <View
            key={`${entry.code}_${index}`}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: SPACING.sm,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.textPrimary,
                fontWeight: FONT.black,
                letterSpacing: 1,
              }}
            >
              {entry.code}
            </Text>
            <View
              style={{
                backgroundColor: entry.used
                  ? COLORS.border
                  : COLORS.successLight,
                borderRadius: RADIUS.full,
                paddingHorizontal: SPACING.sm,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: entry.used ? COLORS.textSecondary : COLORS.success,
                  fontSize: FONT.sm,
                }}
              >
                {entry.used ? "Used" : "Active"}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text
          style={{
            color: COLORS.textPrimary,
            fontWeight: FONT.black,
            fontSize: FONT.lg,
            marginBottom: SPACING.sm,
          }}
        >
          Authenticator App Setup
        </Text>
        <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
          {totpEnabled
            ? "Your authenticator app is verified and will be required at sign-in."
            : "Scan this QR code in an authenticator app, then enter its six-digit code."}
        </Text>
        {!totpEnabled ? <View style={{ alignItems: "center", marginBottom: SPACING.md }}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: RADIUS.lg,
              padding: SPACING.sm,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <QrCodeMatrix value={totpUri} size={184} darkColor={COLORS.textPrimary} />
          </View>
        </View> : null}
        {!totpEnabled ? <Text
          style={{
            color: COLORS.primary,
            fontWeight: FONT.black,
            letterSpacing: 1,
          }}
        >
          {totpSecret || "Loading..."}
        </Text> : null}
        {!totpEnabled ? (
          <>
            <TextField
              label="Six-digit authenticator code"
              value={totpCode}
              onChangeText={(value) => {
                setTotpCode(value.replace(/\D/g, "").slice(0, 6));
                setSecurityError("");
              }}
              keyboardType="number-pad"
              maxLength={6}
              error={securityError}
              placeholder="000000"
            />
            <Button
              title={verifying ? "Verifying..." : "Verify Authenticator"}
              onPress={handleVerifyTotp}
              loading={verifying}
              disabled={verifying || !totpSecret}
            />
          </>
        ) : null}
        {totpEnabled && securityError ? <Text style={{ color: COLORS.danger }}>{securityError}</Text> : null}
      </Card>

      <Button title="Generate New Recovery Codes" onPress={handleRegenerate} />
      {!totpEnabled ? (
        <Text
          style={{
            color: COLORS.textSecondary,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Verify your authenticator code above before continuing to your account.
        </Text>
      ) : null}
      <Button
        title={totpEnabled ? "Continue to Home" : "Verify Authenticator to Continue"}
        variant="ghost"
        onPress={handleContinueHome}
        loading={finishing}
        disabled={!totpEnabled || finishing}
      />
      <Button title="I have a different account" variant="ghost" onPress={handleSwitchAccount} disabled={verifying || finishing} />
    </CustomerScreen>
  );
}
