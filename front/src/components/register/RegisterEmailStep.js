import {
  ArrowLeft,
  ArrowRight,
  EnvelopeSimple,
  ShieldCheck,
  Spinner,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../config/api";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

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
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const isVerified = formData.emailVerified;
  const hasSecret = Boolean(formData.registrationSecret);

  // Combine external and email errors
  const finalEmailError = externalErrors.email || emailError;

  // Real-time verification when 6 digits are reached
  useEffect(() => {
    if (otpCode.length === 6 && hasSecret && !isVerified && !loading) {
      handleVerifyCode();
    }
  }, [otpCode]);

  const handleStartVerification = async () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    setEmailError("");

    try {
      const response = await apiRequest("/auth/register/start", {
        method: "POST",
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.secret) {
        onFieldChange("registrationSecret", response.secret);
        onFieldChange("provisioningUri", response.provisioningUri);
        if (response.verifiedCode) {
          onFieldChange("emailVerified", true);
        }
      } else {
        setEmailError(response.message || "Failed to initialize verification.");
      }
    } catch (err) {
      setEmailError(err.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setOtpError("");

    try {
      const response = await apiRequest("/auth/register/verify", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          code: otpCode,
          secret: formData.registrationSecret,
        }),
      });

      if (response.registrationProgress || response.sessionToken) {
        onFieldChange("emailVerified", true);
        setOtpCode("");
      } else {
        setOtpError(response.message || "Verification failed.");
      }
    } catch (err) {
      setOtpError(err.message || "Verification failed. Check your code.");
      setOtpCode(""); // Clear code on failure
    } finally {
      setLoading(false);
    }
  };

  return (
    <BoutiqueStack gap={24} className="bq-reg-step bq-fade-in" height="100%">
      <BoutiqueBox className="bq-reg-header">
        <BoutiqueText variant="h2" className="bq-reg-title">
          Email Verification
        </BoutiqueText>
        <BoutiqueText
          variant="body"
          className="bq-reg-desc"
          margin="8px 0 0"
          style={{ opacity: 0.8 }}
        >
          Verify your email to receive your security secret.
        </BoutiqueText>
      </BoutiqueBox>

      <BoutiqueInput
        label="Email Address"
        icon={EnvelopeSimple}
        type="email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={(e) => {
          onFieldChange("email", e.target.value);
          if (emailError) setEmailError("");
        }}
        disabled={hasSecret || isVerified || loading}
        status={isVerified ? "success" : finalEmailError ? "error" : null}
        errorMessage={finalEmailError}
        inlineAction={
          isVerified ? (
            <BoutiqueBox
              className="bq-verified-badge"
              direction="row"
              align="center"
            >
              <ShieldCheck size={18} weight="fill" />
            </BoutiqueBox>
          ) : (
            !hasSecret && (
              <button
                type="button"
                className="bq-reg-inline-btn"
                onClick={handleStartVerification}
                disabled={loading || !formData.email}
              >
                {loading ? <Spinner className="bq-spin" size={16} /> : "Verify"}
              </button>
            )
          )
        }
      />

      {/* TOTP SETUP PANE */}
      {hasSecret && !isVerified && (
        <BoutiqueStack
          gap={24}
          padding={24}
          background="#f8fafc"
          className="bq-otp-pane bq-slide-down"
          style={{ borderRadius: "20px", border: "1.5px solid #e2e8f0" }}
        >
          <BoutiqueText
            variant="caption"
            color={BQ_COLORS.inkMuted}
            style={{ lineHeight: 1.6 }}
          >
            Enter the 6-digit security code from your authenticator app to
            complete verification.
          </BoutiqueText>

          <BoutiqueInput
            label="Enter 6-Digit Code"
            icon={ShieldCheck}
            placeholder="000000"
            maxLength="6"
            value={otpCode}
            onChange={(e) => {
              setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              if (otpError) setOtpError("");
            }}
            status={otpError ? "error" : null}
            errorMessage={otpError}
            style={{
              letterSpacing: "0.5em",
              textAlign: "center",
              fontWeight: "800",
              fontSize: "18px",
              fontFamily: "monospace",
            }}
            inlineAction={
              loading && (
                <BoutiqueBox
                  className="bq-verified-badge"
                  direction="row"
                  align="center"
                >
                  <Spinner className="bq-spin" size={18} />
                </BoutiqueBox>
              )
            }
          />

          <BoutiqueBox align="center">
            <button
              type="button"
              className="bq-otp-cancel"
              onClick={() => {
                onFieldChange("registrationSecret", "");
                onFieldChange("provisioningUri", "");
                setOtpError("");
              }}
            >
              Change Email
            </button>
          </BoutiqueBox>
        </BoutiqueStack>
      )}

      {detectedRole !== "customer" && (
        <BoutiqueBox
          padding="12px 20px"
          background="#f1f5f9"
          style={{ borderRadius: "12px", opacity: 0.8 }}
        >
          <BoutiqueText size="14px">
            Role detected: <strong>{detectedRoleLabel}</strong>
          </BoutiqueText>
        </BoutiqueBox>
      )}

      <BoutiqueBox
        direction="row"
        align="center"
        justify="space-between"
        margin="auto 0 0"
        className="bq-reg-actions"
      >
        <BoutiqueButton variant="ghost" onClick={onBack} disabled={loading}>
          <ArrowLeft size={18} weight="bold" /> Back
        </BoutiqueButton>
        <BoutiqueButton onClick={onNext} disabled={loading || !isVerified}>
          Continue <ArrowRight size={18} weight="bold" />
        </BoutiqueButton>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-reg-inline-btn {
          padding: 8px 16px; background: var(--field-accent); color: white;
          border: none; border-radius: 50px; font-size: 11px;
          font-weight: 800; cursor: pointer; transition: all 0.2s;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .bq-reg-inline-btn:hover:not(:disabled) { filter: brightness(1.1); transform: scale(1.05); }

        .bq-otp-cancel { background: none; border: none; font-size: 12px; cursor: pointer; text-decoration: underline; opacity: 0.6; }
        .bq-otp-cancel:hover { opacity: 1; }

        .bq-spin { animation: bq-spin 1s linear infinite; color: ${BQ_COLORS.accent}; }
        @keyframes bq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `,
        }}
      />
    </BoutiqueStack>
  );
}
