import {
  ArrowLeft,
  Info,
  LockKey,
  ShieldCheck,
  WarningDiamond,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import zxcvbn from "zxcvbn";
import { apiRequest } from "../../config/api";
import BoutiqueAuthHeader from "../common/boutique/BoutiqueAuthHeader";
import BoutiqueAuthLayout from "../common/boutique/BoutiqueAuthLayout";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_SHADOWS } from "../common/boutique/BoutiqueTheme";

function ResetPassword() {
  const navigate = useNavigate();
  const { token = "" } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "Empty", color: "#94a3b8" };
    const result = zxcvbn(password);
    const score = Math.floor(result.guesses_log10 * 10);

    if (score <= 0) return { score, label: "Bad", color: "#ef4444" };
    if (score < 40) return { score, label: "Poor", color: "#f97316" };
    if (score < 65) return { score, label: "Weak", color: "#eab308" };
    if (score < 100) return { score, label: "Good", color: "#22c55e" };
    return { score, label: "Excellent", color: "#10b981" };
  }, [password]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const submit = async (event) => {
    event.preventDefault();

    if (!token) {
      setError("Reset link is invalid.");
      setMessage("");
      return;
    }
    if (passwordStrength.score < 40) {
      setError("Please choose a stronger password.");
      setMessage("");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await apiRequest(`/auth/reset-password/${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setMessage("Password reset successful. Redirecting to sign in...");
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (requestError) {
      setError(requestError.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BoutiqueAuthLayout>
      {/* Floating Back Button */}
      <button
        className="bq-login-back-btn"
        onClick={() => navigate("/login")}
        title="Back to Login"
      >
        <ArrowLeft size={20} weight="bold" />
      </button>

      <BoutiqueAuthHeader
        title="Reset Password"
        subtitle="Enter your new password to complete account recovery."
      />

      <BoutiqueStack
        tag="form"
        gap={24}
        onSubmit={submit}
        className="bq-fade-in"
      >
        <BoutiqueInput
          label="New Password"
          icon={LockKey}
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          status={
            error && !passwordsMatch
              ? "error"
              : passwordStrength.score >= 65
                ? "success"
                : null
          }
          disabled={loading}
          style={{ fontFamily: "monospace" }}
          required
        />

        <BoutiqueInput
          label="Confirm Password"
          icon={LockKey}
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          status={
            error && !passwordsMatch
              ? "error"
              : passwordsMatch === true
                ? "success"
                : null
          }
          disabled={loading}
          style={{ fontFamily: "monospace" }}
          required
        >
          {/* Password Strength Meter */}
          <BoutiqueStack
            gap={8}
            margin="12px 0 0"
            className="bq-password-strength"
          >
            <BoutiqueBox direction="row" justify="space-between" align="center">
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
          {confirmPassword && passwordsMatch !== null && (
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
                  <BoutiqueText variant="caption" weight={700} color="#10b981">
                    Passwords match
                  </BoutiqueText>
                </>
              ) : (
                <>
                  <WarningDiamond size={14} weight="bold" />
                  <BoutiqueText variant="caption" weight={700} color="#ef4444">
                    Passwords do not match
                  </BoutiqueText>
                </>
              )}
            </BoutiqueBox>
          )}
        </BoutiqueInput>

        {error && (
          <BoutiqueBox
            padding="16px 20px"
            background="#fef2f2"
            direction="row"
            align="center"
            gap={12}
            style={{ borderRadius: "12px", border: "1px solid #ef444433" }}
          >
            <WarningDiamond
              size={18}
              weight="bold"
              style={{ color: "#b91c1c" }}
            />
            <BoutiqueText weight={600} size="14px" color="#b91c1c">
              {error}
            </BoutiqueText>
          </BoutiqueBox>
        )}

        {message && (
          <BoutiqueBox
            padding="16px 20px"
            background="#ecfdf5"
            direction="row"
            align="center"
            gap={12}
            style={{ borderRadius: "12px", border: "1px solid #10b98133" }}
          >
            <Info size={18} weight="bold" style={{ color: "#059669" }} />
            <BoutiqueText weight={600} size="14px" color="#059669">
              {message}
            </BoutiqueText>
          </BoutiqueBox>
        )}

        <BoutiqueButton type="submit" loading={loading} fullWidth>
          Update Password
        </BoutiqueButton>

        <BoutiqueBox align="center">
          <BoutiqueText color={BQ_COLORS.inkMuted} weight={500}>
            Changed your mind?{" "}
            <button
              type="button"
              className="bq-signup-link"
              onClick={() => navigate("/login")}
            >
              Back to Login
            </button>
          </BoutiqueText>
        </BoutiqueBox>
      </BoutiqueStack>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-login-back-btn {
          position: absolute; top: 40px; left: 40px;
          background: white; border: none;
          width: 48px; height: 48px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.3s ease;
          color: ${BQ_COLORS.ink}; box-shadow: ${BQ_SHADOWS.soft};
          z-index: 100;
        }
        .bq-login-back-btn:hover { transform: translateX(-4px); box-shadow: ${BQ_SHADOWS.float}; }

        .bq-signup-link { background: none; border: none; color: ${BQ_COLORS.brand}; font-weight: 800; cursor: pointer; text-decoration: underline; padding: 0 4px; font-size: 15px; }

        @media (max-width: 1024px) {
          .bq-login-back-btn { top: 20px; left: 20px; width: 40px; height: 40px; }
        }
      `,
        }}
      />
    </BoutiqueAuthLayout>
  );
}

export default ResetPassword;
