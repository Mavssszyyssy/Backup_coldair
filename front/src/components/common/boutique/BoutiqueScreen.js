import BoutiqueBox from "./BoutiqueBox";
import { BQ_GEOMETRY } from "./BoutiqueTheme";

/**
 * BOUTIQUE SCREEN
 * Top-level container for pages.
 * Handles header height offsets and scroll behavior.
 */
export default function BoutiqueScreen({
  children,
  background = "white",
  scrollable = true,
  withHeader = false,
  padding = 0,
  ...props
}) {
  return (
    <BoutiqueBox
      className="bq-screen"
      width="100%"
      height={scrollable ? "auto" : "100vh"}
      background={background}
      style={{
        minHeight: "100vh",
        paddingTop: withHeader ? BQ_GEOMETRY.headerHeight : 0,
        overflowY: scrollable ? "visible" : "hidden",
      }}
      {...props}
    >
      <BoutiqueBox flex={1} padding={padding} width="100%">
        {children}
      </BoutiqueBox>
    </BoutiqueBox>
  );
}
