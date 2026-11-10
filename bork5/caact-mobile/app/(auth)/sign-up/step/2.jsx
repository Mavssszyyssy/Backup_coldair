import { useRouter } from "expo-router";
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
import { useRegistrationDraft } from "../../../../context/RegistrationDraftContext";
import { hasAllLegalConsents } from "../../../../services/legalConsent";
import { useInterfaceLanguage } from "../../../../hooks/useInterfaceLanguage";
import {
  normalizeEmail,
  validateConfirmPassword,
  validatePersonName,
  validatePasswordStrength,
  passwordStrengthLabel,
} from "../../../../utils/authValidation";

function defaultAliasFromEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.includes("@") ? normalized.split("@")[0].slice(0, 48) : "";
}

function validateAlias(value) {
  const alias = String(value || "").trim();
  if (!alias) return "";
  if (alias.length < 6) return "Username must be at least 6 characters.";
  if (alias.length > 36) return "Username must not exceed 36 characters.";
  if (!/^[a-zA-Z0-9._-]+$/.test(alias)) return "Username may only use letters, numbers, dot, underscore, and hyphen.";
  return "";
}

export default function SignUpStep2() {
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const [form, setForm] = useState({
    name_first: draft.name_first, name_last: draft.name_last, suffix: draft.suffix,
    alias: draft.alias, password: draft.password, confirmPassword: draft.confirmPassword,
  });
  const [errors, setErrors] = useState({});
  const [aliasStatus, setAliasStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const normalizedEmail = useMemo(() => normalizeEmail(draft.email), [draft.email]);
  const aliasPlaceholder = useMemo(() => defaultAliasFromEmail(normalizedEmail) || "juan.dc", [normalizedEmail]);
  const finalAlias = useMemo(() => (form.alias.trim() || aliasPlaceholder).toLowerCase(), [aliasPlaceholder, form.alias]);
  const passwordScore = useMemo(() => form.password ? validatePasswordStrength(form.password).score : null, [form.password]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    updateDraft({ [key]: value });
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if (key === "alias") setAliasStatus(null);
  };

  const validateDetails = () => {
    const nextErrors = {};
    const firstNameError = validatePersonName(form.name_first, "First name");
    const lastNameError = validatePersonName(form.name_last, "Last name");
    const aliasError = validateAlias(form.alias);
    const confirmPasswordError = validateConfirmPassword(form.password, form.confirmPassword);
    if (firstNameError) nextErrors.name_first = t(firstNameError);
    if (lastNameError) nextErrors.name_last = t(lastNameError);
    if (aliasError) nextErrors.alias = t(aliasError);
    if (!form.password) nextErrors.password = t("Password is required.");
    else if (form.password.length < 8) nextErrors.password = t("Password must be at least 8 characters.");
    else if (form.password.length > 25) nextErrors.password = t("Password must not exceed 25 characters.");
    else if ((passwordScore ?? 0) < 65) nextErrors.password = t("Password is not strong enough. Aim for Strong strength.");
    if (confirmPasswordError) nextErrors.confirmPassword = t(confirmPasswordError);
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
        setErrors((prev) => ({ ...prev, alias: t("This username is already taken. Please choose another.") }));
        return false;
      }
      return true;
    } catch {
      setAliasStatus(null);
      return true;
    }
  };

  const handleContinue = async () => {
    if (!hasAllLegalConsents(draft.legalConsent) || !draft.emailVerified || !draft.registrationVerificationToken) {
      router.replace("/sign-up/step/0");
      return;
    }
    if (!validateDetails()) return;
    setLoading(true);
    try {
      if (!(await checkAlias())) return;
      updateDraft({ ...form, alias: finalAlias });
      router.push("/sign-up/step/3");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = passwordScore === null ? COLORS.textMuted : passwordScore < 40 ? COLORS.danger : passwordScore < 65 ? COLORS.warning : COLORS.success;
  const scoreLabel = passwordScore === null ? "" : t(passwordStrengthLabel(passwordScore));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md }} minBottomPadding={126}>
        <PageHeader title={t("Create Account")} subtitle={t("Step 3 of 4: Account and security")} color={COLORS.primary} onBack={() => router.back()} />

        <Card>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginBottom: SPACING.sm }}>{t("Verified email:")} {normalizedEmail}</Text>
          <TextField label={t("First Name")} value={form.name_first} maxLength={30} helperText={`${form.name_first?.length || 0}/30`} onChangeText={(value) => updateField("name_first", String(value || "").replace(/[0-9]/g, ""))} placeholder={t("First name")} error={errors.name_first} />
          <TextField label={t("Last Name")} value={form.name_last} maxLength={30} helperText={`${form.name_last?.length || 0}/30`} onChangeText={(value) => updateField("name_last", String(value || "").replace(/[0-9]/g, ""))} placeholder={t("Last name")} error={errors.name_last} />
          <TextField label={t("Suffix (optional)")} value={form.suffix} onChangeText={(value) => updateField("suffix", value)} placeholder="Jr., Sr., III, etc." />
          <TextField label={t("Username")} value={form.alias} onChangeText={(value) => updateField("alias", value.toLowerCase().trim())} onBlur={checkAlias} placeholder={aliasPlaceholder} error={errors.alias} autoCapitalize="none" />
          {aliasStatus === "checking" ? <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>{t("Checking username...")}</Text> : null}
          {aliasStatus === "available" ? <Text style={{ color: COLORS.success, fontSize: FONT.sm }}>{t("Username available")}</Text> : null}
        </Card>

        <Card>
          <PasswordField label={t("Password")} value={form.password} maxLength={25} onChangeText={(value) => updateField("password", value)} error={errors.password} />
          {passwordScore !== null ? <View style={{ flexDirection: "row", alignItems: "center", marginTop: SPACING.xs }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: scoreColor, marginRight: SPACING.xs }} /><Text style={{ color: scoreColor, fontWeight: FONT.bold, fontSize: FONT.sm }}>{t("Strength:")} {scoreLabel} ({passwordScore}/100)</Text></View> : null}
          <PasswordField label={t("Confirm Password")} value={form.confirmPassword} maxLength={25} onChangeText={(value) => updateField("confirmPassword", value)} error={errors.confirmPassword} />
        </Card>
      </KeyboardAwareScrollView>

      <StickyActionBar>
        <Button title={t(loading ? "Checking account..." : "Continue to delivery address")} onPress={handleContinue} variant="primary" loading={loading} disabled={loading || aliasStatus === "checking"} />
      </StickyActionBar>
    </SafeAreaView>
  );
}
