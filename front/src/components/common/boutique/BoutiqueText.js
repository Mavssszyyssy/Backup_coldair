import { BQ_FONTS, BQ_WEIGHTS } from "./BoutiqueTheme";

/**
 * BOUTIQUE TEXT
 * React-Native style typography primitive.
 */
export default function BoutiqueText({
  children,
  variant = "body", // "h1", "h2", "h3", "body", "caption", "label"
  color = "inherit",
  weight,
  align,
  size,
  style = {},
  className = "",
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "h1":
        return { fontSize: "32px", fontWeight: BQ_WEIGHTS.header };
      case "h2":
        return { fontSize: "24px", fontWeight: BQ_WEIGHTS.bold };
      case "h3":
        return { fontSize: "18px", fontWeight: BQ_WEIGHTS.bold };
      case "label":
        return {
          fontSize: "12px",
          fontWeight: BQ_WEIGHTS.bold,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        };
      case "caption":
        return { fontSize: "12px", opacity: 0.8 };
      default:
        return { fontSize: "15px" };
    }
  };

  const finalStyle = {
    fontFamily: BQ_FONTS.body,
    color: color,
    textAlign: align,
    fontWeight: weight,
    fontSize: size,
    margin: 0,
    ...getVariantStyles(),
    ...style,
  };

  const Tag =
    variant === "h1"
      ? "h1"
      : variant === "h2"
        ? "h2"
        : variant === "h3"
          ? "h3"
          : "p";

  return (
    <Tag className={`bq-text ${className}`} style={finalStyle} {...props}>
      {children}
    </Tag>
  );
}
