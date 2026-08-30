import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";

export default function HomeBrands({ brands }) {
  return (
    <section className="home-brands">
      <div className="brands-container">
        <h2 className="brands-title">Our Partners</h2>
        <div className="brands-grid">
          {brands.map((brand) => (
            <div key={brand.id} className="brand-card">
              <div className="brand-logo-wrap">
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="brand-info">
                <span className="brand-name">{brand.name}</span>
                <span className="brand-desc">{brand.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .home-brands {
          padding: 100px 40px;
          background: ${BQ_COLORS.surface};
        }

        .brands-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .brands-title {
          font-family: ${BQ_FONTS.heading};
          font-size: 13px;
          font-weight: 900;
          color: ${BQ_COLORS.inkMuted};
          text-transform: uppercase;
          letter-spacing: 0.25em;
          text-align: center;
          margin-bottom: 72px;
          opacity: 0.6;
        }

        .brands-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .brand-card {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 32px;
          background: white;
          border-radius: ${BQ_GEOMETRY.radiusCard};
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          border: 1px solid ${BQ_COLORS.border};
        }

        .brand-card:hover {
          transform: translateY(-10px) scale(1.02);
          box-shadow: ${BQ_SHADOWS.hover};
          border-color: transparent;
        }

        .brand-logo-wrap {
          width: 88px; height: 88px;
          background: ${BQ_COLORS.bg};
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          flex-shrink: 0;
          transition: transform 0.5s ease;
        }
        .brand-card:hover .brand-logo-wrap { transform: scale(1.1); background: white; }
        .brand-logo-wrap img { width: 100%; height: 100%; object-fit: contain; }

        .brand-info { display: flex; flex-direction: column; }
        .brand-name { font-family: ${BQ_FONTS.heading}; font-size: 20px; font-weight: 900; color: ${BQ_COLORS.ink}; letter-spacing: -0.02em; }
        .brand-desc { font-size: 14px; color: ${BQ_COLORS.inkMuted}; margin-top: 4px; font-weight: 500; }

        @media (max-width: 768px) {
          .brands-grid { grid-template-columns: 1fr; }
        }
      `,
        }}
      />
    </section>
  );
}
