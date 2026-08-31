const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();
const normalizePhone = (value = "") => String(value || "").replace(/\D/g, "");

const mergeClientRegistrationProgress = ({ existing = {}, incoming = {} } = {}) => {
  const existingForm =
    existing.formData && typeof existing.formData === "object"
      ? existing.formData
      : {};
  const incomingForm =
    incoming.formData && typeof incoming.formData === "object"
      ? { ...incoming.formData }
      : {};

  // These values can only be established by the OTP endpoints. A registration
  // draft must never be able to mark itself verified or store credentials in
  // the server-side session.
  [
    "password",
    "confirmPassword",
    "registrationVerificationToken",
    "emailVerified",
    "phoneVerified",
    "messengerVerified",
  ].forEach((field) => delete incomingForm[field]);

  const emailVerified = Boolean(existingForm.emailVerified);
  const phoneVerified = Boolean(existingForm.phoneVerified);
  const messengerVerified = Boolean(existingForm.messengerVerified);
  const existingEmail = normalizeEmail(existingForm.email || existing.email);
  const incomingEmail = normalizeEmail(incoming.email || incomingForm.email);
  const existingPhone = normalizePhone(existingForm.phone);
  const incomingPhone = normalizePhone(incomingForm.phone);
  const existingMessenger = String(existingForm.messengerHandle || "").trim();
  const incomingMessenger = String(incomingForm.messengerHandle || "").trim();

  const formData = {
    ...existingForm,
    ...incomingForm,
    email: emailVerified
      ? existingEmail
      : incomingEmail || existingEmail,
    phone: phoneVerified
      ? existingPhone
      : incomingPhone || existingPhone,
    messengerHandle: messengerVerified
      ? existingMessenger
      : incomingMessenger || existingMessenger,
    emailVerified,
    phoneVerified,
    messengerVerified,
  };
  delete formData.password;
  delete formData.confirmPassword;
  delete formData.registrationVerificationToken;

  return {
    email: formData.email || "",
    stepIndex: Math.max(0, Math.min(Number(incoming.stepIndex) || 0, 3)),
    formData,
  };
};

module.exports = { mergeClientRegistrationProgress };
