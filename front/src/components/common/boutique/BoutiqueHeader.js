import {
  ArrowLeft,
  Bell,
  List,
  ShoppingCartSimple,
} from "@phosphor-icons/react";
import coldAirLogo from "../images/Cold Air Logo.jpg";
import BoutiqueBox from "./BoutiqueBox";
import BoutiqueStack from "./BoutiqueStack";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS, BQ_GEOMETRY, BQ_SHADOWS } from "./BoutiqueTheme";

export default function BoutiqueHeader({
  variant = "text", // "text" for Shop, "logo" for Home
  title = "Shop AC Units",
  leftAction = "back", // "back" or "menu"
  onLeftAction,
  onNotificationClick,
  onCartClick,
  notificationCount = 0,
  cartCount = 0,
  isAuthenticated = false,
  scrolled = false,
}) {
  return (
    <BoutiqueBox
      tag="header"
      height={scrolled ? "72px" : BQ_GEOMETRY.headerHeight}
      background="rgba(255, 255, 255, 0.9)"
      justify="center"
      className={`bq-header ${scrolled ? "scrolled" : ""}`}
      style={{
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 1100,
        flexShrink: 0,
        boxShadow: BQ_SHADOWS.glass,
        transition: "all 0.3s ease",
      }}
    >
      <BoutiqueBox
        direction="row"
        align="center"
        justify="space-between"
        padding="0 32px"
        width="100%"
        className="bq-header-content"
      >
        {/* LEFT: Action + Identity */}
        <BoutiqueBox
          direction="row"
          align="center"
          gap={20}
          className="bq-header-left"
        >
          <button className="bq-action-btn" onClick={onLeftAction}>
            {leftAction === "back" ? (
              <ArrowLeft size={18} weight="bold" />
            ) : (
              <List size={22} weight="bold" />
            )}
          </button>

          {variant === "logo" ? (
            <BoutiqueBox
              direction="row"
              align="center"
              gap={12}
              className="bq-logo-group"
            >
              <img src={coldAirLogo} alt="Cold Air" className="bq-logo-img" />
              <BoutiqueStack gap={0} className="bq-logo-text">
                <BoutiqueText
                  weight={900}
                  size="18px"
                  className="bq-logo-main"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
                >
                  COLD AIR
                </BoutiqueText>
                <BoutiqueText
                  weight={700}
                  size="10px"
                  color={BQ_COLORS.inkMuted}
                  className="bq-logo-sub"
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Airconditioning Trading
                </BoutiqueText>
              </BoutiqueStack>
            </BoutiqueBox>
          ) : (
            <BoutiqueText
              variant="h2"
              className="bq-title-text"
              style={{ letterSpacing: "-0.04em" }}
            >
              {title}
            </BoutiqueText>
          )}
        </BoutiqueBox>

        {/* RIGHT: Global Actions */}
        <BoutiqueBox
          direction="row"
          align="center"
          gap={16}
          className="bq-header-right"
        >
          {isAuthenticated && onNotificationClick && (
            <button
              className="bq-action-btn bq-notif-btn"
              onClick={onNotificationClick}
            >
              <Bell size={22} weight="bold" />
              {notificationCount > 0 && (
                <span className="bq-badge bq-badge--danger">
                  {notificationCount}
                </span>
              )}
            </button>
          )}

          <button className="bq-cart-trigger" onClick={onCartClick}>
            <ShoppingCartSimple size={22} weight="bold" />
            {cartCount > 0 && (
              <span className="bq-badge bq-badge--cart">{cartCount}</span>
            )}
          </button>
        </BoutiqueBox>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-action-btn {
          background: ${BQ_COLORS.surface};
          border: none;
          width: 44px;
          height: 44px;
          border-radius: ${BQ_GEOMETRY.radiusPill};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: ${BQ_COLORS.ink};
          box-shadow: ${BQ_SHADOWS.soft};
          position: relative;
        }

        .bq-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: ${BQ_SHADOWS.float};
        }

        .bq-logo-img { height: 40px; width: 40px; border-radius: 8px; object-fit: cover; }

        .bq-cart-trigger {
          position: relative;
          background: ${BQ_COLORS.brand};
          color: white; border: none;
          padding: 12px 18px; border-radius: ${BQ_GEOMETRY.radiusPill};
          cursor: pointer; transition: all 0.3s ease;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }

        .bq-cart-trigger:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.2);
          background: ${BQ_COLORS.brandHover};
        }

        .bq-badge {
          position: absolute;
          top: -4px; right: -4px;
          color: white; font-size: 10px;
          font-weight: 800;
          min-width: 20px; height: 20px;
          display: flex; align-items: center; justify-content: center;
          border-radius: ${BQ_GEOMETRY.radiusPill};
          border: 2px solid white;
        }
        .bq-badge--danger { background: ${BQ_COLORS.danger}; top: 4px; right: 4px; }
        .bq-badge--cart { background: ${BQ_COLORS.danger}; }

        @media (max-width: 900px) {
          .bq-header-center { display: none !important; }
          .bq-logo-sub { display: none !important; }
        }
      `,
        }}
      />
    </BoutiqueBox>
  );
}
