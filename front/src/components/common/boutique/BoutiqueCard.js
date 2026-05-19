import BoutiqueBox from "./BoutiqueBox";
import { BQ_COLORS, BQ_GEOMETRY, BQ_SHADOWS } from "./BoutiqueTheme";

/**
 * BOUTIQUE CARD
 * Generic card primitive.
 */
export default function BoutiqueCard({
  children,
  padding = 24,
  radius = BQ_GEOMETRY.radiusCard,
  shadow = BQ_SHADOWS.soft,
  border = `1px solid ${BQ_COLORS.border}`,
  background = "white",
  style = {},
  ...props
}) {
  return (
    <BoutiqueBox
      className="bq-card-primitive"
      padding={padding}
      background={background}
      style={{
        borderRadius: radius,
        boxShadow: shadow,
        border: border,
        ...style,
      }}
      {...props}
    >
      {children}
    </BoutiqueBox>
  );
}
