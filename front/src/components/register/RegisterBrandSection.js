import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";
const coldAirLogo = "/Cold Air Logo-compact.webp";

export default function RegisterBrandSection() {
  return (
    <div className="bq-reg-brand">
      <div className="bq-reg-brand-dots" aria-hidden="true" />
      <div className="bq-reg-brand-content">
        <div className="bq-reg-logo">
          <img src={coldAirLogo} alt="Cold Air logo" />
        </div>
        <h1 className="bq-reg-brand-name">COLD AIR</h1>
        <p className="bq-reg-brand-tagline">AIRCONDITIONING TRADING</p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-reg-brand {
          position: relative;
          background: ${BQ_COLORS.brand};
          color: white;
          padding: 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          flex: 1;
          width: 100%;
          min-height: 100%;
        }

        .bq-reg-brand-dots {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.5;
        }

        .bq-reg-brand-content { position: relative; z-index: 10; width: 100%; max-width: 440px; text-align: center; }

        .bq-reg-logo {
          width: 120px; height: 120px;
          background: white;
          border-radius: 28px;
          padding: 16px;
          margin: 0 auto 32px;
          box-shadow: ${BQ_SHADOWS.float};
        }
        .bq-reg-logo img { width: 100%; height: 100%; object-fit: contain; }

        .bq-reg-brand-name {
          font-family: ${BQ_FONTS.heading};
          font-size: 48px; font-weight: 900;
          letter-spacing: -0.02em; margin: 0; line-height: 1;
        }

        .bq-reg-brand-tagline {
          font-size: 16px; font-weight: 700;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase; letter-spacing: 0.25em;
          margin-top: 12px;
        }

        @media (max-width: 1024px) {
          .bq-reg-brand { padding: 40px 24px; min-height: fit-content; }
          .bq-reg-brand-name { font-size: 36px; }
          .bq-reg-logo { width: 100px; height: 100px; border-radius: 24px; margin-bottom: 24px; }
        }
      `,
        }}
      />
    </div>
  );
}
