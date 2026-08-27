import { ArrowLeft, Info, Key, ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import BoutiqueAuthHeader from "../common/boutique/BoutiqueAuthHeader";
import BoutiqueAuthLayout from "../common/boutique/BoutiqueAuthLayout";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import { BQ_COLORS, BQ_SHADOWS } from "../common/boutique/BoutiqueTheme";
import LoginForm from "./LoginForm";

const getRoleHomePath = (role) => {
  if (role === "technician") return "/tech/dashboard";
  if (role === "manager") return "/manager/amp";
  if (role === "owner") return "/owner/amp";
  if (role === "admin") return "/admin/dashboard";
  if (role === "superadmin") return "/superadmin/dashboard";
  return "/shop";
};

const getCustomerLoginDestination = (location) => {
  const from = location.state?.from;
  const path = String(from?.pathname || "");
  const allowedCustomerPaths = [
    "/shop", "/checkout", "/profile", "/settings", "/myunit", "/contact",
    "/services", "/my-orders", "/faq", "/order-confirmation/", "/receipt/",
  ];
  if (!path || !allowedCustomerPaths.some((allowed) => path === allowed || path.startsWith(allowed))) {
    return "/shop";
  }
  return `${path}${from.search || ""}${from.hash || ""}`;
};

function Login() {
  const { login, verifyLoginTotp } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [authMessage, setAuthMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [authenticatorCode, setAuthenticatorCode] = useState("");

  useEffect(() => {
    setAuthMessage("");
  }, [location.search]);

  const handleIdentifierChange = (identifier) => {
    setUser((prev) => ({ ...prev, identifier }));
    if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: "" }));
  };

  const handlePasswordChange = (password) => {
    setUser((prev) => ({ ...prev, password }));
    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
  };

  const authenticateUser = async () => {
    setErrors({});
    if (!user.identifier || !user.password) {
      alert("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = challengeToken
        ? await verifyLoginTotp(challengeToken, authenticatorCode)
        : await login(user.identifier, user.password);
      if (loggedInUser?.requiresTotp) {
        setChallengeToken(loggedInUser.challengeToken);
        setAuthenticatorCode("");
        setErrors({});
        setLoading(false);
        return;
      }
      setLoading(false);
      navigate(
        loggedInUser?.role === "customer"
          ? getCustomerLoginDestination(location)
          : getRoleHomePath(loggedInUser?.role),
        { replace: true },
      );
    } catch (err) {
      setErrors(challengeToken
        ? { authenticatorCode: err.message }
        : { password: err.message });
      setLoading(false);
    }
  };

  return (
    <BoutiqueAuthLayout>
      {/* Floating Back Button */}
      <button
        className="bq-login-back-btn"
        onClick={() => navigate("/home")}
        title="Back to Home"
      >
        <ArrowLeft size={20} weight="bold" />
      </button>

      <BoutiqueAuthHeader
        title="Welcome Back"
        subtitle="Sign in to your boutique account"
      />

      <BoutiqueStack gap={24} className="bq-login-form-inner">
        {authMessage && (
          <BoutiqueBox
            padding="16px 20px"
            background={BQ_COLORS.bgAlt}
            direction="row"
            align="center"
            gap={12}
            style={{ borderRadius: "12px" }}
          >
            <Info size={18} weight="bold" />
            <BoutiqueText weight={600} size="14px">
              {authMessage}
            </BoutiqueText>
          </BoutiqueBox>
        )}

        {!challengeToken ? <LoginForm
          identifier={user.identifier}
          password={user.password}
          errors={errors}
          onIdentifierChange={handleIdentifierChange}
          onPasswordChange={handlePasswordChange}
          onSubmit={authenticateUser}
          loading={loading}
          disabled={false}
          onForgotPassword={() => navigate("/forgot-password")}
        /> : (
          <form className="bq-login-step" onSubmit={(event) => { event.preventDefault(); authenticateUser(); }}>
            <BoutiqueInput
              label="Six-digit authenticator code"
              icon={Key}
              inputMode="numeric"
              maxLength="6"
              placeholder="000000"
              value={authenticatorCode}
              onChange={(event) => {
                setAuthenticatorCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setErrors({});
              }}
              status={errors.authenticatorCode ? "error" : null}
              errorMessage={errors.authenticatorCode}
              required
            />
            <button type="submit" className="bq-login-btn bq-login-btn--primary" disabled={loading || authenticatorCode.length !== 6}>
              {loading ? "Verifying..." : "Verify and Sign In"}
            </button>
            <button
              type="button"
              className="bq-login-forgot"
              onClick={() => { setChallengeToken(""); setAuthenticatorCode(""); setErrors({}); }}
            >
              Use a different account
            </button>
          </form>
        )}

        <BoutiqueBox align="center" margin="8px 0 0">
          <BoutiqueText color={BQ_COLORS.inkMuted} weight={500}>
            New to AeroPulse?{" "}
            <button
              className="bq-signup-link"
              onClick={() => navigate("/register")}
            >
              Create Account
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
            <ShieldCheck size={20} weight="fill" />
            <BoutiqueText variant="label">Boutique Security</BoutiqueText>
          </BoutiqueBox>
          <BoutiqueStack gap={10} tag="ul" className="bq-tips-list">
            <BoutiqueText
              tag="li"
              size="13px"
              color={BQ_COLORS.inkMuted}
              weight={600}
            >
              Secure sign-in and encrypted session management
            </BoutiqueText>
            <BoutiqueText
              tag="li"
              size="13px"
              color={BQ_COLORS.inkMuted}
              weight={600}
            >
              Encrypted session management
            </BoutiqueText>
            <BoutiqueText
              tag="li"
              size="13px"
              color={BQ_COLORS.inkMuted}
              weight={600}
            >
              Assigned branch auto-routing enabled
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

        .bq-login-step { display: flex; flex-direction: column; gap: 24px; width: 100%; }
        .bq-login-btn { width: 100%; padding: 18px; border-radius: 999px; font-family: inherit; font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; border: none; }
        .bq-login-btn--primary { background: ${BQ_COLORS.brand}; color: white; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .bq-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .bq-tips-list { list-style: none; padding: 0; margin: 0; }
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

export default Login;
