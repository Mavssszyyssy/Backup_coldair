import { ArrowLeft, ArrowRight, EnvelopeSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { apiRequest } from "../../config/api";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_GEOMETRY,
} from "../common/boutique/BoutiqueTheme";

export default function RegisterEmailOtpStep({
  formData,
  errors: externalErrors,
  onFieldChange,
  detectedRole,
  detectedRoleLabel,
  onNext,
  onBack,
}) {
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);

  // Combine errors
  const errors = {
    ...externalErrors,
    email: externalErrors.email || localError,
  };

  const handleNext = async (e) => {
    e.preventDefault();
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setLocalError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    setLocalError("");

    try {
      const response = await apiRequest("/auth/register/start", {
        method: "POST",
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.message) {
        onNext();
      } else {
        setLocalError("Unable to send a verification code.");
      }
    } catch (err) {
      setLocalError(err.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="bq-reg-step" onSubmit={handleNext}>
      <div className="bq-reg-header">
        <h3 className="bq-reg-title">Email Verification</h3>
        <p className="bq-reg-desc">
          Enter your email to receive a six-digit verification code.
        </p>
      </div>

      <BoutiqueInput
        label="Email Address"
        icon={EnvelopeSimple}
        type="email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={(e) => {
          onFieldChange("email", e.target.value);
          if (localError) setLocalError("");
        }}
        status={errors.email ? "error" : null}
        errorMessage={errors.email}
        required
      />

      {detectedRole !== "customer" && (
        <div className="bq-reg-role-pill">
          Role detected: <strong>{detectedRoleLabel}</strong>
        </div>
      )}

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
          disabled={loading}
        >
          {loading ? "Processing..." : "Continue"}{" "}
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
        .bq-reg-role-pill {
          background: ${BQ_COLORS.bgAlt}; padding: 12px 20px; border-radius: ${BQ_GEOMETRY.radiusMd};
          font-size: 14px; color: ${BQ_COLORS.inkMuted};
        }
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
      `,
        }}
      />
    </form>
  );
}
