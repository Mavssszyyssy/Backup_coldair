import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
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
import RegisterContactStep from "./RegisterContactStep";
import RegisterEmailStep from "./RegisterEmailStep";
import RegisterLegalConsentsStep from "./RegisterLegalConsentsStep";
import RegisterLocationStep from "./RegisterLocationStep";
import RegisterProfilePasswordStep from "./RegisterProfilePasswordStep";

const STORAGE_KEY = "bq_reg_state";
const STEPS = ["legal", "email", "identity", "contact", "location"];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useUser();
  const isShuttingDown = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    emailVerified: false,
    registrationSecret: "",
    provisioningUri: "",
    firstName: "",
    lastName: "",
    alias: "",
    password: "",
    phone: "",
    phoneVerified: false,
    messengerHandle: "",
    messengerVerified: false,
    role: "customer",
    branch: "",
    locations: [], // Array of { coordinates, address, source }
    agreeTermsWarranty: false,
    agreeTermsService: false,
    agreeTermsApp: false,
    agreePrivacyRa10173: false,
  });

  const [errors, setErrors] = useState({});

  // Persistence
  useEffect(() => {
    const init = async () => {
      const saved = await loadEncrypted(STORAGE_KEY);
      if (saved && saved.formData) {
        setFormData((prev) => ({
          ...prev,
          ...saved.formData,
          // Ensure locations exists even if loading old saved data
          locations: saved.formData.locations || [],
        }));
        setStepIndex(saved.stepIndex || 0);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isShuttingDown.current) return;
    const persist = async () => {
      try {
        await saveEncrypted(STORAGE_KEY, { formData, stepIndex });
      } catch (e) {
        /* ignore during shutdown */
      }
    };
    persist();
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
      formData.phoneVerified ||
      formData.messengerVerified;

    if (hasVerifiedData) {
      const confirmed = window.confirm(
        "You have successfully verified one or more contact methods. Are you sure you want to cancel? All progress will be lost.",
      );
      if (!confirmed) return;
    }

    console.log("[BOUTIQUE] Terminating registration session...");
    isShuttingDown.current = true;

    try {
      // 1. Clear backend session (Nuclear Reset)
      await apiRequest("/auth/logout", { method: "POST" });

      // 2. Clear local storage
      removeEncrypted(STORAGE_KEY);

      // 3. Force reset local state to absolute defaults
      setFormData({
        email: "",
        emailVerified: false,
        registrationSecret: "",
        provisioningUri: "",
        firstName: "",
        lastName: "",
        alias: "",
        password: "",
        phone: "",
        phoneVerified: false,
        messengerHandle: "",
        messengerVerified: false,
        role: "customer",
        branch: "",
        locations: [],
        agreeTermsWarranty: false,
        agreeTermsService: false,
        agreeTermsApp: false,
        agreePrivacyRa10173: false,
      });
      setStepIndex(0);

      // 4. Return to Login
      navigate("/login");
    } catch (err) {
      console.error("Session termination failed", err);
      removeEncrypted(STORAGE_KEY);
      navigate("/login");
    }
  };

  const detectedRole = useMemo(() => {
    const email = formData.email.toLowerCase();
    if (email.includes("superadmin")) return "superadmin";
    if (email.includes("admin")) return "admin";
    if (email.includes("technician")) return "technician";
    return "customer";
  }, [formData.email]);

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
        messenger_handle: formData.messengerHandle,
        role: detectedRole,
        branch: formData.branch,
        locations: formData.locations,
      };

      await register(payload);
      removeEncrypted(STORAGE_KEY);
      navigate("/login");
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
        {step === "email" && (
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
        {step === "contact" && (
          <RegisterContactStep
            formData={formData}
            onFieldChange={handleFieldChange}
            onNext={goNext}
            onBack={goBack}
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
