import { Headphones, ShieldCheck, Truck } from "@phosphor-icons/react";
import { useUser } from "../../context/UserContext";
import { translateText } from "../../utils/customerI18n";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";

export default function HomeInfo() {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const features = [
    {
      icon: ShieldCheck,
      title: "Certified Service",
      desc: "Manufacturer-approved maintenance and installation experts.",
    },
    {
      icon: Truck,
      title: "Precision Delivery",
      desc: "Next-day shipping on all in-stock boutique AC units.",
    },
    {
      icon: Headphones,
      title: "Direct Support",
      desc: "24/7 dedicated line for our premium account holders.",
    },
  ];

  return (
    <section className="home-info">
      <div className="info-container">
        <div className="info-main">
          <h2 className="info-title">{t("Why AeroPulse?")}</h2>
          <p className="info-text">
            {t("We don't just sell air conditioners; we curate comfort environments. Our boutique approach ensures that every unit is paired with precision engineering and world-class support.")}
          </p>
          <div className="info-features">
            {features.map((f, i) => (
              <div key={i} className="feat-item">
                <div className="feat-icon">
                  <f.icon size={24} weight="fill" />
                </div>
                <div className="feat-content">
                  <h3>{t(f.title)}</h3>
                  <p>{t(f.desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="info-visual">
          {/* A high-end floating stat block */}
          <div className="stat-blob">
            <span className="stat-num">99.8%</span>
            <span className="stat-label">{t("Client Satisfaction")}</span>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .home-info {
          padding: 120px 40px;
          background: ${BQ_COLORS.bgAlt};
        }

        .info-container {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 100px;
          align-items: center;
        }

        .info-title {
          font-family: ${BQ_FONTS.heading};
          font-size: 56px; font-weight: 950;
          color: ${BQ_COLORS.ink}; letter-spacing: -0.05em;
          margin-bottom: 28px;
          line-height: 1.05;
        }

        .info-text {
          font-size: 20px; color: ${BQ_COLORS.inkMuted};
          line-height: 1.6; margin-bottom: 72px;
          max-width: 600px;
          font-weight: 500;
        }

        .info-features { display: flex; flex-direction: column; gap: 48px; }

        .feat-item { display: flex; gap: 32px; align-items: flex-start; }
        .feat-icon {
          width: 64px; height: 64px; background: ${BQ_COLORS.brand}; color: white;
          border-radius: 20px; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 15px 30px rgba(0,0,0,0.12);
          transition: all 0.4s ease;
        }
        .feat-item:hover .feat-icon { transform: scale(1.1) rotate(5deg); background: ${BQ_COLORS.accent}; }
        :root[data-theme='dark'] .home-info .feat-item:hover .feat-icon { background: ${BQ_COLORS.brandHover}; }

        .feat-content h3 {
          font-family: ${BQ_FONTS.heading}; font-size: 22px; font-weight: 900;
          color: ${BQ_COLORS.ink}; margin-bottom: 8px; letter-spacing: -0.02em;
        }
        .feat-content p { font-size: 16px; color: ${BQ_COLORS.inkMuted}; line-height: 1.6; font-weight: 500; }

        .info-visual { display: flex; justify-content: center; position: relative; }

        .stat-blob {
          width: 380px; height: 380px; background: ${BQ_COLORS.surface};
          border-radius: 80px; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          box-shadow: ${BQ_SHADOWS.hover};
          transform: rotate(-3deg);
          border: 1px solid ${BQ_COLORS.border};
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stat-blob:hover { transform: rotate(0deg) scale(1.05); box-shadow: ${BQ_SHADOWS.float}; }

        .stat-num { font-family: ${BQ_FONTS.heading}; font-size: 88px; font-weight: 950; color: ${BQ_COLORS.brand}; letter-spacing: -0.06em; line-height: 1; }
        :root[data-theme='dark'] .home-info .stat-num { color: ${BQ_COLORS.accent}; }
        .stat-label { font-family: ${BQ_FONTS.heading}; font-size: 15px; font-weight: 900; color: ${BQ_COLORS.inkMuted}; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 10px; }

        @media (max-width: 1024px) {
          .info-container { grid-template-columns: minmax(0, 1fr); gap: 64px; }
          .info-visual { display: none; }
        }

        @media (max-width: 480px) {
          .home-info { padding-inline: 24px; }
          .info-title { font-size: clamp(36px, 10vw, 48px); }
          .feat-item { gap: 16px; }
        }
      `,
        }}
      />
    </section>
  );
}
