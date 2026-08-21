import { CalendarCheck, ShoppingBag } from "@phosphor-icons/react";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";

export default function HomeHero({ onBookNow, onShop }) {
  return (
    <section className="home-hero">
      <div className="hero-content">
        <span className="hero-badge">AeroPulse Premium</span>
        <h1 className="hero-title">
          Experience the Art of <br />
          Perfect Cooling.
        </h1>
        <p className="hero-subtitle">
          From high-performance Inverter ACs to precision maintenance services.
          We bring boutique comfort to your living space.
        </p>

        <div className="hero-actions">
          <button className="hero-btn hero-btn-primary" onClick={onShop}>
            Shop Collections <ShoppingBag size={20} weight="bold" />
          </button>
          <button className="hero-btn hero-btn-secondary" onClick={onBookNow}>
            Get the Mobile App <CalendarCheck size={20} weight="bold" />
          </button>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .home-hero {
          position: relative;
          padding: 120px 40px;
          background: ${BQ_COLORS.bgAlt};
          overflow: hidden;
          display: flex;
          justify-content: center;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
          position: relative;
          z-index: 10;
        }

        .hero-badge {
          display: inline-block;
          padding: 10px 20px;
          background: ${BQ_COLORS.surface};
          color: ${BQ_COLORS.accent};
          border-radius: ${BQ_GEOMETRY.radiusPill};
          font-family: ${BQ_FONTS.heading};
          font-weight: 900;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          box-shadow: ${BQ_SHADOWS.soft};
          margin-bottom: 32px;
          border: 1px solid ${BQ_COLORS.border};
          animation: slideDown 0.6s ease;
        }

        .hero-title {
          font-family: ${BQ_FONTS.heading};
          font-size: 82px;
          font-weight: 950;
          line-height: 0.95;
          color: ${BQ_COLORS.ink};
          letter-spacing: -0.05em;
          margin-bottom: 28px;
          animation: fadeIn 0.8s ease;
        }

        .hero-subtitle {
          font-size: 21px;
          color: ${BQ_COLORS.inkMuted};
          line-height: 1.5;
          margin-bottom: 56px;
          max-width: 680px;
          margin-left: auto;
          margin-right: auto;
          animation: fadeIn 1s ease;
        }

        .hero-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
          animation: fadeIn 1.2s ease;
        }

        .hero-btn {
          padding: 22px 48px;
          border-radius: ${BQ_GEOMETRY.radiusPill};
          font-family: ${BQ_FONTS.heading};
          font-weight: 900;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 12px;
          border: none;
        }

        .hero-btn-primary {
          background: ${BQ_COLORS.brand};
          color: white;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .hero-btn-primary:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 30px 60px rgba(0,0,0,0.15);
          background: ${BQ_COLORS.brandHover};
        }

        .hero-btn-secondary {
          background: white;
          color: ${BQ_COLORS.ink};
          box-shadow: ${BQ_SHADOWS.soft};
          border: 1px solid ${BQ_COLORS.border};
        }
        .hero-btn-secondary:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: ${BQ_SHADOWS.float};
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1024px) {
          .hero-title { font-size: 64px; }
        }

        @media (max-width: 768px) {
          .home-hero { padding: 80px 24px; }
          .hero-title { font-size: 48px; }
          .hero-subtitle { font-size: 18px; }
          .hero-actions { flex-direction: column; width: 100%; }
          .hero-btn { width: 100%; justify-content: center; }
        }
      `,
        }}
      />
    </section>
  );
}
