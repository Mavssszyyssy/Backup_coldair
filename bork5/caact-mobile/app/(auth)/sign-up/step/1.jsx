import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import PasswordField from "../../../../components/ui/PasswordField";
import StickyActionBar from "../../../../components/ui/StickyActionBar";
import TextField from "../../../../components/ui/TextField";
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import { checkAliasAvailability } from "../../../../services/api";
import {
  normalizeEmail,
  validateConfirmPassword,
  validateEmail,
  validatePasswordStrength,
} from "../../../../utils/authValidation";

function defaultAliasFromEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.includes("@") ? normalized.split("@")[0].slice(0, 48) : "";
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
  if (!/^[a-zA-Z0-9._-]+$/.test(alias)) return "Alias may only use letters, numbers, dot, underscore, and hyphen.";
  return "";
}

export default function SignUpStep1() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [form, setForm] = useState({ alias: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [aliasStatus, setAliasStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const normalizedEmail = useMemo(() => normalizeEmail(form.email), [form.email]);
  const aliasPlaceholder = useMemo(() => defaultAliasFromEmail(normalizedEmail) || "juan.dc", [normalizedEmail]);
  const finalAlias = useMemo(() => (form.alias.trim() || aliasPlaceholder).toLowerCase(), [aliasPlaceholder, form.alias]);
  const detectedRole = useMemo(() => detectRole(normalizedEmail), [normalizedEmail]);
  const passwordScore = useMemo(() => form.password ? validatePasswordStrength(form.password).score : null, [form.password]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if (key === "alias") setAliasStatus(null);
    if (key === "email") setAliasStatus(null);
  };

  const validateDetails = () => {
    const nextErrors = {};
    const emailError = validateEmail(normalizedEmail);
    const aliasError = validateAlias(form.alias);
    const confirmPasswordError = validateConfirmPassword(form.password, form.confirmPassword);
    if (emailError) nextErrors.email = emailError;
    if (aliasError) nextErrors.alias = aliasError;
    if (!form.password) nextErrors.password = "Password is required.";
    else if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    else if (form.password.length > 72) nextErrors.password = "Password must not exceed 72 characters.";
    else if ((passwordScore ?? 0) < 65) nextErrors.password = "Password is not strong enough. Aim for Good strength.";
    if (confirmPasswordError) nextErrors.confirmPassword = confirmPasswordError;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const checkAlias = async () => {
    if (!finalAlias || finalAlias.length < 2) return true;
    setAliasStatus("checking");
    try {
      const result = await checkAliasAvailability(finalAlias);
      if (!result.success) {
        setAliasStatus(null);
        return true;
      }
      setAliasStatus(result.available ? "available" : "taken");
      if (!result.available) {
        setErrors((prev) => ({ ...prev, alias: "This alias is already taken. Please choose another." }));
        return false;
      }
      return true;
    } catch {
      setAliasStatus(null);
      return true;
    }
  };

  const handleContinue = async () => {
    if (!validateDetails()) return;
    setLoading(true);
    try {
      if (!(await checkAlias())) return;
      router.push({
        pathname: "/sign-up/step/2",
        params: {
          ...params,
          alias: finalAlias,
          email: normalizedEmail,
          password: form.password,
          role: detectedRole,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = passwordScore === null ? COLORS.textMuted : passwordScore < 40 ? COLORS.danger : passwordScore < 65 ? COLORS.warning : COLORS.success;
  const scoreLabel = passwordScore === null ? "" : passwordScore < 40 ? "Weak" : passwordScore < 65 ? "Fair" : "Good";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md }} minBottomPadding={126}>
        <PageHeader title="Create Account" subtitle="Step 2 of 3: Account and security" color={COLORS.primary} onBack={() => router.back()} />

        <Card>
          <TextField label="Email address" value={form.email} onChangeText={(value) => updateField("email", value)} placeholder="you@example.com" error={errors.email} keyboardType="email-address" autoCapitalize="none" />
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: -SPACING.xs, marginBottom: SPACING.sm }}>Used for sign-in, account creation, and email verification. You will not need to enter it again.</Text>
          <TextField label="Sign-in Alias" value={form.alias} onChangeText={(value) => updateField("alias", value.toLowerCase().trim())} onBlur={checkAlias} placeholder={aliasPlaceholder} error={errors.alias} autoCapitalize="none" />
          {aliasStatus === "checking" ? <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>Checking alias...</Text> : null}
          {aliasStatus === "available" ? <Text style={{ color: COLORS.success, fontSize: FONT.sm }}>Alias available</Text> : null}
        </Card>

        {detectedRole !== "customer" ? <Card><Text style={{ color: COLORS.textSecondary }}>Role detected: <Text style={{ fontWeight: FONT.bold }}>{detectedRole.toUpperCase()}</Text></Text></Card> : null}

        <Card>
          <PasswordField label="Password" value={form.password} onChangeText={(value) => updateField("password", value)} error={errors.password} />
          {passwordScore !== null ? <View style={{ flexDirection: "row", alignItems: "center", marginTop: SPACING.xs }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: scoreColor, marginRight: SPACING.xs }} /><Text style={{ color: scoreColor, fontWeight: FONT.bold, fontSize: FONT.sm }}>Strength: {scoreLabel} ({passwordScore}/100)</Text></View> : null}
          <PasswordField label="Confirm Password" value={form.confirmPassword} onChangeText={(value) => updateField("confirmPassword", value)} error={errors.confirmPassword} />
        </Card>
      </KeyboardAwareScrollView>

      <StickyActionBar>
        <Button title={loading ? "Checking account..." : "Continue to verification"} onPress={handleContinue} variant="primary" loading={loading} disabled={loading || aliasStatus === "checking"} />
      </StickyActionBar>
    </SafeAreaView>
  );
}
