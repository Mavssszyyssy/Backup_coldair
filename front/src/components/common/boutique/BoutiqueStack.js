import BoutiqueBox from "./BoutiqueBox";

/**
 * BOUTIQUE STACK
 * Shorthand for vertical or horizontal layouts with gap.
 */
export default function BoutiqueStack({
  children,
  axis = "vertical",
  gap = 16,
  ...props
}) {
  return (
    <BoutiqueBox direction={axis === "vertical" ? "column" : "row"} gap={gap} {...props}>
      {children}
    </BoutiqueBox>
  );
}
