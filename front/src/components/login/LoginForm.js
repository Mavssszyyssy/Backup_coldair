import { ArrowRight, LockKey, UserCircle } from "@phosphor-icons/react";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import { BQ_COLORS, BQ_GEOMETRY } from "../common/boutique/BoutiqueTheme";

export default function LoginForm({
  identifier,
  password,
  errors,
  onIdentifierChange,
  onPasswordChange,
  onSubmit,
  loading,
  disabled,
  onForgotPassword,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="bq-login-step" onSubmit={handleSubmit}>
      <BoutiqueInput
        label="Sign-In Alias"
        icon={UserCircle}
        placeholder="juan.dc"
        value={identifier}
        onChange={(e) => onIdentifierChange(e.target.value)}
        disabled={disabled}
        status={errors.identifier ? "error" : null}
        errorMessage={errors.identifier}
        required
      />

      <div className="bq-login-password-field">
        <div className="bq-login-pass-header">
          <label className="bq-input-label">Password</label>
          <button
            type="button"
            className="bq-login-forgot"
            onClick={onForgotPassword}
            tabIndex="-1"
          >
            Reset Password
          </button>
        </div>

        <BoutiqueInput
          icon={LockKey}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={disabled}
          status={errors.password ? "error" : null}
          errorMessage={errors.password}
          style={{ fontFamily: "monospace" }}
          required
        />
      </div>

      <button
        type="submit"
        className="bq-login-btn bq-login-btn--primary"
        disabled={disabled || loading}
      >
        {loading ? "Signing in..." : "Sign In"}{" "}
        {!loading && <ArrowRight size={18} weight="bold" />}
      </button>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-login-step { display: flex; flex-direction: column; gap: 24px; width: 100%; }

        .bq-login-password-field { display: flex; flex-direction: column; gap: 8px; }

        .bq-login-pass-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bq-login-forgot {
          background: none; border: none; font-size: 11px; font-weight: 800;
          color: ${BQ_COLORS.brand}; cursor: pointer; text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.2s;
        }
        .bq-login-forgot:hover { text-decoration: underline; opacity: 0.8; }

        .bq-login-btn {
          width: 100%; padding: 18px; border-radius: ${BQ_GEOMETRY.radiusPill};
          font-family: inherit; font-weight: 800; font-size: 15px;
          text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 10px; transition: all 0.3s; border: none;
          margin-top: 8px;
        }

        .bq-login-btn--primary { background: ${BQ_COLORS.brand}; color: white; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .bq-login-btn--primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(0,0,0,0.2); }
        .bq-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `,
        }}
      />
    </form>
  );
}
