import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../config/api";

/**
 * useVerification
 * Encapsulates OTP/Verification logic for use in any auth step.
 */
export function useVerification({
  recipient,
  action = "register_email",
  otpTtl = 300, // 5 minutes default
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [canResend, setCanResend] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const getBasePayload = useCallback(() => {
    return { action, channel: "email", email: recipient };
  }, [recipient, action]);

  const requestOtp = useCallback(async () => {
    if (!recipient) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify(getBasePayload()),
      });
      setTimeLeft(60); // 60s cooldown for resend
      setCanResend(false);
    } catch (err) {
      setError(err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }, [recipient, getBasePayload]);

  const verifyOtp = useCallback(
    async (code) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ ...getBasePayload(), code }),
        });
        return { success: true, data: res };
      } catch (err) {
        setError(err.message || "Invalid or expired code.");
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [getBasePayload],
  );

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  return {
    requestOtp,
    verifyOtp,
    loading,
    error,
    canResend,
    timeLeft,
  };
}
