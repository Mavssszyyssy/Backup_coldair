import { ArrowLeft, Info, Key, LockKey } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import BoutiqueAuthHeader from "../common/boutique/BoutiqueAuthHeader";
import BoutiqueAuthLayout from "../common/boutique/BoutiqueAuthLayout";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";
import LoginForm from "./LoginForm";
import { getRoleHomePath } from "../../domain/webRoleHome";
import { translateText } from "../../utils/customerI18n";
import "./Login.css";

const LOCKOUT_STORAGE_KEY = "aeropulse:web-login-lockouts";
const normalizeIdentifier = (identifier) => identifier.trim().toLowerCase();

function readLockouts() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(LOCKOUT_STORAGE_KEY));
    return Array.isArray(stored)
      ? stored.filter((entry) => typeof entry?.identifier === "string" && Number.isFinite(entry.until) && entry.until > Date.now())
      : [];
  } catch {
    return [];
  }
}

function formatCountdown(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

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
  const { login, verifyLoginEmail, resendLoginEmail, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [authMessage, setAuthMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [lockouts, setLockouts] = useState(readLockouts);
  const [now, setNow] = useState(Date.now);
  const [resendAt, setResendAt] = useState(0);
  const identifier = normalizeIdentifier(user.identifier);
  const lockout = lockouts.find((entry) => entry.until > now && (!identifier || entry.identifier === identifier));
  const lockoutSeconds = lockout ? Math.ceil((lockout.until - now) / 1000) : 0;
  const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const countdownActive = lockoutSeconds > 0 || resendSeconds > 0;

  useEffect(() => {
    if (!countdownActive) return undefined;
    const updateClock = () => setNow(Date.now());
    const timer = window.setInterval(updateClock, 1000);
    window.addEventListener("focus", updateClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateClock);
    };
  }, [countdownActive]);

  useEffect(() => {
    setAuthMessage("");
  }, [location.search]);

  const handleIdentifierChange = (identifier) => {
    setNow(Date.now());
    setUser((prev) => ({ ...prev, identifier }));
    if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: "" }));
  };

  const handlePasswordChange = (password) => {
    setUser((prev) => ({ ...prev, password }));
    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
  };

  const resetChallenge = () => {
    setChallengeToken("");
    setVerificationCode("");
    setMaskedEmail("");
    setResendAt(0);
    setAuthMessage("");
    setErrors({});
  };

  const handleAccountLockout = (error) => {
    const seconds = error.data?.retryAfterSeconds;
    if (error.status !== 429 || error.data?.code !== "LOGIN_LOCKED" || !Number.isFinite(seconds) || seconds <= 0) return false;
    const currentTime = Date.now();
    const next = [
      { identifier, until: currentTime + seconds * 1000 },
      ...lockouts.filter((entry) => entry.identifier !== identifier && entry.until > currentTime),
    ];
    setLockouts(next);
    setNow(currentTime);
    try { sessionStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(next)); } catch { /* In-memory lockout still applies. */ }
    resetChallenge();
    setUser((previous) => ({ ...previous, password: "" }));
    return true;
  };

  const applyResendDeadline = (result) => {
    setNow(Date.now());
    setResendAt(Date.parse(result?.resendAvailableAt) || 0);
  };

  const authenticateUser = async () => {
    if (loading || lockoutSeconds || (challengeToken && verificationCode.length !== 6)) return;
    setErrors({});
    if (!user.identifier || !user.password) {
      alert(t("Please fill in all fields."));
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = challengeToken
        ? await verifyLoginEmail(challengeToken, verificationCode)
        : await login(user.identifier, user.password);
      if (loggedInUser?.requiresEmailVerification) {
        setChallengeToken(loggedInUser.challengeToken);
        setVerificationCode("");
        setMaskedEmail(loggedInUser.maskedEmail || "your account email");
        applyResendDeadline(loggedInUser);
        return;
      }
      navigate(
        loggedInUser?.role === "customer"
          ? getCustomerLoginDestination(location)
          : getRoleHomePath(loggedInUser?.role),
        { replace: true },
      );
    } catch (err) {
      if (!handleAccountLockout(err)) {
        setErrors(challengeToken
          ? { verificationCode: err.message }
          : { password: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (loading || lockoutSeconds || resendSeconds) return;
    setLoading(true);
    setErrors({});
    setAuthMessage("");
    try {
      const result = await resendLoginEmail(challengeToken);
      if (result?.challengeToken) setChallengeToken(result.challengeToken);
      applyResendDeadline(result);
      setAuthMessage(result?.message || "A new sign-in code was sent.");
    } catch (error) {
      if (!handleAccountLockout(error)) {
        const retryAfter = error.data?.retryAfterSeconds;
        if (error.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
          const currentTime = Date.now();
          setNow(currentTime);
          setResendAt(currentTime + retryAfter * 1000);
        } else {
          setErrors({ verificationCode: error.message || "Unable to resend the sign-in code." });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BoutiqueAuthLayout className="bq-auth-layout--sign-in">
      <Link className="bq-login-back-link" to="/home">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        {t("Back to Home")}
      </Link>

      <BoutiqueAuthHeader
        title={t("Sign in")}
        subtitle={t("Sign in to your Cold Air account")}
      />

      <BoutiqueStack gap={12} className="bq-login-form-inner">
        {lockoutSeconds > 0 && (
          <div className="bq-login-lockout">
            <LockKey size={20} weight="duotone" aria-hidden="true" />
            <div>
              <p role="status">{t("Sign-in temporarily locked")}</p>
              <p>{t("Try again in")} <strong role="timer">{formatCountdown(lockoutSeconds)}</strong></p>
            </div>
          </div>
        )}
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
              {t(authMessage)}
            </BoutiqueText>
          </BoutiqueBox>
        )}

        {!challengeToken ? <LoginForm
          currentLanguage={currentLanguage}
          identifier={user.identifier}
          password={user.password}
          errors={errors}
          onIdentifierChange={handleIdentifierChange}
          onPasswordChange={handlePasswordChange}
          onSubmit={authenticateUser}
          loading={loading}
          isLocked={lockoutSeconds > 0}
        /> : (
          <form className="bq-login-step" onSubmit={(event) => { event.preventDefault(); authenticateUser(); }}>
            <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>
              {t("Enter the six-digit code sent to")} {maskedEmail}.
            </BoutiqueText>
            <BoutiqueInput
              label={t("Email verification code")}
              icon={Key}
              inputMode="numeric"
              maxLength="6"
              placeholder="000000"
              value={verificationCode}
              disabled={loading}
              onChange={(event) => {
                setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setErrors({});
              }}
              status={errors.verificationCode ? "error" : null}
              errorMessage={t(errors.verificationCode)}
              required
            />
            <button type="submit" className="bq-login-btn bq-login-btn--primary" disabled={loading || verificationCode.length !== 6}>
              {t(loading ? "Verifying..." : "Verify and Sign In")}
            </button>
            <div className="bq-auth-secondary-actions">
              <button type="button" className="bq-auth-action bq-auth-action--outline" onClick={resendCode} disabled={loading || resendSeconds > 0}>
                {t("Resend code")}{resendSeconds > 0 && <> <span role="timer">{formatCountdown(resendSeconds)}</span></>}
              </button>
              <button
                type="button"
                className="bq-auth-action bq-auth-action--ghost"
                disabled={loading}
                onClick={resetChallenge}
              >
                {t("Use a different account")}
              </button>
            </div>
          </form>
        )}

        <BoutiqueBox align="center" className="bq-login-signup">
          <BoutiqueText color={BQ_COLORS.inkMuted} weight={500}>
            {t("New to AeroPulse?")}{" "}
            <Link className="bq-signup-link" to="/register">
              {t("Create Account")}
            </Link>
          </BoutiqueText>
        </BoutiqueBox>
      </BoutiqueStack>

    </BoutiqueAuthLayout>
  );
}

export default Login;
