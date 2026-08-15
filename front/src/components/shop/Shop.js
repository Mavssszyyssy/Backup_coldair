import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL, apiRequest } from "../../config/api";
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";
import { resolvePreferredBranch } from "../../domain/branches/branchRouting";
import { deduplicateProducts } from "../../utils/productDeduplication";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import ProductModal from "./ProductModal";

// Modular Boutique Components
import BoutiqueCart from "../common/boutique/BoutiqueCart";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueNotifications from "../common/boutique/BoutiqueNotifications";
import BoutiqueSideMenu from "../common/boutique/BoutiqueSideMenu";
import ShopCatalogue from "./ShopCatalogue";
import ShopSidebar from "./ShopSidebar";

// Retained only as an exported design reference; the live catalogue below
// intentionally renders backendProducts only.
export const fallbackProducts = [
  {
    name: "American Home Inverter",
    sku: "AHAC-MINV1023EHW",
    brand: "American Home",
    category: "split",
    specs: "1.0HP",
    price: 18499,
    threshold: 3,
    stock: 16,
    description: "Energy efficient inverter with rapid cooling technology",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "American Home Inverter",
    sku: "AHAC-MINV1523EHW",
    brand: "American Home",
    category: "split",
    specs: "1.5HP",
    price: 21999,
    threshold: 3,
    stock: 15,
    description: "Advanced inverter technology for maximum energy savings",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "American Home Inverter",
    sku: "AHAC-MINV2023EHW",
    brand: "American Home",
    category: "split",
    specs: "2.0HP",
    price: 28499,
    threshold: 3,
    stock: 14,
    description:
      "Powerful cooling performance with intelligent inverter control",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "American Home Inverter",
    sku: "AHAC-MINV2523EHW",
    brand: "American Home",
    category: "split",
    specs: "2.5HP",
    price: 31499,
    threshold: 2,
    stock: 12,
    description: "High-capacity inverter unit designed for large spaces",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "American Home Inverter",
    sku: "AHAC-MINV3023EHW",
    brand: "American Home",
    category: "split",
    specs: "3.0HP",
    price: 43999,
    threshold: 2,
    stock: 10,
    description: "Commercial-grade cooling power with Boutique efficiency",
    warranty: "1 year parts, 5 years compressor",
  },

  {
    name: "TCL Full DC Inverter",
    sku: "TAC-10CSD-KEI-S-2",
    brand: "TCL",
    category: "split",
    specs: "1.0HP",
    price: 21500,
    threshold: 3,
    stock: 16,
    description: "Full DC inverter with T-AI technology for precision comfort",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "TCL Full DC Inverter",
    sku: "TAC-13CSD-KEI-S-2",
    brand: "TCL",
    category: "split",
    specs: "1.5HP",
    price: 22500,
    threshold: 3,
    stock: 15,
    description: "Smart cooling with optimized airflow and energy tracking",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "TCL Full DC Inverter",
    sku: "TAC-19CSD-KEI-S-2",
    brand: "TCL",
    category: "split",
    specs: "2.0HP",
    price: 28700,
    threshold: 3,
    stock: 14,
    description: "Intelligent comfort with ultra-quiet operation",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "TCL Full DC Inverter",
    sku: "TAC-25CSD-KEI-S-2",
    brand: "TCL",
    category: "split",
    specs: "2.5HP",
    price: 33600,
    threshold: 2,
    stock: 12,
    description: "Premium inverter performance for demanding environments",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "TCL Full DC Inverter",
    sku: "TAC-30CSD-KEI-S-2",
    brand: "TCL",
    category: "split",
    specs: "3.0HP",
    price: 48999,
    threshold: 2,
    stock: 10,
    description: "Maximum capacity cooling with advanced filtration",
    warranty: "1 year parts, 5 years compressor",
  },

  {
    name: "Midea Celest Pro",
    sku: "MSCE-10CRFN8",
    brand: "Midea",
    category: "split",
    specs: "1.0HP",
    price: 22999,
    threshold: 3,
    stock: 14,
    description:
      "Professional-grade cooling with precision temperature control",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "Midea Celest Pro",
    sku: "MSCE-13CRFN8",
    brand: "Midea",
    category: "split",
    specs: "1.5HP",
    price: 23999,
    threshold: 3,
    stock: 14,
    description: "Advanced Celest technology for rapid heat extraction",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "Midea Celest Pro",
    sku: "MSCE-19CRFN8",
    brand: "Midea",
    category: "split",
    specs: "2.0HP",
    price: 30499,
    threshold: 3,
    stock: 13,
    description: "High-efficiency cooling with smart dehumidification",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "Midea Celest Pro",
    sku: "MSCE-22CRFN8",
    brand: "Midea",
    category: "split",
    specs: "2.5HP",
    price: 35499,
    threshold: 2,
    stock: 11,
    description: "Industrial-strength cooling in a sleek boutique form factor",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "Midea Celest Pro",
    sku: "MSCE-25CRFN8",
    brand: "Midea",
    category: "split",
    specs: "3.0HP",
    price: 51499,
    threshold: 2,
    stock: 9,
    description: "Maximum performance Celest unit for open layouts",
    warranty: "1 year parts, 5 years compressor",
  },

  {
    name: "Samsung Digital Inverter",
    sku: "AR09TYHYE",
    brand: "Samsung",
    category: "split",
    specs: "1.0HP",
    price: 22999,
    threshold: 2,
    stock: 12,
    description: "Digital inverter technology for stable and silent cooling",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "Samsung Digital Inverter",
    sku: "AR12TYHYE",
    brand: "Samsung",
    category: "split",
    specs: "1.5HP",
    price: 25999,
    threshold: 2,
    stock: 11,
    description: "Consistent temperature management with smart eco-mode",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "Samsung Digital Inverter",
    sku: "AR18TYHYE",
    brand: "Samsung",
    category: "split",
    specs: "2.0HP",
    price: 30999,
    threshold: 2,
    stock: 10,
    description: "Advanced airflow design for rapid room-wide cooling",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "Samsung Digital Inverter",
    sku: "AR24TYHYE",
    brand: "Samsung",
    category: "split",
    specs: "2.5HP",
    price: 35999,
    threshold: 2,
    stock: 9,
    description: "Premium digital inverter for ultimate environmental control",
    warranty: "1 year parts, 5 years compressor",
  },

  {
    name: "LG Premium Dual Inverter",
    sku: "HSN09IPX3",
    brand: "LG",
    category: "split",
    specs: "1.0HP",
    price: 31499,
    threshold: 2,
    stock: 11,
    description: "Dual Inverter technology with WiFi ThinQ integration",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "LG Premium Dual Inverter",
    sku: "HSN12IPX3",
    brand: "LG",
    category: "split",
    specs: "1.5HP",
    price: 33499,
    threshold: 2,
    stock: 11,
    description: "Sophisticated dual-compressor system for 70% energy savings",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "LG Premium Dual Inverter",
    sku: "HSN18IPX3",
    brand: "LG",
    category: "split",
    specs: "2.0HP",
    price: 41499,
    threshold: 2,
    stock: 10,
    description: "High-end cooling with active energy monitoring and WiFi",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "LG Premium Dual Inverter",
    sku: "HSN24IPX3",
    brand: "LG",
    category: "split",
    specs: "2.5HP",
    price: 46499,
    threshold: 2,
    stock: 9,
    description:
      "Professional-grade dual inverter for larger residential spaces",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "LG Premium Dual Inverter",
    sku: "HSN30IPC",
    brand: "LG",
    category: "split",
    specs: "3.0HP",
    price: 82999,
    threshold: 1,
    stock: 7,
    description: "Top-of-the-line LG dual inverter with maximum throughput",
    warranty: "1 year parts, 5 years compressor",
  },

  {
    name: "TCL Full DC Inverter Window",
    sku: "TAC09-CWI-UJE2",
    brand: "TCL",
    category: "window",
    specs: "1.0HP",
    price: 21995,
    threshold: 2,
    stock: 13,
    description: "Quiet window unit with full DC inverter and WiFi control",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "TCL Full DC Inverter Window",
    sku: "TAC12-CWI-UJE2",
    brand: "TCL",
    category: "window",
    specs: "1.5HP",
    price: 23995,
    threshold: 2,
    stock: 12,
    description: "Compact window-type cooling with intelligent eco-sensors",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "TCL Full DC Inverter Window",
    sku: "TAC18-CWI-UJE2",
    brand: "TCL",
    category: "window",
    specs: "2.0HP",
    price: 31995,
    threshold: 2,
    stock: 10,
    description: "Powerful window unit with precision temperature management",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "TCL Full DC Inverter Window",
    sku: "TAC24-CWI-UJE2",
    brand: "TCL",
    category: "window",
    specs: "2.5HP",
    price: 35995,
    threshold: 2,
    stock: 9,
    description: "High-performance window unit for large rooms",
    warranty: "1 year parts, 5 years compressor",
  },

  {
    name: "Carrier Opus Inverter Floor Type",
    sku: "53CNV030WTHP",
    brand: "Carrier",
    category: "floor",
    specs: "3.0HP",
    price: 95000,
    threshold: 1,
    stock: 6,
    description: "Energenius Inverter Technology for vertical air distribution",
    warranty: "1 year parts, 5 years compressor",
  },
  {
    name: "Carrier Slim Floor Type",
    sku: "53CLV036308",
    brand: "Carrier",
    category: "floor",
    specs: "4.0HP",
    price: 100000,
    threshold: 1,
    stock: 5,
    description: "Slim floor-type design with industrial cooling capacity",
    warranty: "1 year parts, 5 years compressor",
  },
];

const getCustomerDeliveryAddress = (user = {}) => {
  const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
  return (
    addresses.find((address) => address?.isDefault) ||
    addresses[0] ||
    user?.billingAddress ||
    user?.location?.address ||
    null
  );
};

const getModelImageUrl = (product = {}) => {
  const sku = String(product.sku || product.model || "").toUpperCase();
  if (sku.startsWith("AHAC-MINV")) {
    return "https://ansons.ph/wp-content/uploads/2024/12/29_AHAC-MINV1023EHW-480x480.jpg";
  }
  if (sku.includes("CWI")) {
    return "https://www.kimstore.com/cdn/shop/files/DHMETCL0005.png?v=1757586903&width=1946";
  }
  if (sku.startsWith("TAC-")) {
    return "https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg?auto=compress&dpr=1&h=750&w=1260";
  }
  if (sku.startsWith("MSCE-")) {
    return "https://web-res.midea.com/content/dam/midea-aem/my/my-new/pdp/air-conditioner/residential/msce-25crfn8-id--msce-25crfn8-od/PD-air-conditioner-residential-MSCE-25CRFN8-ID%20%20MSCE-25CRFN8-OD-EF1-front-close-1040x1040.jpg";
  }
  if (sku.startsWith("AR")) {
    return "https://dienmayabc.com/media/product/3579_samsung_ar09tyhqasinsv_a_1_org.jpg";
  }
  if (sku.startsWith("HSN")) {
    return "https://www.lg.com/content/dam/channel/wcms/ph/images/residential-air-conditioners/hsn09ipx_attglcp_eacm_ph_c/gallery/Zoom_01.jpg?w=800";
  }
  if (sku.startsWith("53CNV") || sku.startsWith("53CLV")) {
    return "https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg?auto=compress&dpr=1&h=750&w=1260";
  }
  return "https://images.pexels.com/photos/16592625/pexels-photo-16592625/free-photo-of-air-conditioner-in-a-house.jpeg?auto=compress&dpr=1&h=750&w=1260";
};

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
  const { user, isAuthenticated, logout } = useUser();
  const inventoryBranch = useMemo(() => {
    if (!isAuthenticated) return "";
    const deliveryAddress = getCustomerDeliveryAddress(user);
    return deliveryAddress ? resolvePreferredBranch(deliveryAddress) : "";
  }, [isAuthenticated, user]);
  const navigate = useNavigate();
  const location = useLocation();

  const [backendProducts, setBackendProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

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

  // Fetch Notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    apiRequest("/notifications/me")
      .then((response) => {
        const normalized = (response.notifications || []).map((item) => ({
          ...item,
          unread: Boolean(item.unread),
          time: new Date(item.createdAt).toLocaleString(),
        }));
        setNotifications(normalized);
      })
      .catch(() => setNotifications([]));
  }, [isAuthenticated]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [sortBy, setSortBy] = useState("default");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      const query = inventoryBranch
        ? `?branch=${encodeURIComponent(inventoryBranch)}`
        : "";
      const response = await apiRequest(`/products/public${query}`);
      const mapped = (response.products || []).map((product) => {
          // Strip redundant "AC" from name and description
          const cleanName = (product.name || "")
            .replace(/\s*AC\s*$/gi, "")
            .trim();
          const rawDesc =
            Array.isArray(product.features) && product.features.length > 0
              ? product.features.join(", ")
              : product.description || "";
          const cleanDesc =
            rawDesc.replace(/\s*AC\s*$/gi, "").trim() ||
            "Energy efficient unit.";

          return {
            id: product.id,
            name: cleanName,
            brand: product.brand || "Generic",
            category: product.category || "split",
            price: Number(product.price) || 0,
            specs: product.specs || "",
            description: cleanDesc,
            inStock: Number(product.stock) > 0,
            stock: Number(product.stock) || 0,
            stockLabel:
              product.stockScope === "branch"
                ? `${Number(product.stock) || 0} Units · ${product.inventoryBranch}`
                : `${Number(product.totalStock ?? product.stock) || 0} Units across branches`,
            model: product.sku || "",
            warranty: product.warranty || "1 year parts, 5 years compressor",
            imageUrl: product.image || `${API_BASE_URL}/products/${product.id}/image`,
            discount: product.discount || 0,
            featured: product.featured || false,
          };
      });
      setBackendProducts(mapped);
    } catch (error) {
      // Keep the last confirmed server catalogue visible rather than showing
      // static demo items with incorrect inventory.
      console.error("Failed to fetch products:", error);
    }
  }, [inventoryBranch]);

  useEffect(() => {
    fetchProducts();
    const pollId = window.setInterval(fetchProducts, 20000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchProducts();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
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
      imageUrl: product.imageUrl || getModelImageUrl(product),
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

  const handleAddToCart = (product, qty = 1) => {
    if (!isAuthenticated) return navigate("/login");
    addToCart(product, qty);
  };

  const handleBuyNow = (product) => {
    if (!isAuthenticated) return navigate("/login");
    addToCart(product, 1);
    navigate("/checkout");
  };

  const handleCheckout = () => {
    if (!isAuthenticated) return navigate("/login");
    navigate("/checkout");
    setIsCartOpen(false);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <BoutiqueScreen withHeader padding={0}>
      <BoutiqueHeader
        title="Shop AC Units"
        onLeftAction={() => setSidebarOpen(true)}
        leftAction="menu"
        cartCount={getCartCount()}
        notificationCount={unreadCount}
        onNotificationClick={() => setShowNotifications(true)}
        isAuthenticated={isAuthenticated}
        onCartClick={() => setIsCartOpen(true)}
      />

      <BoutiqueNotifications
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      <BoutiqueBox
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
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onProductClick={setSelectedProduct}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <BoutiqueCart
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
