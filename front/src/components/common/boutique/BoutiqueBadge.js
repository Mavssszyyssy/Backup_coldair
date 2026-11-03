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
}) {
  const variantStyles = {
    brand: { bg: BQ_COLORS.brand, text: "white" },
    accent: { bg: BQ_COLORS.accent, text: "white" },
    accentSoft: { bg: "rgba(37, 99, 235, 0.05)", text: BQ_COLORS.accent },
    success: { bg: "#d1fae5", text: "#065f46" },
    danger: { bg: "#fee2e2", text: "#991b1b" },
    muted: { bg: BQ_COLORS.bg, text: BQ_COLORS.inkMuted },
    ink: { bg: BQ_COLORS.brand, text: "white" },
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
      className={`bq-badge ${pill ? "bq-badge--pill" : ""}`}
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
