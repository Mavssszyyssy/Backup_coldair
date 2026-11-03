import { Headset, ThermometerCold, Truck, Wrench } from "@phosphor-icons/react";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";
const coldAirLogo = "/Cold Air Logo-compact.webp";

export default function LoginBrandSection() {
  const features = [
    { icon: ThermometerCold, text: "Premium Quality AC Units" },
    { icon: Wrench, text: "Expert Installation Service" },
    { icon: Headset, text: "24/7 Customer Support" },
    { icon: Truck, text: "Free Delivery Nationwide" },
  ];

  return (
    <div className="bq-login-brand">
      <div className="bq-login-brand-dots" aria-hidden="true" />
      <div className="bq-login-brand-content">
        <div className="bq-login-logo">
          <img src={coldAirLogo} alt="Cold Air logo" />
        </div>
        <h1 className="bq-login-brand-name">COLD AIR</h1>
        <p className="bq-login-brand-tagline">AIRCONDITIONING TRADING</p>

        <div className="bq-login-features">
          {features.map((feature, index) => (
            <div key={index} className="bq-login-feature-item">
              <span className="bq-login-feature-icon">
                <feature.icon size={20} weight="fill" />
              </span>
              <span>{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-login-brand {
          position: relative;
          background: ${BQ_COLORS.brand};
          color: white;
          padding: 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          min-height: 100%;
        }

        .bq-login-brand-dots {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.5;
        }

        .bq-login-brand-content { position: relative; z-index: 10; max-width: 440px; margin: 0 auto; }

        .bq-login-logo {
          width: 80px; height: 80px;
          background: white;
          border-radius: 20px;
          padding: 12px;
          margin-bottom: 32px;
          box-shadow: ${BQ_SHADOWS.float};
        }
        .bq-login-logo img { width: 100%; height: 100%; object-fit: contain; }

        .bq-login-brand-name {
          font-family: ${BQ_FONTS.heading};
          font-size: 40px; font-weight: 900;
          letter-spacing: -0.02em; margin: 0; line-height: 1;
        }

        .bq-login-brand-tagline {
          font-size: 14px; font-weight: 700;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase; letter-spacing: 0.2em;
          margin-top: 8px; margin-bottom: 64px;
        }

        .bq-login-features { display: flex; flex-direction: column; gap: 32px; }

        .bq-login-feature-item {
          display: flex; align-items: center; gap: 20px;
          font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.9);
        }

        .bq-login-feature-icon {
          width: 44px; height: 44px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: ${BQ_COLORS.accent};
        }

        @media (max-width: 1024px) {
          .bq-login-brand { padding: 40px; min-height: auto; }
          .bq-login-brand-name { font-size: 32px; }
          .bq-login-brand-tagline { margin-bottom: 40px; }
        }
      `,
        }}
      />
    </div>
  );
}
