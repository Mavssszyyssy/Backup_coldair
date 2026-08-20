import {
  ArrowLeft,
  ArrowRight,
  EnvelopeSimple,
  Phone,
  ShieldCheck,
  Spinner,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../config/api";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");
const isPhone = (value) => /^09\d{9}$/.test(String(value || "").replace(/\D/g, ""));

export default function RegisterEmailStep({
  formData,
  errors: externalErrors,
  onFieldChange,
  detectedRole,
  detectedRoleLabel,
  onNext,
  onBack,
}) {
  const [loading, setLoading] = useState(false);
  const [destinationError, setDestinationError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [channel, setChannel] = useState(formData.verificationChannel || "email");

  const verified = channel === "email" ? Boolean(formData.emailVerified) : Boolean(formData.phoneVerified);
  const destination = channel === "email"
    ? String(formData.email || "").trim().toLowerCase()
    : String(formData.phone || "").replace(/\D/g, "");
  const destinationIsValid = channel === "email" ? isEmail(destination) : isPhone(destination);
  const visibleError = channel === "email" ? externalErrors.email || destinationError : destinationError;

  const resetOtp = () => {
    setOtpSent(false);
    setOtpCode("");
    setOtpError("");
  };

  const selectChannel = (nextChannel) => {
    setChannel(nextChannel);
    onFieldChange("verificationChannel", nextChannel);
    setDestinationError("");
    resetOtp();
  };

  const changeDestination = (field, value) => {
    onFieldChange(field, value);
    onFieldChange(field === "email" ? "emailVerified" : "phoneVerified", false);
    onFieldChange("registrationVerificationToken", "");
    setDestinationError("");
    resetOtp();
  };

  const sendCode = async () => {
    if (!destinationIsValid) {
      setDestinationError(
        channel === "email"
          ? "Enter a valid email address."
          : "Enter a valid 11-digit mobile number.",
      );
      return;
    }

    setLoading(true);
    setDestinationError("");
    setOtpError("");
    try {
      await apiRequest("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({
          action: channel === "email" ? "register_email" : "register_phone",
          channel,
          email: channel === "email" ? destination : "",
          phone: channel === "sms" ? destination : "",
        }),
      });
      setOtpSent(true);
      setOtpCode("");
    } catch (error) {
      setDestinationError(error?.message || "Unable to send the verification code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = useCallback(async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError("Enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setOtpError("");
    try {
      const result = await apiRequest("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          action: channel === "email" ? "register_email" : "register_phone",
          channel,
          email: channel === "email" ? destination : "",
          phone: channel === "sms" ? destination : "",
          code: otpCode,
        }),
      });
      onFieldChange(channel === "email" ? "emailVerified" : "phoneVerified", true);
      onFieldChange("registrationVerificationToken", result.registrationVerificationToken || "");
      setOtpSent(false);
      setOtpCode("");
    } catch (error) {
      setOtpError(error?.message || "The code is invalid or has expired.");
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  }, [channel, destination, onFieldChange, otpCode]);

  useEffect(() => {
    if (otpCode.length === 6 && otpSent && !loading && !verified) verifyCode();
  }, [otpCode, otpSent, loading, verified, verifyCode]);

  return (
    <BoutiqueStack gap={24} className="bq-reg-step bq-fade-in" height="100%">
      <BoutiqueBox className="bq-reg-header">
        <BoutiqueText variant="h2">Verify your contact</BoutiqueText>
        <BoutiqueText variant="body" color={BQ_COLORS.inkMuted} margin="8px 0 0">
          Choose one secure verification method to continue.
        </BoutiqueText>
      </BoutiqueBox>

      <BoutiqueBox direction="row" gap={8}>
        <button type="button" className={`bq-reg-inline-btn ${channel === "email" ? "selected" : ""}`} onClick={() => selectChannel("email")}>Email</button>
        <button type="button" className={`bq-reg-inline-btn ${channel === "sms" ? "selected" : ""}`} onClick={() => selectChannel("sms")}>SMS</button>
      </BoutiqueBox>

      {channel === "email" ? (
        <BoutiqueInput label="Email Address" icon={EnvelopeSimple} type="email" placeholder="you@example.com" value={formData.email} onChange={(event) => changeDestination("email", event.target.value)} disabled={otpSent || loading || verified} status={verified ? "success" : visibleError ? "error" : null} errorMessage={visibleError} required />
      ) : (
        <BoutiqueInput label="Mobile Number" icon={Phone} type="tel" placeholder="09XXXXXXXXX" value={formData.phone || ""} onChange={(event) => changeDestination("phone", event.target.value.replace(/\D/g, "").slice(0, 11))} disabled={otpSent || loading || verified} status={visibleError ? "error" : null} errorMessage={visibleError} required />
      )}

      {otpSent && !verified ? (
        <BoutiqueStack gap={20} padding={24} background="#f8fafc" style={{ borderRadius: 20, border: "1px solid #e2e8f0" }}>
          <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>Enter the 6-digit code sent to <strong>{destination}</strong>.</BoutiqueText>
          <BoutiqueInput label="Verification Code" icon={ShieldCheck} placeholder="000000" maxLength="6" value={otpCode} onChange={(event) => { setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }} status={otpError ? "error" : null} errorMessage={otpError} style={{ letterSpacing: "0.5em", textAlign: "center", fontWeight: 800, fontSize: 18, fontFamily: "monospace" }} />
          <BoutiqueBox direction="row" justify="center" gap={16}><button type="button" className="bq-otp-reset" onClick={resetOtp}>Change contact</button><button type="button" className="bq-otp-reset" onClick={sendCode} disabled={loading}>Resend code</button></BoutiqueBox>
        </BoutiqueStack>
      ) : null}

      {verified ? <BoutiqueBox padding={16} background="#ecfdf5" style={{ borderRadius: 12 }}><BoutiqueText color={BQ_COLORS.success} weight={800}>{channel === "email" ? "Email" : "Mobile number"} verified</BoutiqueText></BoutiqueBox> : null}
      {detectedRole !== "customer" ? <BoutiqueBox padding="12px 20px" background="#f1f5f9" style={{ borderRadius: 12 }}><BoutiqueText size="14px">Role detected: <strong>{detectedRoleLabel}</strong></BoutiqueText></BoutiqueBox> : null}

      <BoutiqueBox direction="row" align="center" justify="space-between" margin="auto 0 0"><BoutiqueButton variant="ghost" onClick={onBack} disabled={loading}><ArrowLeft size={18} weight="bold" /> Back</BoutiqueButton><BoutiqueButton onClick={verified ? onNext : otpSent ? verifyCode : sendCode} disabled={loading || (otpSent && otpCode.length !== 6)}>{loading ? <Spinner className="bq-spin" size={18} /> : verified ? <>Continue <ArrowRight size={18} weight="bold" /></> : otpSent ? "Verify code" : `Send ${channel === "email" ? "email" : "SMS"} code`}</BoutiqueButton></BoutiqueBox>

      <style dangerouslySetInnerHTML={{ __html: `.bq-reg-inline-btn{padding:8px 16px;background:#e2e8f0;color:${BQ_COLORS.ink};border:0;border-radius:50px;font-size:11px;font-weight:800;cursor:pointer;text-transform:uppercase}.bq-reg-inline-btn.selected{background:${BQ_COLORS.brand};color:#fff}.bq-reg-inline-btn:disabled,.bq-otp-reset:disabled{opacity:.5;cursor:not-allowed}.bq-otp-reset{background:none;border:0;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;color:${BQ_COLORS.ink}}.bq-spin{animation:bq-spin 1s linear infinite}@keyframes bq-spin{to{transform:rotate(360deg)}}` }} />
    </BoutiqueStack>
  );
}
