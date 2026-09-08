// utils/authValidation.js

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MAX_LENGTH = 25;

export function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

export function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "");
}

export function canonicalizePhMobile(value = "") {
  const text = String(value ?? "").trim();
  if (!/^\+?[\d\s()-]+$/.test(text)) return text;
  const digits = normalizePhone(text);
  if (text.startsWith("+") && !/^639\d{9}$/.test(digits)) return text;
  if (/^639\d{9}$/.test(digits)) return `09${digits.slice(3)}`;
  if (/^9\d{9}$/.test(digits)) return `0${digits}`;
  return digits;
}

export function sanitizePhMobileInput(value = "") {
  // Preserve pasted formatting and every digit. Validate before canonicalizing
  // on submission, so an overlong number cannot silently become another number.
  return String(value ?? "");
}

export function validateRequired(value, fieldLabel = "This field") {
  if (!String(value || "").trim()) {
    return `${fieldLabel} is required.`;
  }
  return "";
}

export function validatePersonName(value, fieldLabel = "Name", { required = true } = {}) {
  const text = String(value || "").trim();

  if (!text) {
    return required ? `${fieldLabel} is required.` : "";
  }

  if (/\d/.test(text)) {
    return `${fieldLabel} cannot contain numbers.`;
  }

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿÑñ .'-]+$/.test(text)) {
    return `${fieldLabel} can only use letters, spaces, apostrophes, periods, and hyphens.`;
  }

  if (text.length < 2) {
    return `${fieldLabel} must be at least 2 characters.`;
  }

  return "";
}

export function validateEmail(email) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return "Email is required.";
  }

  if (!EMAIL_REGEX.test(normalized)) {
    return "Enter a valid email address.";
  }

  return "";
}

export function validatePhone(phone) {
  const digits = canonicalizePhMobile(phone);

  if (!digits) {
    return "Phone number is required.";
  }

  if (!/^09\d{9}$/.test(digits)) {
    return "Enter a Philippine mobile number such as 09123456789 or +639123456789. Spaces and dashes are allowed.";
  }

  return "";
}

export function validatePassword(password) {
  if (!password) {
    return "Password is required.";
  }

  if (String(password).length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (String(password).length > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }

  return "";
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}

// Account password changes use the backend's stronger policy, unlike sign-in
// and legacy initial credentials which must continue to be accepted as-is.
export function validateAccountPassword(password) {
  const lengthError = validatePassword(password);
  if (lengthError) return lengthError;
  const missing = getAccountPasswordRequirements(password).filter((rule) => !rule.met);
  return missing.length ? `Password needs: ${missing.map((rule) => rule.label).join('; ')}.` : "";
}

export function getAccountPasswordRequirements(password = "") {
  const value = String(password);
  return [
    { label: "8–25 characters", met: value.length >= 8 && value.length <= 25 },
    { label: "an uppercase letter (A–Z)", met: /[A-Z]/.test(value) },
    { label: "a lowercase letter (a–z)", met: /[a-z]/.test(value) },
    { label: "a number (0–9)", met: /\d/.test(value) },
    // Any printable ASCII punctuation counts, not just seven selected symbols.
    { label: "a symbol (for example ! @ # . _ -)", met: /[!-/:-@\[-`{-~]/.test(value) },
    { label: "no spaces or control characters", met: !/[\s\u0000-\u001f\u007f]/.test(value) },
  ];
}

export function validateLoginForm({ email, password }) {
  const errors = {};

  const identifier = String(email || "").trim();
  const emailError = identifier.includes("@")
    ? validateEmail(identifier)
    : validateRequired(identifier, "Email or alias");
  const passwordError = validateRequired(password, "Password");

  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;

  return errors;
}

export function validateRegistrationForm({
  name_first,
  email,
  phone,
  password,
  confirmPassword,
}) {
  const errors = {};

  const firstNameError = validatePersonName(name_first, "First name");
  const emailError = validateEmail(email);
  const phoneError = validatePhone(phone);
  const passwordError = validatePassword(password);
  const confirmPasswordError = validateConfirmPassword(
    password,
    confirmPassword,
  );

  if (firstNameError) errors.name_first = firstNameError;
  if (emailError) errors.email = emailError;
  if (phoneError) errors.phone = phoneError;
  if (passwordError) errors.password = passwordError;
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  return errors;
}

export function hasValidationErrors(errors = {}) {
  return Object.keys(errors).length > 0;
}

export function validatePasswordStrength(password) {
  // Simplified zxcvbn-like strength check
  // Returns { score: 0-100 } based on length, complexity
  if (!password) return { score: 0 };

  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character variety
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  // Common patterns (reduce score)
  if (/^\d+$/.test(password)) score = Math.min(score, 30); // All digits
  if (/^(.)\1+$/.test(password)) score = Math.min(score, 20); // Repeated chars

  return { score: Math.min(100, Math.max(0, score)) };
}
