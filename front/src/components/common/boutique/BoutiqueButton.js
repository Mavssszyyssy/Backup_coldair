/**
 * BOUTIQUE BUTTON
 * Unified button for Auth flows and generic actions.
 * CLEANED: Now uses the centralized Boutique.css for layout and strictly
 * scopes dynamic behavior via class variants to prevent global collisions.
 */
export default function BoutiqueButton({
  children,
  variant = "primary",
  loading = false,
  fullWidth = false,
  size = "md", // "sm", "md", "lg"
  className = "",
  disabled = false,
  ...props
}) {
  const variantClass = `bq-btn--${variant}`;
  const sizeClass = `bq-btn--${size}`;
  const fullWidthClass = fullWidth ? "full-width" : "";
  const foundationVariant = {
    primary: "primary",
    outline: "outline",
    ghost: "ghost",
    cancel: "ghost",
    danger: "danger",
    secondary: "secondary",
  }[variant] || "primary";

  return (
    <button
      {...props}
      className={`ap-button ap-button--${foundationVariant} bq-btn ${variantClass} ${sizeClass} ${fullWidthClass} ${className}`.trim()}
      disabled={loading || disabled}
    >
      {loading ? "Processing..." : children}
    </button>
  );
}
