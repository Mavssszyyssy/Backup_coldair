/**
 * BOUTIQUE BOX
 * A primitive layout component mimicking React Native's View.
 * Uses Flexbox by default.
 */
export default function BoutiqueBox({
  children,
  direction = "column",
  justify = "flex-start",
  align = "stretch",
  gap = 0,
  padding = 0,
  margin = 0,
  width,
  height,
  background,
  flex,
  wrap = "nowrap",
  style = {},
  className = "",
  tag: Tag = "div",
  ...props
}) {
  const finalStyle = {
    display: "flex",
    flexDirection: direction,
    justifyContent: justify,
    alignItems: align,
    gap: typeof gap === "number" ? `${gap}px` : gap,
    padding: typeof padding === "number" ? `${padding}px` : padding,
    margin: typeof margin === "number" ? `${margin}px` : margin,
    width: width,
    height: height,
    background: background,
    flex: flex,
    flexWrap: wrap,
    boxSizing: "border-box",
    ...style,
  };

  return (
    <Tag className={`bq-box ${className}`} style={finalStyle} {...props}>
      {children}
    </Tag>
  );
}
