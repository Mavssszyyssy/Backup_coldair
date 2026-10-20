import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import StickyActionBar from "../../../../components/ui/StickyActionBar";
import TextField from "../../../../components/ui/TextField";
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import { useRegistrationDraft } from "../../../../context/RegistrationDraftContext";
import { getEmailDomainPolicy, requestVerificationOtp, verifyRegistrationOtp } from "../../../../services/api";
import { hasAllLegalConsents } from "../../../../services/legalConsent";
import { normalizeEmail, validateEmail } from "../../../../utils/authValidation";

const CODE_RESEND_MS = 60 * 1000;
const CODE_EXPIRES_MS = 5 * 60 * 1000;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000;
const formatSeconds = (remaining) => Math.max(0, Math.ceil(remaining / 1000));

export default function SignUpStep1() {
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const [email, setEmail] = useState(draft.email);
  const [codeSent, setCodeSent] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [blockUntil, setBlockUntil] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [activeEmailDomains, setActiveEmailDomains] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    let active = true;
    getEmailDomainPolicy().then((result) => {
      if (active && result.success) setActiveEmailDomains(result.activeDomains);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const normalizedEmail = normalizeEmail(email);
  const isBlocked = blockUntil > now;
  const resendCountdown = formatSeconds(resendAvailableAt - now);
  const codeExpiryCountdown = formatSeconds(codeExpiresAt - now);
  const blockCountdown = formatSeconds(blockUntil - now);
  const emailError = () => validateEmail(normalizedEmail, activeEmailDomains);

  const changeEmail = (value) => {
    setEmail(value);
    setError("");
    setCodeSent(false);
    setCodeInput("");
    setResendAvailableAt(0);
    setCodeExpiresAt(0);
    updateDraft({ email: normalizeEmail(value), emailVerified: false, registrationVerificationToken: "" });
  };

  const sendCode = async () => {
    if (!hasAllLegalConsents(draft.legalConsent)) {
      router.replace("/sign-up/step/0");
      return;
    }
    const validationError = emailError();
    if (validationError) { setError(validationError); return; }
    if (isBlocked) { Alert.alert("Verification Blocked", `Try again in ${blockCountdown}s.`); return; }
    if (resendCountdown > 0) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await requestVerificationOtp({ action: "register_email", channel: "email", email: normalizedEmail, phone: "", messenger_handle: "" });
      if (!result.success) { setError(result.error || "Unable to send verification code."); return; }
      const timestamp = Date.now();
      setCodeSent(true);
      setCodeInput("");
      setCodeExpiresAt(result.expiresAt ? new Date(result.expiresAt).getTime() : timestamp + CODE_EXPIRES_MS);
      setResendAvailableAt(result.resendAvailableAt ? new Date(result.resendAvailableAt).getTime() : timestamp + CODE_RESEND_MS);
      updateDraft({ email: normalizedEmail, emailVerified: false, registrationVerificationToken: "" });
    } catch (sendError) {
      setError(sendError?.message || "Unable to send verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!hasAllLegalConsents(draft.legalConsent)) { router.replace("/sign-up/step/0"); return; }
    const validationError = emailError();
    if (validationError) { setError(validationError); return; }
    if (draft.emailVerified && draft.email === normalizedEmail && draft.registrationVerificationToken) {
      router.push("/sign-up/step/2");
      return;
    }
    if (isBlocked) { setError(`Too many failed attempts. Try again in ${blockCountdown}s.`); return; }
    if (!codeSent) { setError("Send a verification code first."); return; }
    if (codeExpiresAt <= Date.now()) { setError("This verification code has expired. Please request a new one."); return; }
    if (!/^\d{6}$/.test(codeInput.trim())) { setError("Enter the 6-digit verification code."); return; }
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await verifyRegistrationOtp({ action: "register_email", channel: "email", email: normalizedEmail, phone: "", messenger_handle: "", code: codeInput.trim() });
      if (!result.success || !result.registrationVerificationToken) {
        const failedAttempts = attemptCount + 1;
        setAttemptCount(failedAttempts);
        if (failedAttempts >= 5) {
          setBlockUntil(Date.now() + BLOCK_DURATION_MS);
          setError("Too many failed attempts. Verification is blocked for 1 day.");
        } else {
          setError(result.error || `Incorrect code. ${5 - failedAttempts} attempt(s) remaining.`);
        }
        return;
      }
      updateDraft({ email: normalizedEmail, emailVerified: true, registrationVerificationToken: result.registrationVerificationToken });
      router.push("/sign-up/step/2");
    } catch (verifyError) {
      setError(verifyError?.message || "Unable to verify the code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md }} minBottomPadding={150}>
        <PageHeader title="Create Account" subtitle="Step 2 of 4: Verify email" color={COLORS.primary} onBack={() => router.back()} />
        <Card>
          <TextField label="Email address" value={email} onChangeText={changeEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={error && !codeSent ? error : ""} />
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>Your email is used for sign-in and verification.</Text>
          <Button title={resendCountdown > 0 && codeSent ? `Resend in ${resendCountdown}s` : codeSent ? "Resend Verification Code" : "Send Verification Code"} onPress={sendCode} variant="secondary" style={{ marginTop: SPACING.md }} disabled={resendCountdown > 0 || isBlocked || submitting} />
        </Card>
        {codeSent ? (
          <Card>
            <Text style={{ color: COLORS.textSecondary }}>Code sent to {normalizedEmail}. It expires in {codeExpiryCountdown}s.</Text>
            <TextField label="Verification Code" value={codeInput} onChangeText={(value) => { setCodeInput(value.replace(/\D/g, "").slice(0, 6)); setError(""); }} placeholder="Enter 6-digit code" keyboardType="number-pad" maxLength={6} error={error} />
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>Attempts used: {attemptCount}/5</Text>
          </Card>
        ) : null}
        {isBlocked ? <Card><Text style={{ color: COLORS.danger, fontWeight: FONT.bold }}>Verification blocked. Try again in {blockCountdown}s.</Text></Card> : null}
      </KeyboardAwareScrollView>
      <StickyActionBar>
        <Button title={submitting ? "Verifying..." : "Continue to account details"} onPress={verifyCode} variant="primary" loading={submitting} disabled={submitting || isBlocked} />
      </StickyActionBar>
    </SafeAreaView>
  );
}
