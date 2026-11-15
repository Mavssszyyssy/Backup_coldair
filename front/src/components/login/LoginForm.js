import { ArrowRight, LockKey, UserCircle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import { translateText } from "../../utils/customerI18n";

export default function LoginForm({
  currentLanguage = "English",
  identifier,
  password,
  errors,
  onIdentifierChange,
  onPasswordChange,
  onSubmit,
  loading,
}) {
  const t = (value) => translateText(value, currentLanguage);
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="bq-login-step" onSubmit={handleSubmit}>
      <BoutiqueInput
        maxLength={254}
        label={t("Sign-in alias")}
        icon={UserCircle}
        placeholder="juan.dc"
        autoComplete="username"
        value={identifier}
        onChange={(e) => onIdentifierChange(e.target.value)}
        status={errors.identifier ? "error" : null}
        errorMessage={t(errors.identifier)}
        required
      />

      <div className="bq-login-password-field">
        <BoutiqueInput
          maxLength={128}
          label={t("Password")}
          icon={LockKey}
          type="password"
          language={currentLanguage}
          autoComplete="current-password"
          placeholder={t("Enter your password")}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          status={errors.password ? "error" : null}
          errorMessage={t(errors.password)}
          required
        />
        <Link to="/forgot-password" className="bq-login-forgot">
          {t("Reset password")}
        </Link>
      </div>

      <button
        type="submit"
        className="bq-login-btn bq-login-btn--primary"
        disabled={loading}
      >
        {t(loading ? "Signing in..." : "Sign in")}
        {!loading && <ArrowRight size={18} weight="bold" aria-hidden="true" />}
      </button>
    </form>
  );
}
