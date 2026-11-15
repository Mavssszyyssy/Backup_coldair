import { BQ_FONTS, BQ_WEIGHTS } from "./BoutiqueTheme";

const heading = { lineHeight: "var(--app-leading-heading)", fontWeight: "var(--app-weight-heading)", overflowWrap: "anywhere" };
const variants = {
  h1: { ...heading, fontSize: "var(--app-type-page)" },
  h2: { ...heading, fontSize: "var(--app-type-section)" },
  h3: { ...heading, fontSize: "var(--app-type-card)" },
  body: { fontSize: "var(--app-type-body)", lineHeight: "var(--app-leading-body)" },
  caption: { fontSize: "var(--app-type-meta)", lineHeight: "var(--app-leading-label)" },
  label: { fontSize: "var(--app-type-label)", lineHeight: "var(--app-leading-label)", fontWeight: BQ_WEIGHTS.semibold },
};
const headingTags = new Set(["h1", "h2", "h3"]);

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
  const finalStyle = {
    fontFamily: BQ_FONTS.body,
    color,
    textAlign: align,
    margin: 0,
    ...(variants[variant] || variants.body),
    ...(size ? { fontSize: `max(var(--app-type-caption), ${size})` } : {}),
    ...(weight !== undefined ? { fontWeight: weight } : {}),
    ...style,
  };

  const Tag = headingTags.has(variant) ? variant : "p";

  return (
    <Tag className={`bq-text ${className}`} style={finalStyle} {...props}>
      {children}
    </Tag>
  );
}
