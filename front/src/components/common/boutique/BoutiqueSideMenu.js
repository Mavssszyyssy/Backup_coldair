import {
  Gear,
  Phone,
  ShoppingBag,
  SignOut,
  User,
  Wind,
  Wrench,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BoutiqueBox from "./BoutiqueBox";
import BoutiqueDrawer from "./BoutiqueDrawer";
import BoutiqueStack from "./BoutiqueStack";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS, BQ_SHADOWS } from "./BoutiqueTheme";

export default function BoutiqueSideMenu({
  isOpen,
  onClose,
  user,
  isAuthenticated,
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarBroken, setAvatarBroken] = useState(false);

  const menuItems = [
    { id: "shop", label: "Shop Catalog", icon: ShoppingBag, path: "/shop" },
    { id: "orders", label: "My Orders", icon: ShoppingBag, path: "/my-orders" },
    { id: "myunit", label: "My Unit", icon: Wind, path: "/myunit" },
    { id: "services", label: "Get the App", icon: Wrench, path: "/services" },
    { id: "contact", label: "Contact", icon: Phone, path: "/contact" },
    { id: "settings", label: "Settings", icon: Gear, path: "/settings" },
  ];

  const handleNavigation = (path) => {
    if (!isAuthenticated && path !== "/shop" && path !== "/faq") {
      navigate("/login");
    } else {
      navigate(path);
    }
    onClose();
  };

  const getUserDisplayName = () => {
    if (!user) return "Guest User";
    return (
      user.name || user.name_first || user.email?.split("@")[0] || "Customer"
    );
  };

  const getUserInitial = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <BoutiqueDrawer isOpen={isOpen} onClose={onClose} side="left" width="360px">
      <BoutiqueBox className="bq-menu-wrapper" height="100%">
        <BoutiqueStack gap={16} padding="40px 32px" className="bq-user-block">
          <BoutiqueBox
            width={64}
            height={64}
            background={BQ_COLORS.bgAlt}
            align="center"
            justify="center"
            className="bq-avatar"
            style={{
              borderRadius: "20px",
              overflow: "hidden",
              color: BQ_COLORS.brand,
              boxShadow: BQ_SHADOWS.soft,
            }}
          >
            {user?.avatarUrl && !avatarBroken ? (
              <img
                src={user.avatarUrl}
                alt="Me"
                onError={() => setAvatarBroken(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : isAuthenticated ? (
              <BoutiqueText variant="h2" weight={900} className="bq-initial">
                {getUserInitial()}
              </BoutiqueText>
            ) : (
              <User size={32} weight="bold" />
            )}
          </BoutiqueBox>
          <BoutiqueStack gap={0} className="bq-user-info">
            <BoutiqueText
              size="13px"
              weight={600}
              color={BQ_COLORS.inkMuted}
              className="bq-greeting"
            >
              {isAuthenticated ? "Welcome back," : "Hello,"}
            </BoutiqueText>
            <BoutiqueText variant="h3" weight={800} className="bq-username">
              {getUserDisplayName()}
            </BoutiqueText>
          </BoutiqueStack>
        </BoutiqueStack>

        <BoutiqueStack
          tag="nav"
          gap={8}
          padding="0 16px"
          flex={1}
          className="bq-menu-nav"
        >
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.id}
                className={`bq-nav-item ${active ? "active" : ""}`}
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon size={24} weight={active ? "fill" : "bold"} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <BoutiqueBox
            height={1}
            background={BQ_COLORS.border}
            margin={16}
            className="bq-menu-divider"
          />

          {isAuthenticated ? (
            <button
              className="bq-nav-item bq-logout-btn"
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  onLogout();
                  onClose();
                }
              }}
            >
              <SignOut size={24} weight="bold" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              className="bq-nav-item bq-login-btn"
              onClick={() => {
                navigate("/login");
                onClose();
              }}
            >
              <SignOut size={24} weight="bold" />
              <span>Sign In</span>
            </button>
          )}
        </BoutiqueStack>

        <BoutiqueBox
          padding={32}
          className="bq-menu-footer"
          style={{ borderTop: `1px solid ${BQ_COLORS.border}` }}
        >
          <BoutiqueText
            size="12px"
            weight={700}
            color={BQ_COLORS.inkFaint}
            className="bq-version"
            style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            AeroPulse v1.0.0
          </BoutiqueText>
        </BoutiqueBox>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-nav-item {
          display: flex; align-items: center; gap: 16px; padding: 16px;
          background: transparent; border: none; border-radius: 20px;
          cursor: pointer; font-size: 16px; font-weight: 600; color: ${BQ_COLORS.inkMuted};
          transition: all 0.3s; width: 100%; text-align: left;
        }
        .bq-nav-item:hover { background: ${BQ_COLORS.bgAlt}; color: ${BQ_COLORS.ink}; }
        .bq-nav-item.active { background: ${BQ_COLORS.brand}; color: white; box-shadow: ${BQ_SHADOWS.float}; }

        .bq-logout-btn { color: ${BQ_COLORS.danger}; }
        .bq-logout-btn:hover { background: #fef2f2; color: ${BQ_COLORS.danger}; }
      `,
        }}
      />
    </BoutiqueDrawer>
  );
}
