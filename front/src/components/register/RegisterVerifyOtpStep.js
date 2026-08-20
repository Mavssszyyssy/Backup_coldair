import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Spinner,
  WarningDiamond,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../config/api";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";

export default function RegisterVerifyOtpStep({
  formData,
  onFieldChange,
  onNext,
  onBack,
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isVerified = Boolean(formData.emailVerified);

  // Real-time verification when code reaches 6 digits
  useEffect(() => {
    if (code.length === 6 && !isVerified && !loading) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();

    if (isVerified) {
      onNext();
      return;
    }
    if (!code || code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/auth/register/verify", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          code,
        }),
      });

      if (response.registrationProgress || response.registrationVerificationToken) {
        onFieldChange("emailVerified", true);
        onFieldChange("registrationVerificationToken", response.registrationVerificationToken || "");
      } else {
        setError(response.message || "Verification failed.");
      }
    } catch (err) {
      setError(
        err.message ||
          "Verification failed. Please ensure your code is correct.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="bq-reg-step" onSubmit={handleVerify}>
      <div className="bq-reg-header">
        <h3 className="bq-reg-title">Verify your email</h3>
        <p className="bq-reg-desc">
          Enter the six-digit code sent to your email address.
        </p>
      </div>

      <BoutiqueInput
        label="6-Digit Code"
        icon={ShieldCheck}
        placeholder="000000"
        maxLength="6"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        status={isVerified ? "success" : error ? "error" : null}
        disabled={isVerified || loading}
        style={{
          letterSpacing: "0.5em",
          textAlign: "center",
          fontWeight: "900",
          fontSize: "24px",
          fontFamily: "monospace",
        }}
      >
        {loading && (
          <div className="bq-reg-input-loader">
            <Spinner size={20} weight="bold" className="bq-spin" />
          </div>
        )}
      </BoutiqueInput>

      <div
        className={`bq-match-indicator ${isVerified ? "success" : error ? "error" : "faint"}`}
      >
        {isVerified ? (
          <>
            <ShieldCheck size={14} weight="fill" /> Code verified successfully
          </>
        ) : error ? (
          <>
            <WarningDiamond size={14} weight="bold" /> {error}
          </>
        ) : loading ? (
          <>
            <Spinner size={14} weight="bold" className="bq-spin" /> Validating
            code...
          </>
        ) : (
          <>Please enter the 6-digit code from your app</>
        )}
      </div>

      <div className="bq-reg-actions">
        <button
          type="button"
          className="bq-reg-btn bq-reg-btn--ghost"
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft size={18} weight="bold" /> Back
        </button>
        <button
          type="submit"
          className="bq-reg-btn bq-reg-btn--primary"
          disabled={loading || (code.length < 6 && !isVerified)}
        >
          {isVerified
            ? "Continue"
            : loading
              ? "Verifying..."
              : "Verify & Continue"}{" "}
          <ArrowRight size={18} weight="bold" />
        </button>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-reg-step { display: flex; flex-direction: column; gap: 32px; width: 100%; height: 100%; }
        .bq-reg-header { margin-bottom: 8px; }
        .bq-reg-title { font-family: ${BQ_FONTS.heading}; font-size: 24px; font-weight: 800; color: ${BQ_COLORS.ink}; margin: 0; }
        .bq-reg-desc { font-size: 15px; color: ${BQ_COLORS.inkMuted}; margin-top: 8px; }

        .bq-totp-container {
          display: flex; flex-direction: column; align-items: center; gap: 24px;
          padding: 32px; background: ${BQ_COLORS.bgAlt}; border-radius: ${BQ_GEOMETRY.radiusCard};
          position: relative;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bq-debug-card { background: #fff7ed; border: 2px dashed #f97316; }
        .bq-debug-card.collapsed {
          padding: 16px;
          background: rgba(128, 128, 128, 0.5);
          border: 2px dashed rgba(128, 128, 128, 0.2);
          gap: 0;
        }

        .bq-debug-badge {
          position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
          background: #f97316; color: white; padding: 6px 16px; border-radius: ${BQ_GEOMETRY.radiusPill};
          font-family: ${BQ_FONTS.heading}; font-size: 11px; font-weight: 950;
          display: flex; align-items: center; gap: 6px; white-space: nowrap;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
          border: none; cursor: pointer; transition: all 0.3s ease;
          z-index: 20;
        }
        .bq-debug-card.collapsed .bq-debug-badge {
          background: #64748b;
          box-shadow: 0 4px 12px rgba(100, 116, 139, 0.2);
          top: 50%; transform: translate(-50%, -50%);
        }

        .bq-debug-content { display: flex; flex-direction: column; align-items: center; gap: 24px; width: 100%; animation: fadeIn 0.4s ease; }
        .bq-qr-wrap { padding: 16px; background: white; border-radius: 20px; box-shadow: ${BQ_SHADOWS.soft}; line-height: 0; }
        .bq-secret-box {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 20px; background: white; border-radius: ${BQ_GEOMETRY.radiusPill};
          font-family: monospace; font-size: 14px; color: ${BQ_COLORS.ink};
          box-shadow: ${BQ_SHADOWS.soft};
        }
        .bq-secret-box code { font-weight: 700; letter-spacing: 0.1em; }

        .bq-reg-input-loader { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: ${BQ_COLORS.accent}; }

        .bq-match-indicator { margin-top: 8px; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; transition: all 0.3s ease; }
        .bq-match-indicator.success { color: ${BQ_COLORS.success}; }
        .bq-match-indicator.error { color: ${BQ_COLORS.danger}; }
        .bq-match-indicator.faint { color: ${BQ_COLORS.inkFaint}; }

        .bq-reg-actions { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
        .bq-reg-btn {
          padding: 14px 24px; border-radius: ${BQ_GEOMETRY.radiusPill};
          font-family: ${BQ_FONTS.heading}; font-weight: 800; font-size: 14px;
          text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer;
          display: flex; align-items: center; gap: 10px; transition: all 0.3s; border: none;
        }
        .bq-reg-btn--primary { background: ${BQ_COLORS.brand}; color: white; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .bq-reg-btn--primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(0,0,0,0.2); }
        .bq-reg-btn--ghost { background: transparent; color: ${BQ_COLORS.inkMuted}; }
        .bq-reg-btn--ghost:hover:not(:disabled) { color: ${BQ_COLORS.ink}; background: ${BQ_COLORS.bgAlt}; }
        .bq-reg-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .bq-spin { animation: bq-spin 1s linear infinite; }
        @keyframes bq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `,
        }}
      />
    </form>
  );
}
