import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
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
  const handleNotificationClick = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
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

    apiRequest("/notifications/me")
      .then((response) => {
        const normalized = (response.notifications || []).map((item) => ({
          ...item,
          unread: Boolean(item.unread),
          time: new Date(item.createdAt).toLocaleString(),
        }));
        const currentIds = new Set(normalized.map((n) => n.id));
        setNotifications(normalized);
        previousNotificationIdsRef.current = currentIds;
      })
      .catch(() => setNotifications([]));
  }, [isAuthenticated]);

  // Brand Data (Modularized)
  const brands = [
    {
      id: 1,
      name: "Midea",
      logoUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvl2GSFigO4nNXMWW1qO_VZ1GZwjVl5alpsw&s",
      description: "Premium AC Solutions",
    },
    {
      id: 2,
      name: "TCL",
      logoUrl:
        "https://cdn.manilastandard.net/wp-content/uploads/2023/02/TCL.png",
      description: "Smart Air Conditioning",
    },
    {
      id: 3,
      name: "Aux",
      logoUrl: "https://auxaircon.com.ph/images/aux_logo.png",
      description: "Energy Efficient",
    },
    {
      id: 4,
      name: "Samsung",
      logoUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXFVQh2BQhYtWf9APXNliSnNTi7MBwV6yPFA&s",
      description: "Innovation Technology",
    },
    {
      id: 5,
      name: "Daikin",
      logoUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwu8SCQH4joBnn0HXF5F_HQKBRb85KZ8ZkuA&s",
      description: "World Leader in AC",
    },
    {
      id: 6,
      name: "Carrier",
      logoUrl:
        "https://upload.wikimedia.org/wikipedia/commons/8/8f/Logo_of_the_Carrier_Corporation.svg",
      description: "Inventor of AC",
    },
    {
      id: 7,
      name: "LG",
      logoUrl:
        "https://www.lg.com/content/dam/lge/common/logo/logo-lg-100-44.jpg",
      description: "Life's Good",
    },
    {
      id: 8,
      name: "American Home",
      logoUrl: "https://ansons.ph/wp-content/uploads/2024/05/aham.jpg",
      description: "Home Comfort Solutions",
    },
    {
      id: 9,
      name: "Gree",
      logoUrl: "https://1000logos.net/wp-content/uploads/2018/08/Gree-Logo.png",
      description: "Eco-Friendly Cooling",
    },
  ];

  const handleLogout = () => {
    localStorage.clear();
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
