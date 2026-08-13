// services/passwordResetService.jsx
// Password reset flow — now backed by the Quart API.
// OTP is printed to the server console in DEBUG mode.

import * as api from "./api";
import { normalizeEmail } from "../utils/authValidation";

export async function requestPasswordResetOtp(email, roleType = "customer") {
  const normalized = normalizeEmail(email);
  const result = await api.forgotPassword(normalized, "email");

  if (!result.success) {
    throw new Error(result.error || "Failed to send OTP.");
  }

  return {
    success: true,
    email: normalized,
    role: roleType,
    message: result.message || "OTP sent. Check your email inbox.",
  };
}

export async function resetPasswordWithOtp(email, otpCode, newPassword) {
  const normalized = normalizeEmail(email);
  const result = await api.resetPassword(
    normalized,
    String(otpCode || "").trim(),
    String(newPassword || ""),
    "email",
  );

  if (!result.success) {
    throw new Error(result.error || "Failed to reset password.");
  }

  return {
    success: true,
    email: normalized,
    message: "Password reset successfully.",
  };
}
