import { BQ_FONTS, BQ_TYPOGRAPHY, BQ_WEIGHTS } from "./BoutiqueTheme";

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
  margin = 0,
  style = {},
  className = "",
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "pageTitle":
      case "h1":
        return { ...BQ_TYPOGRAPHY.pageTitle, fontWeight: BQ_WEIGHTS.header };
      case "sectionTitle":
      case "h2":
        return { ...BQ_TYPOGRAPHY.sectionTitle, fontWeight: BQ_WEIGHTS.bold };
      case "cardTitle":
      case "h3":
        return { ...BQ_TYPOGRAPHY.cardTitle, fontWeight: BQ_WEIGHTS.bold };
      case "label":
        return {
          ...BQ_TYPOGRAPHY.label,
          fontWeight: BQ_WEIGHTS.semibold,
        };
      case "metadata":
        return {
          ...BQ_TYPOGRAPHY.metadata,
          color: "var(--ap-color-muted-foreground)",
        };
      case "caption":
        return {
          ...BQ_TYPOGRAPHY.caption,
          color: "var(--ap-color-muted-foreground)",
        };
      default:
        return BQ_TYPOGRAPHY.body;
    }
  };

  const variantStyle = getVariantStyles();
  const finalStyle = {
    fontFamily: BQ_FONTS.body,
    margin,
    ...variantStyle,
    color:
      color === "inherit" && variantStyle.color
        ? variantStyle.color
        : color,
    textAlign: align,
    ...(weight !== undefined ? { fontWeight: weight } : {}),
    ...(size !== undefined ? { fontSize: size } : {}),
    ...style,
  };

  const Tag =
    variant === "h1" || variant === "pageTitle"
      ? "h1"
      : variant === "h2" || variant === "sectionTitle"
        ? "h2"
        : variant === "h3" || variant === "cardTitle"
          ? "h3"
          : "p";

  return (
    <Tag className={`bq-text ${className}`} style={finalStyle} {...props}>
      {children}
    </Tag>
  );
}
