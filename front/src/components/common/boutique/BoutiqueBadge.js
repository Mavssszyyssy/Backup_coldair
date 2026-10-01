import { BQ_COLORS } from "./BoutiqueTheme";

/**
 * BOUTIQUE BADGE
 * Technical status indicator or categorical label.
 * CLEANED: Now uses the centralized Boutique.css for layout and strictly
 * scopes dynamic colors via inline styles to prevent global collisions.
 */
export default function BoutiqueBadge({
  children,
  variant = "muted",
  pill = false,
  size = "md", // "xs", "sm", "md", "lg"
  icon: Icon,
  className = "",
}) {
  const variantStyles = {
    brand: { bg: BQ_COLORS.brand, text: "var(--ap-color-primary-foreground)" },
    accent: { bg: BQ_COLORS.accent, text: "var(--ap-color-secondary-foreground)" },
    accentSoft: { bg: "var(--ap-color-information-soft)", text: BQ_COLORS.accent },
    success: { bg: "var(--ap-color-success-soft)", text: BQ_COLORS.success },
    danger: { bg: "var(--ap-color-error-soft)", text: BQ_COLORS.danger },
    muted: { bg: BQ_COLORS.bg, text: BQ_COLORS.inkMuted },
    ink: { bg: BQ_COLORS.brand, text: "var(--ap-color-primary-foreground)" },
    outline: {
      bg: BQ_COLORS.surface,
      text: BQ_COLORS.ink,
      border: `1px solid ${BQ_COLORS.border}`,
    },
  };

  const style = variantStyles[variant] || variantStyles.muted;
  const fontSizes = { xs: "9px", sm: "11px", md: "13px", lg: "15px" };
  const paddings = {
    xs: "3px 6px",
    sm: "4px 10px",
    md: "6px 14px",
    lg: "8px 18px",
  };

  return (
    <div
      className={`ap-badge bq-badge ${pill ? "bq-badge--pill" : ""} ${className}`.trim()}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: style.border || "none",
        fontSize: fontSizes[size],
        padding: paddings[size],
      }}
    >
      {Icon && <Icon size={size === "xs" ? 10 : 14} weight="bold" />}
      <span>{children}</span>
    </div>
  );
}
