import coldAirLogo from "./images/Cold Air Logo.jpg";

function LoadingLogo({ compact = false, label = "Loading" }) {
  return (
    <span
      className={`loading-logo ${compact ? "loading-logo--compact" : ""}`}
      role="status"
      aria-label={label}
    >
      <img src={coldAirLogo} alt="" aria-hidden="true" />
      <span className="loading-logo__sr-only">{label}</span>
    </span>
  );
}

export default LoadingLogo;
