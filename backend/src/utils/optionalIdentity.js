const OPTIONAL_IDENTITY_FIELDS = [
  "email",
  "phone",
  "alias",
  "username",
  "googleId",
];

const normalizeOptionalIdentity = (value) => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

const duplicateIdentityField = (error = {}) => {
  if (Number(error?.code) !== 11000) return "";
  const structuredField = Object.keys(
    error.keyPattern || error.keyValue || {},
  ).find((field) => OPTIONAL_IDENTITY_FIELDS.includes(field));
  if (structuredField) return structuredField;

  const message = String(error?.message || "");
  return (
    OPTIONAL_IDENTITY_FIELDS.find(
      (field) =>
        message.includes(`${field}_1`) || message.includes(`${field}:`),
    ) || "unknown"
  );
};

const duplicateIdentityMessage = (error = {}) => {
  const field = duplicateIdentityField(error);
  if (!field) return "";
  const messages = {
    email: "An account with this email address already exists.",
    phone: "An account with this mobile number already exists.",
    alias: "This sign-in alias is already in use.",
    username: "This username is already in use.",
    googleId: "This Google account is already connected to another user.",
    unknown: "One of these account details is already in use.",
  };
  return messages[field] || messages.unknown;
};

module.exports = {
  duplicateIdentityField,
  duplicateIdentityMessage,
  normalizeOptionalIdentity,
};
