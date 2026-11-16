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
import useCustomerAlerts from "../../hooks/useAlerts";
import BoutiqueSideMenu from "../common/boutique/BoutiqueSideMenu";
import ShopCatalogue from "./ShopCatalogue";
import ShopSidebar from "./ShopSidebar";

// Helper to parse HP numeric value for sorting
const parseHP = (hpStr) => {
  if (!hpStr) return 0;
  const match = hpStr.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
};

const brandKey = (name) => name.trim().toLowerCase();
const PRICE_STEP = 1000;
const DEFAULT_PRICE_CEILING = 100000;
const EMPTY_PRICE_RANGE = { min: 0, max: null };

const Shop = () => {
  const {
    cart,
    loading: cartLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    getCartCount,
    getCartTotal,
  } = useCart();
  const { user, isAuthenticated, logout, showAuthRequiredPrompt, currentLanguage } = useUser();
  const { unreadCount, openAlerts, drawerProps } = useCustomerAlerts(isAuthenticated, user?.id || user?._id);
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
  const purchaseInFlightRef = useRef(false);
  const catalogRequestRef = useRef(null);
  const catalogGenerationRef = useRef(0);

  useEffect(() => {
    if (!cartNotice) return undefined;
    const timeoutId = window.setTimeout(() => setCartNotice(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [cartNotice]);

  // Filters
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedCategory = searchParams.get("cat") || "all";
  const brandFilters = useMemo(() => {
    const filters = new Map();
    for (const value of searchParams.getAll("brand")) {
      const name = value.trim();
      if (name && brandKey(name) !== "all") filters.set(brandKey(name), name);
    }
    return filters;
  }, [searchParams]);
  const [selectedHorsepowers, setSelectedHorsepowers] = useState([]);
  const [priceFilter, setPriceFilter] = useState(EMPTY_PRICE_RANGE);
  const [sortBy, setSortBy] = useState("default");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = useCallback(async ({ fresh = false } = {}) => {
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
          const addressResult = await apiRequest("/users/addresses", { silentConnection: true, fresh });
          const addresses = Array.isArray(addressResult.addresses) ? addressResult.addresses : [];
          const address = addresses.find((entry) => entry.isDefault) || addresses[0];
          if (address) branch = await resolveConfiguredBranch(address, { display: true, fresh });
        }
        const response = await apiRequest(`/products/public${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, {
          silentConnection: true,
          display: true,
          fresh,
        });
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

  const updateCatalogueFilters = (category, brands) => {
    const params = new URLSearchParams(searchParams);
    params.delete("cat");
    params.delete("brand");
    if (category !== "all") params.set("cat", category);
    for (const brand of brands) params.append("brand", brand);
    navigate({ search: params.toString() }, { replace: true, preventScrollReset: true });
  };

  const toggleBrand = (brand) => {
    const next = new Map(brandFilters);
    const key = brandKey(brand);
    if (brand === "all") next.clear();
    else if (next.has(key)) next.delete(key);
    else next.set(key, brand);
    updateCatalogueFilters(selectedCategory, next.values());
  };

  const products = useMemo(() => {
    return deduplicateProducts(backendProducts, { verbose: false }).map((product) => ({
      ...product,
      imageUrl: product.imageUrl || getCatalogProductImageUrl(product),
    }));
  }, [backendProducts]);

  const priceCeiling = useMemo(() => products.reduce((ceiling, product) => {
    if (!Number.isFinite(product.price) || product.price > Number.MAX_SAFE_INTEGER) return ceiling;
    return Math.max(ceiling, Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(product.price / PRICE_STEP) * PRICE_STEP));
  }, DEFAULT_PRICE_CEILING), [products]);
  const maxPrice = Math.min(priceFilter.max ?? priceCeiling, priceCeiling);
  const minPrice = Math.min(priceFilter.min, maxPrice);
  const updatePrice = (field, value) => {
    if (!Number.isSafeInteger(value)) return;
    if (field === "min") {
      setPriceFilter({ ...priceFilter, min: Math.max(0, Math.min(maxPrice, value)) });
    } else {
      const nextMax = Math.max(minPrice, Math.min(priceCeiling, value));
      setPriceFilter({ min: minPrice, max: nextMax === priceCeiling ? null : nextMax });
    }
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const catMatch =
          selectedCategory === "all" || p.category === selectedCategory;
        const brandMatch = brandFilters.size === 0 || brandFilters.has(brandKey(p.brand));
        const horsepowerMatch = selectedHorsepowers.length === 0 || selectedHorsepowers.includes(Number(p.horsepower));
        const priceMatch =
          p.price >= minPrice && p.price <= maxPrice;
        const searchMatch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.model && p.model.toLowerCase().includes(searchTerm.toLowerCase()));
        return catMatch && brandMatch && horsepowerMatch && priceMatch && searchMatch;
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
    brandFilters,
    selectedHorsepowers,
    searchTerm,
    minPrice,
    maxPrice,
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
    const names = new Map(products.filter((p) => p.brand).map((p) => [brandKey(p.brand), p.brand]));
    for (const [key, name] of brandFilters) {
      if (!names.has(key)) names.set(key, name);
    }
    return ["all", ...names.values()];
  }, [brandFilters, products]);
  const selectedBrands = brands.filter((brand) => brandFilters.has(brandKey(brand)));
  const horsepowers = useMemo(() => [...new Set(products.map((product) => Number(product.horsepower)).filter((value) => value > 0))].sort((a, b) => a - b), [products]);

  const preparePurchase = async (product, qty, buyNow) => {
    if (purchaseInFlightRef.current) return false;
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
        t(buyNow ? "Sign in to continue to checkout." : "Sign in to add this AC unit to your cart."),
      );
      return false;
    }
    purchaseInFlightRef.current = true;
    try {
      const addressesResult = await apiRequest("/users/addresses", { fresh: true });
      const addresses = Array.isArray(addressesResult.addresses) ? addressesResult.addresses : [];
      const address = addresses.find((entry) => entry.isDefault) || addresses[0];
      if (!address) throw new Error(t(buyNow ? "Please add a delivery address to continue." : "Save a delivery address before adding items to your cart."));
      const branch = await resolveConfiguredBranch(address);
      if (!branch) throw new Error(t(buyNow ? "This address is outside the current service areas. Choose another delivery address." : "Your delivery address is outside our service areas. Update it before adding items."));
      const stockResult = await apiRequest(`/products/public?branch=${encodeURIComponent(branch)}`, { fresh: true });
      const availableProduct = (stockResult.products || []).find((entry) => String(entry.id || entry._id) === String(product.id));
      const available = Number(availableProduct?.stock || 0);
      const existing = cart.find((item) => item.id === product.id);
      const requested = Number(qty) + (buyNow ? 0 : Number(existing?.quantity || 0));
      if (!Number.isSafeInteger(available) || available < requested) {
        throw new Error(available <= 0
          ? (isFilipino(currentLanguage) ? `Hindi available ang AC unit na ito sa sangay ng ${branch}.` : `This AC unit is unavailable at the ${branch} branch.`)
          : t("The requested quantity exceeds this branch's available stock. Reduce the quantity and try again."));
      }
      const item = { ...mapCatalogProductToCartProduct(availableProduct), fulfillmentBranch: branch };
      setFulfillmentBranch(branch);
      if (buyNow) {
        navigate("/checkout", { state: { buyNowItem: { ...item, quantity: Number(qty) } } });
      } else {
        addToCart(item, Number(qty));
        setCartNotice({ id: Date.now(), name: product.name || "AC unit" });
      }
      return true;
    } catch (error) {
      setStockNotice(error.message || t("Unable to confirm branch stock. Please try again."));
      return false;
    } finally {
      purchaseInFlightRef.current = false;
    }
  };

  const handleAddToCart = (product, qty = 1) => preparePurchase(product, qty, false);
  const handleBuyNow = (product, qty = 1) => preparePurchase(product, qty, true);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      return showAuthRequiredPrompt(t("Sign in to continue to checkout."));
    }
    navigate("/checkout");
    setIsCartOpen(false);
  };

  return (
    <BoutiqueScreen withHeader={false} padding={0}>
      <BoutiqueHeader
        title={t("Shop AC Units")}
        subtitle={fulfillmentBranch ? (isFilipino(currentLanguage) ? `Available sa sangay ng ${fulfillmentBranch} para sa paghahatid` : `Available at your ${fulfillmentBranch} delivery branch`) : t("Browse AC units · add a delivery address to check local stock")}
        onLeftAction={() => setSidebarOpen(true)}
        leftAction="menu"
        cartCount={getCartCount()}
        notificationCount={unreadCount}
        onNotificationClick={openAlerts}
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

      <BoutiqueNotifications currentLanguage={currentLanguage} {...drawerProps} />

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
          onSelectCategory={(category) => updateCatalogueFilters(category, brandFilters.values())}
          brands={brands}
          selectedBrands={selectedBrands}
          onSelectBrand={toggleBrand}
          horsepowers={horsepowers}
          selectedHorsepowers={selectedHorsepowers}
          onSelectHorsepower={(horsepower) => setSelectedHorsepowers((current) => current.includes(horsepower) ? current.filter((entry) => entry !== horsepower) : [...current, horsepower])}
          priceRange={{ min: minPrice, max: maxPrice }}
          priceCeiling={priceCeiling}
          priceStep={PRICE_STEP}
          onPriceChange={updatePrice}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onClearFilters={() => {
            updateCatalogueFilters("all", []);
            setSelectedHorsepowers([]);
            setPriceFilter(EMPTY_PRICE_RANGE);
            setSearchTerm("");
          }}
        />

        <ShopCatalogue
          products={filteredProducts}
          loading={catalogLoading}
          error={t(catalogError)}
          onRetry={() => fetchProducts({ fresh: true })}
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
          loading={cartLoading}
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
          onBuyNow={handleBuyNow}
        />
      )}
    </BoutiqueScreen>
  );
};

export default Shop;
