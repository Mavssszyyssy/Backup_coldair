export const createInitialRegistrationFormData = () => ({
  email: "",
  emailVerified: false,
  verificationChannel: "email",
  registrationVerificationToken: "",
  firstName: "",
  lastName: "",
  alias: "",
  password: "",
  phone: "",
  phoneVerified: false,
  role: "customer",
  branch: "",
  locations: [],
  agreeTermsWarranty: false,
  agreeTermsService: false,
  agreeTermsApp: false,
  agreePrivacyRa10173: false,
});

const clampStep = (value) => Math.max(0, Math.min(Number(value) || 0, 3));

export const resolveRegistrationResumeState = ({
  saved,
  serverProgress,
  sessionLoaded,
} = {}) => {
  const initial = createInitialRegistrationFormData();
  const localForm = saved?.formData && typeof saved.formData === "object"
    ? saved.formData
    : null;
  const serverForm =
    serverProgress?.formData && typeof serverProgress.formData === "object"
      ? serverProgress.formData
      : null;

  if (serverForm) {
    return {
      formData: {
        ...initial,
        ...(localForm || {}),
        ...serverForm,
        emailVerified: Boolean(serverForm.emailVerified),
        phoneVerified: false,
        verificationChannel: "email",
        registrationVerificationToken: serverForm.emailVerified ? (serverForm.registrationVerificationToken || (localForm?.verificationChannel !== "sms" ? localForm?.registrationVerificationToken : "") || "") : "",
        locations: serverForm.locations || localForm?.locations || [],
      },
      stepIndex: serverForm.emailVerified ? clampStep(serverProgress.stepIndex) : Math.min(1, clampStep(serverProgress.stepIndex)),
      discardLocalDraft: false,
    };
  }

  const hasStaleVerification = Boolean(
    localForm?.emailVerified ||
      localForm?.phoneVerified ||
      localForm?.registrationVerificationToken,
  );
  if (sessionLoaded && hasStaleVerification) {
    return {
      formData: initial,
      stepIndex: 0,
      discardLocalDraft: true,
    };
  }

  return {
    formData: localForm
      ? { ...initial, ...localForm, verificationChannel: "email", phoneVerified: false,
          registrationVerificationToken: localForm.verificationChannel === "sms" ? "" : (localForm.registrationVerificationToken || ""),
          locations: localForm.locations || [] }
      : initial,
    stepIndex: localForm ? (localForm.emailVerified ? clampStep(saved.stepIndex) : Math.min(1, clampStep(saved.stepIndex))) : 0,
    discardLocalDraft: false,
  };
};
