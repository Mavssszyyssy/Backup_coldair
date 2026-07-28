import {
  ArrowLeft,
  ShoppingCartSimple,
  WarningDiamond,
} from "@phosphor-icons/react";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";

export default function ShopHeader({
  isAuthenticated,
  onBack,
  onOpenCart,
  cartCount,
}) {
  return (
    <header className="bq-header">
      <div className="bq-header-content">
        <div className="bq-header-left">
          <button className="bq-back-btn" onClick={onBack} title="Go Back">
            <ArrowLeft size={18} weight="bold" />
          </button>
          <h1 className="bq-shop-title">Shop AC Units</h1>
        </div>

        {!isAuthenticated && (
          <div className="bq-header-center">
            <div className="bq-warning-pill">
              <WarningDiamond size={18} weight="bold" />
              <span>
                Browsing as Guest. <strong>Log in to checkout.</strong>
              </span>
            </div>
          </div>
        )}

        <div className="bq-header-right">
          <button
            type="button"
            className="bq-cart-trigger"
            onClick={onOpenCart}
          >
            <ShoppingCartSimple size={22} weight="bold" />
            {cartCount > 0 && (
              <span className="bq-cart-badge">{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-header {
          height: ${BQ_GEOMETRY.headerHeight};
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 1100;
          flex-shrink: 0;
          box-shadow: ${BQ_SHADOWS.glass};
          display: flex;
          align-items: center;
        }

        .bq-header-content {
          width: 100%;
          padding: 0 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bq-header-left { display: flex; align-items: center; gap: 20px; }

        .bq-shop-title {
          font-family: ${BQ_FONTS.heading};
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin: 0;
          color: ${BQ_COLORS.ink};
        }

        .bq-back-btn {
          background: ${BQ_COLORS.surface};
          border: none;
          width: 44px;
          height: 44px;
          border-radius: ${BQ_GEOMETRY.radiusPill};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: ${BQ_COLORS.ink};
          box-shadow: ${BQ_SHADOWS.soft};
        }

        .bq-back-btn:hover {
          transform: translateX(-4px);
          box-shadow: ${BQ_SHADOWS.float};
        }

        .bq-header-center { flex: 1; display: flex; justify-content: center; }

        .bq-warning-pill {
          background: #fffbeb;
          padding: 10px 24px;
          border-radius: ${BQ_GEOMETRY.radiusPill};
          display: flex;
          align-items: center;
          gap: 12px;
          color: #92400e;
          font-size: 14px;
          font-family: ${BQ_FONTS.heading};
          font-weight: 600;
          box-shadow: ${BQ_SHADOWS.soft};
        }

        .bq-cart-trigger {
          position: relative;
          background: ${BQ_COLORS.brand};
          color: white;
          border: none;
          padding: 12px 18px;
          border-radius: ${BQ_GEOMETRY.radiusPill};
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }

        .bq-cart-trigger:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.2);
          background: ${BQ_COLORS.brandHover};
        }

        .bq-cart-badge {
          position: absolute;
          top: -4px; right: -4px;
          background: ${BQ_COLORS.danger};
          color: white;
          font-size: 11px;
          font-family: ${BQ_FONTS.heading};
          font-weight: 800;
          min-width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: ${BQ_GEOMETRY.radiusPill};
          border: 2px solid white;
        }
      `,
        }}
      />
    </header>
  );
}
