import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../components/technician/TechButton";
import Card from "../../../components/ui/Card";
import PageHeader from "../../../components/ui/PageHeader";
import QrCodeMatrix from "../../../components/ui/QrCodeMatrix";
import AuthenticatorSetupKey from "../../../components/security/AuthenticatorSetupKey";
import KeyboardAwareScrollView from "../../../components/ui/KeyboardAwareScrollView";
import TextField from "../../../components/ui/TextField";
import { COLORS, FONT, SPACING } from "../../../constants/theme";
import { useUserContext } from "../../../context/UserContext";
import {
  ensureCustomerTotpSecret,
  ensureRecoveryCodes,
} from "../../../services/customerSecurityService";
import {
  canonicalizePhMobile,
  sanitizePhMobileInput,
  validatePassword,
  validatePasswordStrength,
  validatePhone,
} from "../../../utils/authValidation";

export default function TechnicianOobe() {
  const router = useRouter();
  const { current, completeTechnicianOnboarding, verifySecuritySetup, logout } = useUserContext();
  const [alias, setAlias] = useState(current?.alias || "");
  const [phone, setPhone] = useState(canonicalizePhMobile(current?.phone || ""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(!current?.isFirstLogin);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const totpUri = totpSecret
    ? `otpauth://totp/ColdAir:${encodeURIComponent(current?.username || current?.alias || "technician")}?secret=${encodeURIComponent(totpSecret)}&issuer=ColdAir`
    : "";

  useEffect(() => {
    if (!profileSaved) return undefined;
    let active = true;
    setLoadingSecurity(true);
    setSecurityError("");
    Promise.all([ensureRecoveryCodes(), ensureCustomerTotpSecret()])
      .then(([codes, secret]) => { if (active) { setRecoveryCodes(codes); setTotpSecret(secret); } })
      .catch((error) => { if (active) setSecurityError(error.message || "Unable to load authenticator setup. Try again."); })
      .finally(() => { if (active) setLoadingSecurity(false); });
    return () => { active = false; };
  }, [profileSaved, loadAttempt]);

  const switchAccount = async () => { await logout(); router.replace("/sign-in"); };

  const handleSubmit = async () => {
    if (!alias.trim() || !phone.trim() || !password) {
      Alert.alert(
        "Required",
        "Alias, contact number, and password are required.",
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Please confirm the same password.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert("Invalid password", passwordError);
      return;
    }
    if ((validatePasswordStrength(password).score ?? 0) < 65) {
      Alert.alert(
        "Password too weak",
        "Use uppercase and lowercase letters, a number, and a special character.",
      );
      return;
    }
    const phoneError = validatePhone(phone);
    if (phoneError) {
      Alert.alert("Invalid contact number", phoneError);
      return;
    }

    setSaving(true);
    try {
      const result = await completeTechnicianOnboarding({
        alias: alias.trim(),
        phone: canonicalizePhMobile(phone),
        newPassword: password,
      });
      if (!result.success) {
        Alert.alert(
          "Setup not completed",
          result.error || "Please check your details and try again.",
        );
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setProfileSaved(true);
    } catch (error) {
      setSecurityError(error.message || "Unable to save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyAuthenticator = async () => {
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
      router.replace("/technician/home");
    } catch (error) {
      setSecurityError(error.message || "Unable to verify your authenticator. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md }} minBottomPadding={128}>
        <PageHeader
          title="Technician Setup"
          subtitle="Complete the details your owner-created account still needs"
          color={COLORS.tech}
          onBack={switchAccount}
        />
        {securityError ? <Text accessibilityRole="alert" style={{ color: COLORS.danger, marginBottom: SPACING.sm }}>{securityError}</Text> : null}
        {!profileSaved ? <Card>
          <TextField
            label="Sign-in Alias"
            value={alias}
            onChangeText={setAlias}
          />
          <TextField
            label="Contact Number"
            value={phone}
            onChangeText={(value) => setPhone(sanitizePhMobileInput(value))}
            keyboardType="phone-pad"
            placeholder="09XXXXXXXXX"
            maxLength={12}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            maxLength={25}
            secureTextEntry
          />
          <TextField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            maxLength={25}
            secureTextEntry
          />
          <TechButton
            title={saving ? "Saving..." : "Save Profile and Continue"}
            onPress={handleSubmit}
            loading={saving}
          />
        </Card> : null}
        {recoveryCodes.length > 0 && (
          <Card style={{ marginTop: SPACING.md }}>
            <Text
              style={{
                color: COLORS.textPrimary,
                fontWeight: FONT.black,
                marginBottom: SPACING.sm,
              }}
            >
              Recovery Codes
            </Text>
            {recoveryCodes.map((entry) => (
              <Text
                key={entry.code || entry}
                style={{ color: COLORS.textSecondary, marginBottom: 4 }}
              >
                {entry.code || entry}
              </Text>
            ))}
          </Card>
        )}
        {profileSaved ? (
          <Card style={{ marginTop: SPACING.md }}>
            <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginBottom: SPACING.sm }}>
              Authenticator App Setup
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
              Your profile is saved. Scan this QR code or enter the setup key in your authenticator app, then verify the six-digit code. Keep your recovery codes somewhere safe.
            </Text>
            <View style={{ alignItems: "center", marginBottom: SPACING.md }}>
              {totpSecret ? <QrCodeMatrix value={totpUri} size={184} darkColor={COLORS.textPrimary} /> : null}
            </View>
            <AuthenticatorSetupKey secret={totpSecret} disabled={loadingSecurity} />
            <TextField
              label="Six-digit authenticator code"
              value={totpCode}
              onChangeText={(value) => {
                setTotpCode(value.replace(/\D/g, "").slice(0, 6));
                setSecurityError("");
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              error={securityError}
            />
            <TechButton
              title={verifying ? "Verifying..." : "Verify and Continue"}
              onPress={handleVerifyAuthenticator}
              loading={verifying}
              disabled={verifying || loadingSecurity || !totpSecret}
            />
            {!loadingSecurity && !totpSecret ? <TechButton title="Retry setup" variant="secondary" onPress={() => setLoadAttempt((value) => value + 1)} /> : null}
          </Card>
        ) : null}
        <TechButton title="I have a different account" variant="ghost" onPress={switchAccount} disabled={saving || verifying} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
