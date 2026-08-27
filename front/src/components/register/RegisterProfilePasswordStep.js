import {
  ArrowRight,
  Buildings,
  LockKey,
  ShieldCheck,
  Spinner,
  User,
  UserCircle,
  WarningDiamond,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import zxcvbn from "zxcvbn";
import { apiRequest } from "../../config/api";
import { BRANCHES } from "../../domain/branches/branches";
import { defaultAliasFromEmail } from "../../domain/register/defaultAliasFromEmail";
import { validateProfileAndSecurityStep } from "../../domain/register/validateRegistrationProfile";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueGrid from "../common/boutique/BoutiqueGrid";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

export default function RegisterProfilePasswordStep({
  formData,
  errors: externalErrors,
  onFieldChange,
  detectedRole,
  detectedRoleLabel,
  onNext,
  onCancel,
}) {
  const [localErrors, setLocalErrors] = useState({});
  const [aliasStatus, setAliasStatus] = useState(null); // null, 'checking', 'available', 'taken'

  // Combine external and local errors
  const errors = { ...externalErrors, ...localErrors };

  const nameRegex = /^[a-zA-Z\u00C0-\u017F\s]*$/;

  const handleNameChange = (field, value) => {
    if (nameRegex.test(value)) {
      // Auto-capitalize: capitalize first letter of each word
      const capitalized = value
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      onFieldChange(field, capitalized);
      if (localErrors[field]) {
        setLocalErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const aliasPlaceholder = useMemo(() => {
    return formData.email ? defaultAliasFromEmail(formData.email) : "juan.dc";
  }, [formData.email]);

  /**
   * INITIATE CHECK ON BLUR
   * Only triggers when user leaves the field.
   */
  const handleAliasBlur = useCallback(async () => {
    const aliasToCheck = formData.alias || aliasPlaceholder;
    if (!aliasToCheck || aliasToCheck.length < 2) {
      setAliasStatus(null);
      return;
    }

    setAliasStatus("checking");
    try {
      const res = await apiRequest(
        `/auth/check-alias?alias=${encodeURIComponent(aliasToCheck)}`,
      );
      setAliasStatus(res.available ? "available" : "taken");
    } catch (err) {
      setAliasStatus(null);
    }
  }, [aliasPlaceholder, formData.alias]);

  /**
   * RESET STATUS ON CHANGE
   * Clears availability markers while typing to ensure state is accurate.
   */
  const handleAliasChange = (val) => {
    onFieldChange("alias", val.toLowerCase().trim());
    if (aliasStatus !== null) setAliasStatus(null);
    if (localErrors.alias) {
      setLocalErrors((prev) => {
        const n = { ...prev };
        delete n.alias;
        return n;
      });
    }
  };

  // Perform initial check on mount for the auto-generated alias
  useEffect(() => {
    handleAliasBlur();
  }, [handleAliasBlur]);

  const passwordStrength = useMemo(() => {
    if (!formData.password)
      return { score: 0, label: "Empty", color: "#94a3b8" };
    const result = zxcvbn(formData.password);
    const score = Math.floor(result.guesses_log10 * 10);

    if (score <= 0) return { score, label: "Bad", color: "#ef4444" };
    if (score < 40) return { score, label: "Poor", color: "#f97316" };
    if (score < 65) return { score, label: "Weak", color: "#eab308" };
    if (score < 100) return { score, label: "Good", color: "#22c55e" };
    return { score, label: "Excellent", color: "#10b981" };
  }, [formData.password]);

  const passwordsMatch = useMemo(() => {
    if (!formData.confirmPassword) return null;
    return formData.password === formData.confirmPassword;
  }, [formData.password, formData.confirmPassword]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalErrors({});

    if (aliasStatus === "taken") {
      setLocalErrors((prev) => ({
        ...prev,
        alias: "This alias is already taken. Please choose another.",
      }));
      return;
    }

    const { errors: vErrors, valid } = validateProfileAndSecurityStep(formData);
    if (valid) onNext();
    else setLocalErrors(vErrors);
  };

  return (
    <BoutiqueStack
      tag="form"
      gap={24}
      className="bq-reg-step bq-fade-in"
      height="100%"
      onSubmit={handleSubmit}
    >
      <BoutiqueBox className="bq-reg-header">
        <BoutiqueText variant="h2" className="bq-reg-title">
          Profile & Security
        </BoutiqueText>
        <BoutiqueText
          variant="body"
          className="bq-reg-desc"
          margin="8px 0 0"
          style={{ opacity: 0.8 }}
        >
          Set your account details and contact information.
        </BoutiqueText>
      </BoutiqueBox>

      <BoutiqueGrid columns="1fr 1fr" gap={24} className="bq-reg-form-grid">
        <BoutiqueInput
          label="First Name"
          icon={User}
          placeholder="Juan"
          value={formData.firstName}
          onChange={(e) => handleNameChange("firstName", e.target.value)}
          status={errors.firstName ? "error" : null}
          errorMessage={errors.firstName}
          required
        />

        <BoutiqueInput
          label="Last Name"
          icon={User}
          placeholder="Dela Cruz"
          value={formData.lastName}
          onChange={(e) => handleNameChange("lastName", e.target.value)}
          status={errors.lastName ? "error" : null}
          errorMessage={errors.lastName}
          required
        />

        <BoutiqueBox style={{ gridColumn: "span 2" }}>
          <BoutiqueInput
            label="Sign-In Alias"
            icon={UserCircle}
            placeholder={aliasPlaceholder}
            value={formData.alias}
            onChange={(e) => handleAliasChange(e.target.value)}
            onBlur={handleAliasBlur}
            status={
              aliasStatus === "taken" || errors.alias
                ? "error"
                : aliasStatus === "available"
                  ? "success"
                  : null
            }
            errorMessage={
              aliasStatus === "taken"
                ? "This identifier is already in use."
                : errors.alias
            }
            inlineAction={
              aliasStatus === "checking" ? (
                <Spinner className="bq-spin" size={16} />
              ) : aliasStatus === "available" ? (
                <ShieldCheck
                  size={18}
                  weight="fill"
                  style={{ color: "#10b981" }}
                />
              ) : null
            }
            required
          >
            {/* Real-time Availability Indicator */}
            {aliasStatus === "available" && (
              <BoutiqueBox
                direction="row"
                align="center"
                gap={6}
                margin="8px 0 0"
                className="bq-match-indicator success"
              >
                <ShieldCheck size={14} weight="fill" />
                <BoutiqueText variant="caption" weight={700}>
                  Username available
                </BoutiqueText>
              </BoutiqueBox>
            )}
          </BoutiqueInput>
        </BoutiqueBox>

        {detectedRole !== "customer" && (
          <BoutiqueBox style={{ gridColumn: "span 2" }}>
            <BoutiqueInput
              label="Branch Assignment"
              icon={Buildings}
              type="select"
              placeholder="Select your branch"
              value={formData.branch || ""}
              options={BRANCHES}
              onChange={(e) => {
                onFieldChange("branch", e.target.value);
                if (localErrors.branch)
                  setLocalErrors((prev) => {
                    const n = { ...prev };
                    delete n.branch;
                    return n;
                  });
              }}
              status={errors.branch ? "error" : null}
              errorMessage={errors.branch}
              required
            />
          </BoutiqueBox>
        )}

        <BoutiqueBox style={{ gridColumn: "span 2" }}>
          <BoutiqueInput
            label="Password"
            icon={LockKey}
            type="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => {
              onFieldChange("password", e.target.value);
              if (localErrors.password)
                setLocalErrors((prev) => {
                  const n = { ...prev };
                  delete n.password;
                  return n;
                });
            }}
            status={
              errors.password
                ? "error"
                : passwordStrength.score >= 65
                  ? "success"
                  : null
            }
            errorMessage={errors.password}
            style={{ fontFamily: "monospace" }}
            maxLength={25}
            required
          />
        </BoutiqueBox>

        <BoutiqueBox style={{ gridColumn: "span 2" }}>
          <BoutiqueInput
            label="Confirm Password"
            icon={LockKey}
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => {
              onFieldChange("confirmPassword", e.target.value);
              if (localErrors.confirmPassword)
                setLocalErrors((prev) => {
                  const n = { ...prev };
                  delete n.confirmPassword;
                  return n;
                });
            }}
            status={
              errors.confirmPassword
                ? "error"
                : passwordsMatch === true
                  ? "success"
                  : null
            }
            errorMessage={errors.confirmPassword}
            style={{ fontFamily: "monospace" }}
            maxLength={25}
            required
          >
            {/* Password Strength Meter */}
            <BoutiqueStack
              gap={8}
              margin="12px 0 0"
              className="bq-password-strength"
            >
              <BoutiqueBox
                direction="row"
                justify="space-between"
                align="center"
              >
                <BoutiqueText variant="label" color="#64748b">
                  Strength:{" "}
                  <strong style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </strong>
                </BoutiqueText>
                <BoutiqueText size="12px" weight={700} color="#94a3b8">
                  {passwordStrength.score} / 100
                </BoutiqueText>
              </BoutiqueBox>
              <BoutiqueBox
                height={6}
                background="#f1f5f9"
                style={{ borderRadius: "3px", overflow: "hidden" }}
              >
                <BoutiqueBox
                  height="100%"
                  style={{
                    width: `${Math.min(100, Math.max(5, passwordStrength.score))}%`,
                    backgroundColor: passwordStrength.color,
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderRadius: "3px",
                  }}
                />
              </BoutiqueBox>
            </BoutiqueStack>

            {/* Real-time Match Indicator */}
            {formData.confirmPassword &&
              passwordsMatch !== null &&
              !errors.confirmPassword && (
                <BoutiqueBox
                  direction="row"
                  align="center"
                  gap={6}
                  margin="8px 0 0"
                  className={`bq-match-indicator ${passwordsMatch ? "success" : "error"}`}
                >
                  {passwordsMatch ? (
                    <>
                      <ShieldCheck size={14} weight="fill" />
                      <BoutiqueText variant="caption" weight={700}>
                        Passwords match
                      </BoutiqueText>
                    </>
                  ) : (
                    <>
                      <WarningDiamond size={14} weight="bold" />
                      <BoutiqueText variant="caption" weight={700}>
                        Passwords do not match
                      </BoutiqueText>
                    </>
                  )}
                </BoutiqueBox>
              )}
          </BoutiqueInput>
        </BoutiqueBox>
      </BoutiqueGrid>

      <BoutiqueBox
        direction="row"
        align="center"
        justify="space-between"
        margin="auto 0 0"
        padding="32px 0 0"
        style={{ borderTop: `1px solid ${BQ_COLORS.border}` }}
        className="bq-reg-actions"
      >
        <BoutiqueButton type="button" variant="cancel" onClick={onCancel}>
          <X size={18} weight="bold" /> Cancel
        </BoutiqueButton>
        <BoutiqueButton
          type="submit"
          disabled={aliasStatus === "taken"}
        >
          Continue <ArrowRight size={18} weight="bold" />
        </BoutiqueButton>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-match-indicator.success { color: #10b981; }
        .bq-match-indicator.error { color: #ef4444; }

        @media (max-width: 640px) {
          .bq-reg-form-grid { grid-template-columns: 1fr !important; }
          .bq-reg-form-grid > * { grid-column: span 1 !important; }
        }

        .bq-spin { animation: bq-spin 1s linear infinite; color: ${BQ_COLORS.accent}; }
        @keyframes bq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `,
        }}
      />
    </BoutiqueStack>
  );
}
