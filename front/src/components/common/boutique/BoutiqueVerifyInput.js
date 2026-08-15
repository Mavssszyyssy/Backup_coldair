import { ShieldCheck, Spinner } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useVerification } from "../../../hooks/useVerification";
import BoutiqueBox from "./BoutiqueBox";
import BoutiqueInput from "./BoutiqueInput";
import BoutiqueStack from "./BoutiqueStack";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS } from "./BoutiqueTheme";

/**
 * BOUTIQUE VERIFY INPUT
 * Unified verification component for Phone and Messenger.
 */
export default function BoutiqueVerifyInput({
  label,
  icon,
  type = "text",
  placeholder,
  value,
  onValueChange,
  verified,
  onVerifiedChange,
  action, // 'register_phone' or 'register_messenger'
  channel, // 'sms' or 'messenger'
  validator, // Custom heuristic validator
  ...props
}) {
  const { requestOtp, verifyOtp, loading, error, timeLeft } =
    useVerification({
      recipient: value,
      channel,
      action,
    });

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");

  const heuristic = useMemo(() => {
    if (!value) return { status: null };
    if (validator) {
      const result = validator(value);
      if (!result.valid) {
        if (
          value.length > 5 ||
          (value.length >= 2 && result.reason?.includes("start"))
        ) {
          return { status: "error", reason: result.reason };
        }
        return { status: null };
      }
      return { status: "success" };
    }
    return { status: "success" };
  }, [value, validator]);

  const handlePerformRequest = async () => {
    if (heuristic.status === "error") return;
    await requestOtp();
    setOtpSent(true);
  };

  const handlePerformVerify = useCallback(async () => {
    setOtpError("");
    const result = await verifyOtp(otpCode);
    if (result.success) {
      onVerifiedChange(true);
      setOtpSent(false);
      setOtpCode("");
    } else {
      setOtpError(result.error);
      setOtpCode("");
    }
  }, [onVerifiedChange, otpCode, verifyOtp]);

  // Auto-verify on 6th digit.
  useEffect(() => {
    if (otpCode.length === 6 && otpSent && !loading && !verified) {
      handlePerformVerify();
    }
  }, [handlePerformVerify, loading, otpCode, otpSent, verified]);

  return (
    <BoutiqueStack gap={16} className="bq-verify-input bq-fade-in">
      <BoutiqueInput
        label={label}
        icon={icon}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
        }}
        disabled={verified || otpSent || loading}
        status={verified ? "success" : error ? "error" : heuristic.status}
        errorMessage={error || heuristic.reason}
        inlineAction={
          <BoutiqueBox direction="row" align="center" gap={8}>
            {!verified && !otpSent && (
              <button
                type="button"
                className="bq-verify-inline-btn"
                onClick={handlePerformRequest}
                disabled={loading || heuristic.status === "error" || !value}
              >
                {loading ? <Spinner className="bq-spin" size={16} /> : "Verify"}
              </button>
            )}
            {verified && (
              <BoutiqueBox
                className="bq-verified-badge"
                color={BQ_COLORS.success}
              >
                <ShieldCheck size={20} weight="fill" />
              </BoutiqueBox>
            )}
          </BoutiqueBox>
        }
        {...props}
      />

      {otpSent && !verified && (
        <BoutiqueStack
          gap={20}
          padding={28}
          background={BQ_COLORS.bg}
          className="bq-otp-panel bq-slide-down"
          style={{
            borderRadius: "24px",
            border: `1px solid ${BQ_COLORS.border}`,
          }}
        >
          <BoutiqueText
            size="14px"
            color={BQ_COLORS.inkMuted}
            style={{ lineHeight: 1.5 }}
          >
            Enter the 6-digit code sent to <strong>{value}</strong>.
          </BoutiqueText>

          <BoutiqueInput
            label="Security Code"
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
              fontWeight: "700",
              fontSize: "20px",
              fontFamily: "monospace",
            }}
            inlineAction={loading && <Spinner className="bq-spin" size={18} />}
          />

          <BoutiqueBox direction="row" justify="center" gap={16}>
            <button
              type="button"
              className="bq-otp-reset"
              onClick={() => {
                setOtpSent(false);
                setOtpError("");
                setOtpCode("");
              }}
            >
              Change {label}
            </button>
            {timeLeft > 0 ? (
              <BoutiqueText variant="caption" weight={700}>
                Resend in {timeLeft}s
              </BoutiqueText>
            ) : (
              <button
                type="button"
                className="bq-otp-reset"
                onClick={handlePerformRequest}
              >
                Resend Code
              </button>
            )}
          </BoutiqueBox>
        </BoutiqueStack>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-verify-inline-btn {
          padding: 8px 18px; background: ${BQ_COLORS.brand}; color: white;
          border: none; border-radius: 50px; font-size: 11px;
          font-weight: 700; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .bq-verify-inline-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .bq-verify-inline-btn:disabled { background: ${BQ_COLORS.border}; cursor: not-allowed; color: ${BQ_COLORS.inkFaint}; }

        .bq-otp-reset {
          background: none; border: none; font-size: 12px;
          font-weight: 700; cursor: pointer; text-decoration: underline; text-align: center;
          opacity: 0.6; color: ${BQ_COLORS.ink}; transition: opacity 0.2s;
        }
        .bq-otp-reset:hover { opacity: 1; }

        .bq-spin { animation: bq-spin 1s linear infinite; color: ${BQ_COLORS.accent}; }
        @keyframes bq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `,
        }}
      />
    </BoutiqueStack>
  );
}
