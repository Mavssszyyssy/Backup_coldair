import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { getBrandLogo } from "../../config/brandLogos";
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";

// Modular Boutique Components
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueCart from "../common/boutique/BoutiqueCart";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueNotifications from "../common/boutique/BoutiqueNotifications";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueSideMenu from "../common/boutique/BoutiqueSideMenu";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

// Home Specific Modular Sections
import HomeBrands from "./HomeBrands";
import HomeHero from "./HomeHero";
import HomeInfo from "./HomeInfo";

function Home() {
  const navigate = useNavigate();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    getCartTotal,
    getCartCount,
    clearCart,
  } = useCart();
  const { user, logout, isAuthenticated } = useUser();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const previousNotificationIdsRef = useRef(new Set());

  // Mark single notification as read
  const handleNotificationClick = async (notification) => {
    const id = notification?.id;
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
    const route = notification?.route ||
      (notification?.type === "order" || notification?.targetType === "order" ? "/my-orders" :
        ["service", "warranty"].includes(notification?.type) ? "/get-the-app" : "/settings");
    setShowNotifications(false);
    navigate(route);
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest("/notifications/me/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  // Track scroll for header effects
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch Notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      previousNotificationIdsRef.current = new Set();
      return;
    }

    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await apiRequest("/notifications/me");
        const normalized = (response.notifications || []).map((item) => ({
          ...item,
          unread: Boolean(item.unread),
          time: new Date(item.createdAt).toLocaleString(),
        }));
        const currentIds = new Set(normalized.map((n) => n.id));
        if (!active) return;
        setNotifications(normalized);
        previousNotificationIdsRef.current = currentIds;
      } catch {
        if (active) setNotifications([]);
      }
    };
    loadNotifications();
    const pollId = window.setInterval(loadNotifications, 20000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAuthenticated]);

  // Brand Data (Modularized)
  const brands = [
    {
      id: 1,
      name: "Midea",
      logoUrl: getBrandLogo("Midea"),
      description: "Premium AC Solutions",
    },
    {
      id: 2,
      name: "TCL",
      logoUrl: getBrandLogo("TCL"),
      description: "Smart Air Conditioning",
    },
    {
      id: 3,
      name: "Aux",
      logoUrl: getBrandLogo("Aux"),
      description: "Energy Efficient",
    },
    {
      id: 4,
      name: "Samsung",
      logoUrl: getBrandLogo("Samsung"),
      description: "Innovation Technology",
    },
    {
      id: 5,
      name: "Daikin",
      logoUrl: getBrandLogo("Daikin"),
      description: "World Leader in AC",
    },
    {
      id: 6,
      name: "Carrier",
      logoUrl: getBrandLogo("Carrier"),
      description: "Inventor of AC",
    },
    {
      id: 7,
      name: "LG",
      logoUrl: getBrandLogo("LG"),
      description: "Life's Good",
    },
    {
      id: 8,
      name: "American Home",
      logoUrl: getBrandLogo("American Home"),
      description: "Home Comfort Solutions",
    },
    {
      id: 9,
      name: "Gree",
      logoUrl: getBrandLogo("Gree"),
      description: "Eco-Friendly Cooling",
    },
  ];

  const handleLogout = () => {
    logout();
    clearCart();
    navigate("/home");
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg} padding={0}>
      <BoutiqueHeader
        variant="logo"
        leftAction="menu"
        onLeftAction={() => setIsMenuOpen(true)}
        onNotificationClick={() => setShowNotifications(true)}
        onCartClick={() => setIsCartOpen(true)}
        notificationCount={unreadCount}
        cartCount={getCartCount()}
        isAuthenticated={isAuthenticated}
        scrolled={scrolled}
      />

      <BoutiqueSideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
      />

      <BoutiqueCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={() => navigate("/checkout")}
        getCartTotal={getCartTotal}
      />

      <BoutiqueNotifications
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      <BoutiqueBox
        tag="main"
        flex={1}
        direction="column"
        className="bq-home-main"
      >
        <HomeHero
          onBookNow={() => navigate("/services")}
          onShop={() => navigate("/shop")}
        />
        <HomeBrands brands={brands} />
        <HomeInfo />
      </BoutiqueBox>

      <BoutiqueFooter />
    </BoutiqueScreen>
  );
}

export default Home;
