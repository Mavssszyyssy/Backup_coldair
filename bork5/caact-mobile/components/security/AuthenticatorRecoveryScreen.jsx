import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../ui/Button";
import Card from "../ui/Card";
import PageHeader from "../ui/PageHeader";
import TextField from "../ui/TextField";
import QrCodeMatrix from "../ui/QrCodeMatrix";
import KeyboardAwareScrollView from "../ui/KeyboardAwareScrollView";
import { COLORS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { ensureCustomerTotpSecret, regenerateCustomerTotpSecret } from "../../services/customerSecurityService";

export default function AuthenticatorRecoveryScreen() {
  const router = useRouter();
  const { current, verifySecuritySetup, resolveHomeRoute, logout } = useUserContext();
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    ensureCustomerTotpSecret().then((value) => { if (active) setSecret(value); })
      .catch((reason) => { if (active) setError(reason.message || "Unable to load authenticator setup."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const switchAccount = async () => { await logout(); router.replace("/sign-in"); };
  const refresh = async () => {
    setLoading(true); setError(""); setCode("");
    try { setSecret(await regenerateCustomerTotpSecret()); }
    catch (reason) { setError(reason.message || "Unable to generate a new setup key."); }
    finally { setLoading(false); }
  };
  const verify = async () => {
    if (submitting) return;
    if (!/^\d{6}$/.test(code)) { setError("Enter the six-digit code from your authenticator app."); return; }
    setSubmitting(true); setError("");
    try {
      const result = await verifySecuritySetup(code);
      if (!result.success) { setError(result.error || "Incorrect authenticator code."); return; }
      router.replace(resolveHomeRoute(result.user));
    } catch (reason) { setError(reason.message || "Unable to verify your authenticator. Try again."); }
    finally { setSubmitting(false); }
  };
  const uri = secret ? `otpauth://totp/ColdAir:${encodeURIComponent(current?.email || current?.username || current?.alias || "account")}?secret=${encodeURIComponent(secret)}&issuer=ColdAir` : "";
  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md }} minBottomPadding={132}>
      <PageHeader title="Reset Authenticator App" subtitle="Secure your account with a new authenticator" onBack={switchAccount} />
      <Card>
        <Text>Scan the QR code or enter this setup key in your authenticator app. Then enter the new six-digit code below.</Text>
        <Text>Keep this setup key private. Your account stays restricted until verification is complete.</Text>
        {loading ? <Text>Loading authenticator setup...</Text> : null}
        {secret ? <View style={{ alignItems: "center", marginVertical: SPACING.md }}><QrCodeMatrix value={uri} size={184} /><Text selectable accessibilityLabel="Authenticator setup key">{secret}</Text></View> : null}
        {error ? <Text accessibilityRole="alert" style={{ color: COLORS.danger }}>{error}</Text> : null}
        {!secret && !loading ? <Button title="Retry setup" variant="secondary" onPress={() => setAttempt((value) => value + 1)} /> : null}
        <TextField label="Authenticator Code" value={code} onChangeText={(value) => { setCode(value.replace(/\D/g, "").slice(0, 6)); setError(""); }} placeholder="Enter 6-digit code" keyboardType="number-pad" maxLength={6} showKeyboardDone />
        <Button title="Verify Authenticator Code" onPress={verify} loading={submitting} disabled={submitting || loading || !secret} />
        <Button title="Generate a new setup key" variant="secondary" onPress={refresh} disabled={submitting || loading} />
      </Card>
      <Button title="I have a different account" variant="ghost" onPress={switchAccount} disabled={submitting} />
    </KeyboardAwareScrollView>
  </SafeAreaView>;
}
