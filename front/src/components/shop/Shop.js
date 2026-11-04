import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";
import { isFilipino, translateText } from "../../utils/customerI18n";
import { resolveConfiguredBranch } from "../../domain/branches/branchRouting";
import {
  getCatalogProductImageUrl,
  mapCatalogProductToCartProduct,
} from "../../domain/cart/catalogCartProduct";
import { deduplicateProducts } from "../../utils/productDeduplication";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import ProductModal from "./ProductModal";

// Modular Boutique Components
import BoutiqueCart from "../common/boutique/BoutiqueCart";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueNotifications from "../common/boutique/BoutiqueNotifications";
import { getNotificationId } from "../../domain/notifications/notificationIdentity";
import { resolveCustomerNotificationRoute } from "../../domain/notifications/resolveCustomerNotificationRoute";
import BoutiqueSideMenu from "../common/boutique/BoutiqueSideMenu";
import ShopCatalogue from "./ShopCatalogue";
import ShopSidebar from "./ShopSidebar";

// Helper to parse HP numeric value for sorting
const parseHP = (hpStr) => {
  if (!hpStr) return 0;
  const match = hpStr.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
};

const Shop = () => {
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    getCartCount,
    getCartTotal,
  } = useCart();
  const { user, isAuthenticated, logout, showAuthRequiredPrompt, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const navigate = useNavigate();
  const location = useLocation();

  const [backendProducts, setBackendProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [fulfillmentBranch, setFulfillmentBranch] = useState("");
  const [stockNotice, setStockNotice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const catalogRequestRef = useRef(null);
  const catalogGenerationRef = useRef(0);

  useEffect(() => {
    if (!cartNotice) return undefined;
    const timeoutId = window.setTimeout(() => setCartNotice(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [cartNotice]);

  // Mark single notification as read
  const handleNotificationClick = async (notification) => {
    const id = getNotificationId(notification);
    if (notification?.unread && id) {
      try {
        await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
        setNotifications((prev) =>
          prev.map((n) => (
            getNotificationId(n) === id ? { ...n, unread: false } : n
          )),
        );
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    }
    const route = resolveCustomerNotificationRoute(notification);
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

  // Fetch Notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    let active = true;
    let loadingNotifications = false;
    const loadNotifications = async () => {
      if (loadingNotifications) return;
      loadingNotifications = true;
      try {
        const response = await apiRequest("/notifications/me", { silentConnection: true });
        const normalized = (response.notifications || []).map((item) => ({
          ...item,
          id: getNotificationId(item),
          unread: Boolean(item.unread),
          time: new Date(item.createdAt).toLocaleString(),
        }));
        if (active) setNotifications(normalized);
      } catch {
        if (active) setNotifications([]);
      } finally {
        loadingNotifications = false;
      }
    };
    loadNotifications();
    const pollId = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadNotifications();
    }, 20000);
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

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [sortBy, setSortBy] = useState("default");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = useCallback(async () => {
    // A slow branch lookup or server wake-up must not start overlapping reads.
    // A changed auth session gets its own request; older results cannot replace it.
    if (catalogRequestRef.current?.authenticated === isAuthenticated) {
      return catalogRequestRef.current.promise;
    }
    const generation = ++catalogGenerationRef.current;
    const promise = (async () => {
      try {
        let branch = "";
        if (isAuthenticated) {
          const addressResult = await apiRequest("/users/addresses", { silentConnection: true });
          const addresses = Array.isArray(addressResult.addresses) ? addressResult.addresses : [];
          const address = addresses.find((entry) => entry.isDefault) || addresses[0];
          if (address) branch = await resolveConfiguredBranch(address);
        }
        const response = await apiRequest(`/products/public${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, { silentConnection: true });
        const mapped = (response.products || []).map(mapCatalogProductToCartProduct);
        if (generation === catalogGenerationRef.current) {
          setBackendProducts(mapped);
          setFulfillmentBranch(branch);
          setCatalogError("");
        }
      } catch (error) {
        // Keep the last confirmed server catalogue visible rather than showing
        // static demo items with incorrect inventory.
        console.error("Failed to fetch products:", error);
        if (generation === catalogGenerationRef.current) {
          setCatalogError("The product catalogue could not be refreshed. Please try again.");
        }
      } finally {
        if (generation === catalogGenerationRef.current) setCatalogLoading(false);
        if (catalogRequestRef.current?.generation === generation) catalogRequestRef.current = null;
      }
    })();
    catalogRequestRef.current = { authenticated: isAuthenticated, generation, promise };
    return promise;
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProducts();
    const pollId = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchProducts();
    }, 20000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchProducts();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      catalogGenerationRef.current += 1;
      catalogRequestRef.current = null;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [fetchProducts]);

  // Sync category from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get("cat");
    if (cat) setSelectedCategory(cat);
  }, [location.search]);

  // Buy Now flow integration
  useEffect(() => {
    const handleBuyNowEvent = () => navigate("/checkout");
    window.addEventListener("bq:buy-now", handleBuyNowEvent);
    return () => window.removeEventListener("bq:buy-now", handleBuyNowEvent);
  }, [navigate]);

  const products = useMemo(() => {
    return deduplicateProducts(backendProducts, { verbose: false }).map((product) => ({
      ...product,
      imageUrl: product.imageUrl || getCatalogProductImageUrl(product),
    }));
  }, [backendProducts]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const catMatch =
          selectedCategory === "all" || p.category === selectedCategory;
        const brandMatch = selectedBrand === "all" || p.brand === selectedBrand;
        const priceMatch =
          p.price >= priceRange.min && p.price <= priceRange.max;
        const searchMatch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.model && p.model.toLowerCase().includes(searchTerm.toLowerCase()));
        return catMatch && brandMatch && priceMatch && searchMatch;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "hp_asc")
          return (
            parseHP(a.specs || a.capacity) - parseHP(b.specs || b.capacity)
          );
        if (sortBy === "hp_desc")
          return (
            parseHP(b.specs || b.capacity) - parseHP(a.specs || a.capacity)
          );
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [
    products,
    selectedCategory,
    selectedBrand,
    searchTerm,
    priceRange,
    sortBy,
  ]);

  const categories = useMemo(() => {
    const counts = products.reduce((acc, product) => {
      const key = product.category || "split";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return [
      { id: "all", name: "All Types", count: products.length },
      { id: "split", name: "Split Type", count: counts.split || 0 },
      { id: "window", name: "Window Type", count: counts.window || 0 },
      { id: "floor", name: "Floor Type", count: counts.floor || 0 },
    ];
  }, [products]);

  const brands = useMemo(() => {
    const unique = [...new Set(products.map((p) => p.brand).filter(Boolean))];
    return ["all", ...unique];
  }, [products]);

  const handleAddToCart = async (product, qty = 1) => {
    setStockNotice("");
    if (!Number.isSafeInteger(Number(qty)) || !/^\d+$/.test(String(qty).trim()) || Number(qty) <= 0) {
      setStockNotice(t("Enter a positive whole-number quantity."));
      return false;
    }
    if (!product.inStock) {
      alert(t("This AC unit is currently out of stock and cannot be added to your cart."));
      return false;
    }
    if (!isAuthenticated) {
      showAuthRequiredPrompt(
        t("Sign in to add this AC unit to your cart."),
      );
      return false;
    }
    try {
      const addressesResult = await apiRequest("/users/addresses");
      const addresses = Array.isArray(addressesResult.addresses) ? addressesResult.addresses : [];
      const address = addresses.find((entry) => entry.isDefault) || addresses[0];
      if (!address) throw new Error(t("Save a delivery address before adding items to your cart."));
      const branch = await resolveConfiguredBranch(address);
      if (!branch) throw new Error(t("Your delivery address is outside our service areas. Update it before adding items."));
      const stockResult = await apiRequest(`/products/public?branch=${encodeURIComponent(branch)}`);
      const availableProduct = (stockResult.products || []).find((entry) => String(entry.id || entry._id) === String(product.id));
      const available = Number(availableProduct?.stock || 0);
      const existing = cart.find((item) => item.id === product.id);
      const requested = Number(qty) + Number(existing?.quantity || 0);
      if (!Number.isSafeInteger(available) || available < requested) {
        throw new Error(available <= 0
          ? (isFilipino(currentLanguage) ? `Hindi available ang AC unit na ito sa sangay ng ${branch}.` : `This AC unit is unavailable at the ${branch} branch.`)
          : (isFilipino(currentLanguage) ? `Ang sangay ng ${branch} ay may ${available} available na unit lamang; magiging ${requested} ang unit sa iyong cart.` : `The ${branch} branch has only ${available} unit${available === 1 ? "" : "s"} available; your cart would contain ${requested}.`));
      }
      addToCart({ ...mapCatalogProductToCartProduct(availableProduct), fulfillmentBranch: branch }, Number(qty));
      setFulfillmentBranch(branch);
      setCartNotice({ id: Date.now(), name: product.name || "AC unit" });
      return true;
    } catch (error) {
      setStockNotice(error.message || t("Unable to confirm branch stock. Please try again."));
      return false;
    }
  };

  const handleBuyNow = async (product) => {
    if (await handleAddToCart(product, 1)) navigate("/checkout");
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      return showAuthRequiredPrompt(t("Sign in to continue to checkout."));
    }
    navigate("/checkout");
    setIsCartOpen(false);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <BoutiqueScreen withHeader={false} padding={0}>
      <BoutiqueHeader
        title={t("Shop AC Units")}
        subtitle={fulfillmentBranch ? (isFilipino(currentLanguage) ? `Available sa sangay ng ${fulfillmentBranch} para sa paghahatid` : `Available at your ${fulfillmentBranch} delivery branch`) : t("Browse AC units · add a delivery address to check local stock")}
        onLeftAction={() => setSidebarOpen(true)}
        leftAction="menu"
        cartCount={getCartCount()}
        notificationCount={unreadCount}
        onNotificationClick={() => setShowNotifications(true)}
        isAuthenticated={isAuthenticated}
        onCartClick={() => setIsCartOpen(true)}
      />

      {cartNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="bq-cart-success-toast"
          style={{
            position: "fixed",
            top: "94px",
            right: "20px",
            zIndex: 1500,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            maxWidth: "min(360px, calc(100vw - 32px))",
            padding: "12px 15px",
            borderRadius: "14px",
            background: "#111827",
            color: "#ffffff",
            boxShadow: "0 14px 35px rgba(15, 23, 42, 0.25)",
          }}
        >
          <span aria-hidden="true" style={{ display: "grid", width: "24px", height: "24px", placeItems: "center", borderRadius: "50%", background: "#22c55e", fontWeight: 900 }}>✓</span>
          <span style={{ display: "grid", lineHeight: 1.25 }}>
            <strong style={{ fontSize: "13px" }}>{t("Added to cart")}</strong>
            <span style={{ color: "#d1d5db", fontSize: "12px" }}>{cartNotice.name}</span>
          </span>
        </div>
      ) : null}
      {stockNotice ? <div role="alert" style={{ margin: "12px 24px", padding: "12px", borderRadius: "8px", color: "#991b1b", background: "#fee2e2" }}>{stockNotice}</div> : null}

      <BoutiqueNotifications
        currentLanguage={currentLanguage}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      <BoutiqueBox
        tag="main"
        direction="row"
        flex={1}
        width="100%"
        className="bq-shop-main"
      >
        <ShopSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          brands={brands}
          selectedBrand={selectedBrand}
          onSelectBrand={setSelectedBrand}
          priceRange={priceRange}
          onPriceChange={(key, val) =>
            setPriceRange((prev) => ({ ...prev, [key]: parseInt(val) || 0 }))
          }
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onClearFilters={() => {
            setSelectedCategory("all");
            setSelectedBrand("all");
            setPriceRange({ min: 0, max: 100000 });
            setSearchTerm("");
          }}
        />

        <ShopCatalogue
          products={filteredProducts}
          loading={catalogLoading}
          error={t(catalogError)}
          onRetry={fetchProducts}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onProductClick={setSelectedProduct}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <BoutiqueCart
          currentLanguage={currentLanguage}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={handleCheckout}
          getCartTotal={getCartTotal}
        />
      </BoutiqueBox>

      <BoutiqueFooter />

      <BoutiqueSideMenu
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
        onLogout={logout}
      />

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </BoutiqueScreen>
  );
};

export default Shop;
