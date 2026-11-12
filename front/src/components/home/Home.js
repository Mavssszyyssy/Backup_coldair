import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import useCustomerAlerts from "../../hooks/useCustomerAlerts";

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
  const { user, logout, isAuthenticated, currentLanguage } = useUser();
  const { unreadCount, openAlerts, drawerProps } = useCustomerAlerts(isAuthenticated, user?.id || user?._id);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for header effects
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg} padding={0}>
      <BoutiqueHeader
        variant="logo"
        leftAction="menu"
        onLeftAction={() => setIsMenuOpen(true)}
        onNotificationClick={openAlerts}
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
        currentLanguage={currentLanguage}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={() => navigate("/checkout")}
        getCartTotal={getCartTotal}
      />

      <BoutiqueNotifications currentLanguage={currentLanguage} {...drawerProps} />

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
