import { ArrowLeft, ArrowRight, EnvelopeSimple, ShieldCheck, Spinner } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../config/api";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

export default function RegisterEmailStep({ formData, errors: externalErrors, onFieldChange, detectedRole, detectedRoleLabel, onNext, onBack }) {
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const isVerified = Boolean(formData.emailVerified);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || "");
  const finalEmailError = externalErrors.email || emailError;

  const sendCode = async () => {
    if (!validEmail) { setEmailError("Enter a valid email address."); return; }
    setLoading(true); setEmailError(""); setOtpError("");
    try {
      await apiRequest("/auth/request-otp", { method: "POST", body: JSON.stringify({ action: "register_email", channel: "email", email: formData.email.trim().toLowerCase() }) });
      setOtpSent(true); setOtpCode("");
    } catch (error) { setEmailError(error?.message || "Unable to send the email verification code."); }
    finally { setLoading(false); }
  };

  const verifyCode = useCallback(async () => {
    if (!/^\d{6}$/.test(otpCode)) { setOtpError("Enter the 6-digit email code."); return; }
    setLoading(true); setOtpError("");
    try {
      await apiRequest("/auth/verify-otp", { method: "POST", body: JSON.stringify({ action: "register_email", channel: "email", email: formData.email.trim().toLowerCase(), code: otpCode }) });
      onFieldChange("emailVerified", true); setOtpSent(false); setOtpCode("");
    } catch (error) { setOtpError(error?.message || "The code is invalid or has expired."); setOtpCode(""); }
    finally { setLoading(false); }
  }, [formData.email, onFieldChange, otpCode]);

  useEffect(() => { if (otpCode.length === 6 && otpSent && !loading && !isVerified) verifyCode(); }, [otpCode, otpSent, loading, isVerified, verifyCode]);

  const changeEmail = () => { setOtpSent(false); setOtpCode(""); setOtpError(""); onFieldChange("emailVerified", false); };

  return (
    <BoutiqueStack gap={24} className="bq-reg-step bq-fade-in" height="100%">
      <BoutiqueBox className="bq-reg-header">
        <BoutiqueText variant="h2">Email verification</BoutiqueText>
        <BoutiqueText variant="body" color={BQ_COLORS.inkMuted} margin="8px 0 0">We will send a 6-digit code to confirm your email.</BoutiqueText>
      </BoutiqueBox>

      <BoutiqueInput label="Email Address" icon={EnvelopeSimple} type="email" placeholder="you@example.com" value={formData.email} onChange={(event) => { onFieldChange("email", event.target.value); changeEmail(); }} disabled={otpSent || isVerified || loading} status={isVerified ? "success" : finalEmailError ? "error" : null} errorMessage={finalEmailError} required inlineAction={isVerified ? <ShieldCheck size={20} weight="fill" color={BQ_COLORS.success} /> : !otpSent ? <button type="button" className="bq-reg-inline-btn" onClick={sendCode} disabled={loading || !validEmail}>{loading ? <Spinner className="bq-spin" size={16} /> : "Send code"}</button> : null} />

      {otpSent && !isVerified ? <BoutiqueStack gap={20} padding={24} background="#f8fafc" style={{ borderRadius: 20, border: "1px solid #e2e8f0" }}>
        <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>Enter the 6-digit code sent to <strong>{formData.email}</strong>.</BoutiqueText>
        <BoutiqueInput label="Email verification code" icon={ShieldCheck} placeholder="000000" maxLength="6" value={otpCode} onChange={(event) => { setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }} status={otpError ? "error" : null} errorMessage={otpError} style={{ letterSpacing: "0.5em", textAlign: "center", fontWeight: 800, fontSize: 18, fontFamily: "monospace" }} />
        <BoutiqueBox direction="row" justify="center" gap={16}><button type="button" className="bq-otp-reset" onClick={changeEmail}>Change email</button><button type="button" className="bq-otp-reset" onClick={sendCode} disabled={loading}>Resend code</button></BoutiqueBox>
      </BoutiqueStack> : null}

      {isVerified ? <BoutiqueBox padding={16} background="#ecfdf5" style={{ borderRadius: 12 }}><BoutiqueText color={BQ_COLORS.success} weight={800}>Email verified</BoutiqueText></BoutiqueBox> : null}
      {detectedRole !== "customer" ? <BoutiqueBox padding="12px 20px" background="#f1f5f9" style={{ borderRadius: 12 }}><BoutiqueText size="14px">Role detected: <strong>{detectedRoleLabel}</strong></BoutiqueText></BoutiqueBox> : null}

      <BoutiqueBox direction="row" align="center" justify="space-between" margin="auto 0 0"><BoutiqueButton variant="ghost" onClick={onBack} disabled={loading}><ArrowLeft size={18} weight="bold" /> Back</BoutiqueButton><BoutiqueButton onClick={isVerified ? onNext : otpSent ? verifyCode : sendCode} disabled={loading || (otpSent && otpCode.length !== 6)}>{loading ? <Spinner className="bq-spin" size={18} /> : isVerified ? <>Continue <ArrowRight size={18} weight="bold" /></> : otpSent ? "Verify code" : "Send email code"}</BoutiqueButton></BoutiqueBox>

      <style dangerouslySetInnerHTML={{ __html: `.bq-reg-inline-btn{padding:8px 16px;background:${BQ_COLORS.brand};color:#fff;border:0;border-radius:50px;font-size:11px;font-weight:800;cursor:pointer;text-transform:uppercase}.bq-reg-inline-btn:disabled,.bq-otp-reset:disabled{opacity:.5;cursor:not-allowed}.bq-otp-reset{background:none;border:0;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;color:${BQ_COLORS.ink}}.bq-spin{animation:bq-spin 1s linear infinite}@keyframes bq-spin{to{transform:rotate(360deg)}}` }} />
    </BoutiqueStack>
  );
}
