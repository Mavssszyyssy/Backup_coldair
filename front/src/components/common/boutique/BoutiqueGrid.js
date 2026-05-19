import BoutiqueBox from "./BoutiqueBox";

/**
 * BOUTIQUE GRID
 * Responsive grid layout primitive.
 */
export default function BoutiqueGrid({
  children,
  columns = "repeat(auto-fill, minmax(280px, 1fr))",
  gap = 24,
  style = {},
  ...props
}) {
  return (
    <BoutiqueBox
      className="bq-grid-primitive"
      width="100%"
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        gap: typeof gap === "number" ? `${gap}px` : gap,
        ...style,
      }}
      {...props}
    >
      {children}
    </BoutiqueBox>
  );
}
