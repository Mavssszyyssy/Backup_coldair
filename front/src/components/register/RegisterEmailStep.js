import { ArrowLeft, ArrowRight, EnvelopeSimple, Phone, ShieldCheck, Spinner } from "@phosphor-icons/react";
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
  const [channel, setChannel] = useState("email");
  const isVerified = channel === "email" ? Boolean(formData.emailVerified) : Boolean(formData.phoneVerified);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || "");
  const validPhone = /^09\d{9}$/.test(String(formData.phone || "").replace(/\D/g, ""));
  const target = channel === "email" ? formData.email.trim().toLowerCase() : String(formData.phone || "").replace(/\D/g, "");
  const finalEmailError = externalErrors.email || emailError;

  const sendCode = async () => {
    if (!validEmail || (channel === "sms" && !validPhone)) { setEmailError(channel === "sms" ? "Enter a valid 11-digit mobile number." : "Enter a valid email address."); return; }
    setLoading(true); setEmailError(""); setOtpError("");
    try {
      await apiRequest("/auth/request-otp", { method: "POST", body: JSON.stringify({ action: channel === "email" ? "register_email" : "register_phone", channel, email: formData.email.trim().toLowerCase(), phone: target }) });
      setOtpSent(true); setOtpCode("");
    } catch (error) { setEmailError(error?.message || "Unable to send the email verification code."); }
    finally { setLoading(false); }
  };

  const verifyCode = useCallback(async () => {
    if (!/^\d{6}$/.test(otpCode)) { setOtpError("Enter the 6-digit email code."); return; }
    setLoading(true); setOtpError("");
    try {
      const result = await apiRequest("/auth/verify-otp", { method: "POST", body: JSON.stringify({ action: channel === "email" ? "register_email" : "register_phone", channel, email: formData.email.trim().toLowerCase(), phone: target, code: otpCode }) });
      onFieldChange(channel === "email" ? "emailVerified" : "phoneVerified", true);
      onFieldChange("registrationVerificationToken", result.registrationVerificationToken || "");
      setOtpSent(false); setOtpCode("");
    } catch (error) { setOtpError(error?.message || "The code is invalid or has expired."); setOtpCode(""); }
    finally { setLoading(false); }
  }, [channel, formData.email, onFieldChange, otpCode, target]);

  useEffect(() => { if (otpCode.length === 6 && otpSent && !loading && !isVerified) verifyCode(); }, [otpCode, otpSent, loading, isVerified, verifyCode]);

  const changeDestination = (nextChannel = channel) => { setOtpSent(false); setOtpCode(""); setOtpError(""); onFieldChange(nextChannel === "email" ? "emailVerified" : "phoneVerified", false); };

  return (
    <BoutiqueStack gap={24} className="bq-reg-step bq-fade-in" height="100%">
      <BoutiqueBox className="bq-reg-header">
        <BoutiqueText variant="h2">Email verification</BoutiqueText>
        <BoutiqueText variant="body" color={BQ_COLORS.inkMuted} margin="8px 0 0">Choose email or SMS for your six-digit verification code.</BoutiqueText>
      </BoutiqueBox>

      <BoutiqueBox direction="row" gap={8}><button type="button" className={`bq-reg-inline-btn ${channel === "email" ? "selected" : ""}`} onClick={() => { setChannel("email"); changeDestination("email"); }}>Email</button><button type="button" className={`bq-reg-inline-btn ${channel === "sms" ? "selected" : ""}`} onClick={() => { setChannel("sms"); changeDestination("sms"); }}>SMS</button></BoutiqueBox>
      <BoutiqueInput label="Email Address" icon={EnvelopeSimple} type="email" placeholder="you@example.com" value={formData.email} onChange={(event) => { onFieldChange("email", event.target.value); changeDestination("email"); }} disabled={otpSent || loading} status={channel === "email" && isVerified ? "success" : finalEmailError ? "error" : null} errorMessage={finalEmailError} required />
      {channel === "sms" ? <BoutiqueInput label="Mobile Number" icon={Phone} type="tel" placeholder="09XXXXXXXXX" value={formData.phone || ""} onChange={(event) => { onFieldChange("phone", event.target.value.replace(/\D/g, "").slice(0, 11)); changeDestination("sms"); }} disabled={otpSent || loading} required /> : null}

      {otpSent && !isVerified ? <BoutiqueStack gap={20} padding={24} background="#f8fafc" style={{ borderRadius: 20, border: "1px solid #e2e8f0" }}>
        <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>Enter the 6-digit code sent to <strong>{target}</strong>.</BoutiqueText>
        <BoutiqueInput label={`${channel === "email" ? "Email" : "SMS"} verification code`} icon={ShieldCheck} placeholder="000000" maxLength="6" value={otpCode} onChange={(event) => { setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }} status={otpError ? "error" : null} errorMessage={otpError} style={{ letterSpacing: "0.5em", textAlign: "center", fontWeight: 800, fontSize: 18, fontFamily: "monospace" }} />
        <BoutiqueBox direction="row" justify="center" gap={16}><button type="button" className="bq-otp-reset" onClick={changeDestination}>Change destination</button><button type="button" className="bq-otp-reset" onClick={sendCode} disabled={loading}>Resend code</button></BoutiqueBox>
      </BoutiqueStack> : null}

      {isVerified ? <BoutiqueBox padding={16} background="#ecfdf5" style={{ borderRadius: 12 }}><BoutiqueText color={BQ_COLORS.success} weight={800}>{channel === "email" ? "Email" : "Mobile number"} verified</BoutiqueText></BoutiqueBox> : null}
      {detectedRole !== "customer" ? <BoutiqueBox padding="12px 20px" background="#f1f5f9" style={{ borderRadius: 12 }}><BoutiqueText size="14px">Role detected: <strong>{detectedRoleLabel}</strong></BoutiqueText></BoutiqueBox> : null}

      <BoutiqueBox direction="row" align="center" justify="space-between" margin="auto 0 0"><BoutiqueButton variant="ghost" onClick={onBack} disabled={loading}><ArrowLeft size={18} weight="bold" /> Back</BoutiqueButton><BoutiqueButton onClick={isVerified ? onNext : otpSent ? verifyCode : sendCode} disabled={loading || (otpSent && otpCode.length !== 6)}>{loading ? <Spinner className="bq-spin" size={18} /> : isVerified ? <>Continue <ArrowRight size={18} weight="bold" /></> : otpSent ? "Verify code" : `Send ${channel === "email" ? "email" : "SMS"} code`}</BoutiqueButton></BoutiqueBox>

      <style dangerouslySetInnerHTML={{ __html: `.bq-reg-inline-btn{padding:8px 16px;background:${BQ_COLORS.brand};color:#fff;border:0;border-radius:50px;font-size:11px;font-weight:800;cursor:pointer;text-transform:uppercase}.bq-reg-inline-btn:disabled,.bq-otp-reset:disabled{opacity:.5;cursor:not-allowed}.bq-otp-reset{background:none;border:0;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;color:${BQ_COLORS.ink}}.bq-spin{animation:bq-spin 1s linear infinite}@keyframes bq-spin{to{transform:rotate(360deg)}}` }} />
    </BoutiqueStack>
  );
}
