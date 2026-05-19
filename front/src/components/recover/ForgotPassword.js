import {
  ArrowLeft,
  EnvelopeSimple,
  Info,
  WarningDiamond,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import BoutiqueAuthHeader from "../common/boutique/BoutiqueAuthHeader";
import BoutiqueAuthLayout from "../common/boutique/BoutiqueAuthLayout";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_SHADOWS } from "../common/boutique/BoutiqueTheme";

function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = useMemo(
    () => String(location.state?.email || ""),
    [location.state],
  );

  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const normalized = String(email || "")
      .trim()
      .toLowerCase();

    if (!normalized) {
      setError("Please enter your registered email.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: normalized }),
      });
      setMessage(
        response.message || "Reset link sent. Please check your email.",
      );
    } catch (requestError) {
      setError(
        requestError.message || "Unable to process password reset right now.",
      );
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
        title="Recover Access"
        subtitle="Enter your email address and we will send a secure password reset link."
      />

      <BoutiqueStack
        tag="form"
        gap={24}
        onSubmit={submit}
        className="bq-fade-in"
      >
        <BoutiqueInput
          label="Email Address"
          icon={EnvelopeSimple}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          status={error ? "error" : null}
          errorMessage={error}
          disabled={loading}
        />

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
          Send Reset Link
        </BoutiqueButton>

        <BoutiqueBox align="center">
          <BoutiqueText color={BQ_COLORS.inkMuted} weight={500}>
            Remembered your password?{" "}
            <button
              type="button"
              className="bq-signup-link"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          </BoutiqueText>
        </BoutiqueBox>

        <BoutiqueBox
          padding={24}
          background={BQ_COLORS.bgAlt}
          style={{
            borderRadius: "20px",
            border: `1.5px dashed ${BQ_COLORS.border}`,
          }}
        >
          <BoutiqueBox
            direction="row"
            align="center"
            gap={10}
            margin="0 0 16px"
          >
            <WarningDiamond size={20} weight="fill" />
            <BoutiqueText variant="label">Recovery Security</BoutiqueText>
          </BoutiqueBox>
          <BoutiqueStack
            gap={10}
            tag="ul"
            className="bq-tips-list"
            padding={0}
            margin={0}
            style={{ listStyle: "none" }}
          >
            <BoutiqueText
              tag="li"
              size="13px"
              color={BQ_COLORS.inkMuted}
              weight={600}
            >
              Reset links expire in 1 hour
            </BoutiqueText>
            <BoutiqueText
              tag="li"
              size="13px"
              color={BQ_COLORS.inkMuted}
              weight={600}
            >
              Check your spam folder if no email arrives
            </BoutiqueText>
            <BoutiqueText
              tag="li"
              size="13px"
              color={BQ_COLORS.inkMuted}
              weight={600}
            >
              Authenticator setup may be required after reset
            </BoutiqueText>
          </BoutiqueStack>
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

        .bq-tips-list li { position: relative; padding-left: 18px; }
        .bq-tips-list li::before { content: "•"; position: absolute; left: 0; color: ${BQ_COLORS.accent}; font-weight: 900; }

        @media (max-width: 1024px) {
          .bq-login-back-btn { top: 20px; left: 20px; width: 40px; height: 40px; }
        }
      `,
        }}
      />
    </BoutiqueAuthLayout>
  );
}

export default ForgotPassword;
