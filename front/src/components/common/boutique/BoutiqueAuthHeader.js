import BoutiqueBox from "./BoutiqueBox";
import BoutiqueStack from "./BoutiqueStack";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS } from "./BoutiqueTheme";

/**
 * BOUTIQUE AUTH HEADER
 * Standard header block for titles and subtitles within Auth flows.
 */
export default function BoutiqueAuthHeader({ title, subtitle, children }) {
  return (
    <BoutiqueStack
      gap={12}
      margin="0 0 32px"
      width="100%"
      className="bq-auth-header-block bq-fade-in"
    >
      <BoutiqueBox
        direction="row"
        align="center"
        justify="space-between"
        gap={20}
        className="bq-auth-header-top"
      >
        <BoutiqueText variant="h1" style={{ fontWeight: 900, lineHeight: 1.1 }}>
          {title}
        </BoutiqueText>
        <BoutiqueBox align="center" className="bq-auth-header-extra">
          {children}
        </BoutiqueBox>
      </BoutiqueBox>
      {subtitle && (
        <BoutiqueText
          variant="body"
          color={BQ_COLORS.inkMuted}
          weight={500}
          style={{ opacity: 0.8, maxWidth: "400px", lineHeight: 1.5 }}
          className="bq-auth-subtitle"
        >
          {subtitle}
        </BoutiqueText>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 640px) {
          .bq-auth-header-top { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .bq-auth-header-block h1 { font-size: 28px !important; }
        }
      `,
        }}
      />
    </BoutiqueStack>
  );
}
