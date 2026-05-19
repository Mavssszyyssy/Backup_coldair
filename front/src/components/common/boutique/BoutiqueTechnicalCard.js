import BoutiqueBox from "./BoutiqueBox";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS } from "./BoutiqueTheme";

/**
 * BOUTIQUE TECHNICAL CARD
 * A boxy, technical container for key unit metadata (HP, Stock, etc.).
 */
export default function BoutiqueTechnicalCard({
  children,
  variant = "neutral",
  size = "md", // "sm", "md"
  icon: Icon,
}) {
  const variantStyles = {
    neutral: {
      bg: BQ_COLORS.bg,
      text: BQ_COLORS.ink,
      border: BQ_COLORS.border,
    },
    accent: {
      bg: "rgba(37, 99, 235, 0.05)",
      text: BQ_COLORS.accent,
      border: "rgba(37, 99, 235, 0.15)",
    },
    success: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
    danger: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    brand: { bg: BQ_COLORS.brand, text: "white", border: BQ_COLORS.brand },
    blue: { bg: "#1e40af", text: "white", border: "#1e3a8a" }, // DEEP TECHNICAL BLUE
  };

  const currentVariant = variantStyles[variant] || variantStyles.neutral;

  return (
    <BoutiqueBox
      direction="row"
      align="center"
      justify="center"
      gap={size === "sm" ? 4 : 6}
      padding={size === "sm" ? "4px 8px" : "6px 12px"}
      background={currentVariant.bg}
      className={`bq-tech-card bq-tech-card--${size}`}
      style={{
        borderRadius: "8px",
        border: `1px solid ${currentVariant.border}`,
        color: currentVariant.text,
        width: "fit-content",
        whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} weight="bold" />}
      <BoutiqueText
        size={size === "sm" ? "11px" : "13px"}
        weight={700}
        color="inherit"
        style={{ letterSpacing: "0.02em" }}
      >
        {children}
      </BoutiqueText>
    </BoutiqueBox>
  );
}
