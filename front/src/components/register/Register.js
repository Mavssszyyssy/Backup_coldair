import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import {
  createInitialRegistrationFormData,
  resolveRegistrationResumeState,
} from "../../domain/register/registrationResume";
import {
  loadEncrypted,
  removeEncrypted,
  saveEncrypted,
} from "../../utils/secureStorage";
import BoutiqueAuthHeader from "../common/boutique/BoutiqueAuthHeader";
import BoutiqueAuthLayout from "../common/boutique/BoutiqueAuthLayout";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";
import RegisterEmailStep from "./RegisterEmailStep";
import RegisterLegalConsentsStep from "./RegisterLegalConsentsStep";
import RegisterLocationStep from "./RegisterLocationStep";
import RegisterProfilePasswordStep from "./RegisterProfilePasswordStep";

const STORAGE_KEY = "bq_reg_state";
// A contact method is verified once at the beginning. The older, separate
// contact step repeated verification after account details.
const STEPS = ["legal", "verification", "identity", "location"];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useUser();
  const isShuttingDown = useRef(false);
  const registrationStateReady = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const [formData, setFormData] = useState(createInitialRegistrationFormData);

  const [errors, setErrors] = useState({});

  // Persistence
  useEffect(() => {
    let active = true;
    const init = async () => {
      const saved = await loadEncrypted(STORAGE_KEY);
      let serverProgress = null;
      let sessionLoaded = false;
      try {
        const response = await apiRequest("/auth/session");
        serverProgress = response?.session?.registrationProgress || null;
        sessionLoaded = true;
      } catch (_error) {
        // Offline registration can continue from encrypted local state.
      }

      if (active) {
        const resolved = resolveRegistrationResumeState({
          saved,
          serverProgress,
          sessionLoaded,
        });
        if (resolved.discardLocalDraft) removeEncrypted(STORAGE_KEY);
        setFormData(resolved.formData);
        setStepIndex(resolved.stepIndex);
        registrationStateReady.current = true;
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isShuttingDown.current || !registrationStateReady.current) return;
    const persist = async () => {
      try {
        await saveEncrypted(STORAGE_KEY, { formData, stepIndex });
      } catch (e) {
        /* ignore during shutdown */
      }
    };
    persist();
  }, [formData, stepIndex]);

  useEffect(() => {
    if (isShuttingDown.current || !registrationStateReady.current || !formData.email) return undefined;

    // Keep the temporary server session in sync for a refresh, but never put
    // the account password in that session.
    const timer = window.setTimeout(() => {
      const { password, confirmPassword, ...sessionFormData } = formData;
      apiRequest("/auth/session/registration", {
        method: "POST",
        body: JSON.stringify({
          progress: {
            email: formData.email,
            stepIndex,
            formData: sessionFormData,
          },
        }),
      }).catch(() => {
        // The encrypted browser copy remains the offline fallback.
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [formData, stepIndex]);

  const handleFieldChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }, []);

  const goNext = () =>
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  // HARD SESSION CLEAR
  const clearRegistrationSession = async () => {
    const hasVerifiedData =
      formData.emailVerified ||
      formData.phoneVerified;

    if (hasVerifiedData) {
      const confirmed = window.confirm(
        "You have successfully verified one or more contact methods. Are you sure you want to cancel? All progress will be lost.",
      );
      if (!confirmed) return;
    }

    isShuttingDown.current = true;

    try {
      // 1. Clear backend session (Nuclear Reset)
      await apiRequest("/auth/logout", { method: "POST" });

      // 2. Clear local storage
      removeEncrypted(STORAGE_KEY);

      // 3. Force reset local state to absolute defaults
      setFormData(createInitialRegistrationFormData());
      setStepIndex(0);

      // 4. Return to Login
      navigate("/login");
    } catch (err) {
      console.error("Session termination failed", err);
      removeEncrypted(STORAGE_KEY);
      navigate("/login");
    }
  };

  // Public signup always creates a customer account. Staff accounts are only
  // provisioned from Super Admin management, never inferred from an email.
  const detectedRole = "customer";

  const handleFinalSubmit = async () => {
    setLoading(true);
    setSubmissionError("");

    try {
      const payload = {
        name_first: formData.firstName,
        name_last: formData.lastName,
        alias: formData.alias,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        contact_method: formData.verificationChannel,
        locations: formData.locations,
        registrationVerificationToken: formData.registrationVerificationToken,
      };

      await register(payload);
      removeEncrypted(STORAGE_KEY);
      navigate("/shop", { replace: true });
    } catch (err) {
      setSubmissionError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const step = STEPS[stepIndex];

  return (
    <BoutiqueAuthLayout>
      <BoutiqueAuthHeader title="Join AeroPulse">
        <BoutiqueBox
          direction="row"
          align="center"
          gap={6}
          className="bq-reg-progress"
        >
          {STEPS.map((s, i) => (
            <BoutiqueBox
              key={s}
              height={4}
              style={{
                width: i === stepIndex ? "32px" : "12px",
                borderRadius: "2px",
                background:
                  i <= stepIndex
                    ? i === stepIndex
                      ? BQ_COLORS.accent
                      : BQ_COLORS.ink
                    : BQ_COLORS.border,
                transition: "all 0.4s ease",
              }}
              className={`bq-progress-bar ${i === stepIndex ? "active" : ""} ${i < stepIndex ? "done" : ""}`}
            />
          ))}
        </BoutiqueBox>
      </BoutiqueAuthHeader>

      <BoutiqueBox className="bq-reg-step-container" width="100%" height="100%">
        {step === "legal" && (
          <RegisterLegalConsentsStep
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
            onNext={goNext}
            onBack={clearRegistrationSession}
          />
        )}
        {step === "verification" && (
          <RegisterEmailStep
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
            detectedRole={detectedRole}
            detectedRoleLabel={detectedRole.toUpperCase()}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === "identity" && (
          <RegisterProfilePasswordStep
            formData={formData}
            onFieldChange={handleFieldChange}
            detectedRole={detectedRole}
            detectedRoleLabel={detectedRole.toUpperCase()}
            onNext={goNext}
            onBack={goBack}
            onCancel={clearRegistrationSession}
          />
        )}
        {step === "location" && (
          <RegisterLocationStep
            formData={formData}
            onFieldChange={handleFieldChange}
            onNext={handleFinalSubmit}
            onBack={goBack}
            loading={loading}
          />
        )}

        {submissionError && (
          <BoutiqueBox
            margin="24px 0 0"
            padding={16}
            background="#fff1f2"
            align="center"
            className="bq-reg-submit-error"
            style={{
              border: `1.5px solid ${BQ_COLORS.danger}`,
              borderRadius: "12px",
            }}
          >
            <BoutiqueText color={BQ_COLORS.danger} size="14px" weight={700}>
              {submissionError}
            </BoutiqueText>
          </BoutiqueBox>
        )}
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-reg-step-container {
          animation: bq-step-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes bq-step-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .bq-reg-submit-error {
          animation: bq-shake 0.4s ease;
        }

        @keyframes bq-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
      `,
        }}
      />
    </BoutiqueAuthLayout>
  );
}
