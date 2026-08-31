import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import LoadingLogo from "../common/LoadingLogo";
import "./AuthenticatorSetup.css";

export default function AuthenticatorSetup() {
  const navigate = useNavigate();
  const { completeAuthenticatorSetup } = useUser();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const status = await apiRequest("/security/status");
        if (!active) return;
        if (status.security?.totpEnabled) {
          navigate("/shop", { replace: true });
          return;
        }
        const result = await apiRequest("/security/totp/setup", {
          method: "POST",
          body: JSON.stringify({}),
        });
        if (active) setSetup(result);
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to start authenticator setup.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [navigate]);

  const verify = async (event) => {
    event.preventDefault();
    if (code.length !== 6) return;
    setSubmitting(true);
    setError("");
    try {
      await completeAuthenticatorSetup(code);
      const result = await apiRequest("/security/recovery-codes/regenerate", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setRecoveryCodes((result.codes || []).map((item) => item.code || item).filter(Boolean));
    } catch (verifyError) {
      setError(verifyError.message || "The authenticator code could not be verified.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="authenticator-setup-loading"><LoadingLogo /></div>;

  return (
    <main className="authenticator-setup-page">
      <section className="authenticator-setup-card">
        <div className="authenticator-setup-brand">Cold Air ACT</div>
        {recoveryCodes.length ? (
          <>
            <h1>Save your recovery codes</h1>
            <p>Store these one-time codes somewhere safe. Each code can restore access if your authenticator is unavailable.</p>
            <div className="authenticator-recovery-grid">
              {recoveryCodes.map((recoveryCode) => <code key={recoveryCode}>{recoveryCode}</code>)}
            </div>
            <button type="button" className="authenticator-primary" onClick={() => navigate("/shop", { replace: true })}>
              I saved my recovery codes
            </button>
          </>
        ) : setup ? (
          <>
            <h1>Protect your account</h1>
            <p>Scan this QR code with Google Authenticator, Microsoft Authenticator, or another authenticator app.</p>
            <div className="authenticator-qr"><QRCodeCanvas value={setup.provisioningUri} size={190} /></div>
            <p className="authenticator-secret-label">Can’t scan it? Enter this setup key:</p>
            <code className="authenticator-secret">{setup.secret}</code>
            <form onSubmit={verify}>
              <label htmlFor="authenticator-code">Six-digit authenticator code</label>
              <input
                id="authenticator-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
              />
              {error ? <p className="authenticator-error" role="alert">{error}</p> : null}
              <button type="submit" className="authenticator-primary" disabled={submitting || code.length !== 6}>
                {submitting ? "Verifying..." : "Verify authenticator"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Authenticator setup unavailable</h1>
            <p className="authenticator-error" role="alert">{error || "Please try again."}</p>
            <button type="button" className="authenticator-primary" onClick={() => window.location.reload()}>Try again</button>
          </>
        )}
      </section>
    </main>
  );
}
