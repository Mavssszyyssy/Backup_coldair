import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  TwitterLogo,
} from "@phosphor-icons/react";
import BoutiqueBox from "./BoutiqueBox";
import BoutiqueGrid from "./BoutiqueGrid";
import BoutiqueStack from "./BoutiqueStack";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS, BQ_SHADOWS } from "./BoutiqueTheme";

/**
 * BOUTIQUE FOOTER
 */
export default function BoutiqueFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <BoutiqueBox
      tag="footer"
      background={BQ_COLORS.bgAlt}
      padding="80px 40px 40px"
      margin="auto 0 0"
      className="bq-footer"
      style={{ borderTop: `1px solid ${BQ_COLORS.border}` }}
    >
      <BoutiqueGrid
        columns="1.5fr 1fr 1fr"
        gap={64}
        margin="0 auto 80px"
        className="bq-footer-content"
        style={{ maxWidth: "1400px" }}
      >
        <BoutiqueStack gap={32} className="bq-footer-brand">
          <BoutiqueText
            variant="label"
            size="13px"
            weight={700}
            style={{ letterSpacing: "0.25em", opacity: 0.8 }}
          >
            AeroPulse
          </BoutiqueText>
          <BoutiqueText
            variant="body"
            color={BQ_COLORS.inkMuted}
            style={{ lineHeight: 1.7, maxWidth: "340px" }}
            className="bq-footer-text"
          >
            The definitive boutique destination for premium air conditioning
            solutions. Experience the art of perfect cooling.
          </BoutiqueText>
          <BoutiqueBox direction="row" gap={12} className="bq-social-links">
            <button className="bq-social-btn">
              <FacebookLogo size={20} weight="bold" />
            </button>
            <button className="bq-social-btn">
              <TwitterLogo size={20} weight="bold" />
            </button>
            <button className="bq-social-btn">
              <InstagramLogo size={20} weight="bold" />
            </button>
            <button className="bq-social-btn">
              <LinkedinLogo size={20} weight="bold" />
            </button>
          </BoutiqueBox>
        </BoutiqueStack>

        <BoutiqueStack gap={32} className="bq-footer-column">
          <BoutiqueText
            variant="label"
            size="13px"
            weight={700}
            style={{ letterSpacing: "0.25em", opacity: 0.8 }}
          >
            Collections
          </BoutiqueText>
          <BoutiqueStack
            gap={16}
            tag="ul"
            className="bq-footer-links"
            padding={0}
            margin={0}
            style={{ listStyle: "none" }}
          >
            <li>
              <a href="/shop?cat=split">Split Type</a>
            </li>
            <li>
              <a href="/shop?cat=window">Window Type</a>
            </li>
            <li>
              <a href="/shop?cat=floor">Floor Type</a>
            </li>
            <li>
              <a href="/shop?cat=portable">Portable Units</a>
            </li>
          </BoutiqueStack>
        </BoutiqueStack>

        <BoutiqueStack gap={32} className="bq-footer-column">
          <BoutiqueText
            variant="label"
            size="13px"
            weight={700}
            style={{ letterSpacing: "0.25em", opacity: 0.8 }}
          >
            Experience
          </BoutiqueText>
          <BoutiqueStack
            gap={16}
            tag="ul"
            className="bq-footer-links"
            padding={0}
            margin={0}
            style={{ listStyle: "none" }}
          >
            <li>
              <a href="/services">Mobile Services</a>
            </li>
            <li>
              <a href="/myunit">My Units</a>
            </li>
            <li>
              <a href="/contact">Support</a>
            </li>
            <li>
              <a href="/faq">FAQ</a>
            </li>
          </BoutiqueStack>
        </BoutiqueStack>
      </BoutiqueGrid>

      <BoutiqueBox
        padding="40px 0 0"
        align="center"
        className="bq-footer-bottom"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          borderTop: `1px solid ${BQ_COLORS.border}`,
        }}
      >
        <BoutiqueText
          size="13px"
          weight={600}
          color={BQ_COLORS.inkFaint}
          style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
        >
          © {currentYear} AeroPulse Boutique. All rights reserved.
        </BoutiqueText>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-footer-links a {
          color: ${BQ_COLORS.inkMuted}; text-decoration: none;
          font-size: 15px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          font-weight: 600; display: inline-block;
        }
        .bq-footer-links a:hover { color: ${BQ_COLORS.accent}; transform: translateX(8px); }

        .bq-social-btn {
          width: 48px; height: 48px; background: white;
          border: 1px solid ${BQ_COLORS.border}; border-radius: 14px; color: ${BQ_COLORS.ink};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: ${BQ_SHADOWS.soft};
        }
        .bq-social-btn:hover { background: ${BQ_COLORS.brand}; color: white; transform: translateY(-6px) scale(1.1); box-shadow: ${BQ_SHADOWS.float}; border-color: transparent; }

        @media (max-width: 768px) {
          .bq-footer-content { grid-template-columns: 1fr !important; gap: 48px !important; }
          .bq-footer { padding-top: 64px !important; }
        }
      `,
        }}
      />
    </BoutiqueBox>
  );
}
