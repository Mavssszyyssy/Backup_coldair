import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, View } from "react-native";

import {
  BoutiqueButton,
  BoutiqueCard,
  BoutiqueChip,
  BoutiqueHeader,
  BoutiqueQuantityStepper,
  BoutiqueScreen,
  BoutiqueSearchInput,
  BoutiqueSegmented,
  BoutiqueText,
  BQ_COLORS,
  BQ_RADIUS,
  BQ_SHADOW,
  BQ_SPACING,
} from "../../components/boutique";
import { useCart } from "../../context/CartContext";
import { useUserContext } from "../../context/UserContext";
import {
  buildBrands,
  buildCategories,
  fallbackProducts,
  fetchShopProducts,
  filterAndSortProducts,
  formatPeso,
  mergeProducts,
  resolveInventoryBranch,
} from "../../services/ecommerceService";

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "price_asc", label: "Price Low" },
  { value: "price_desc", label: "Price High" },
  { value: "hp_asc", label: "HP Low" },
  { value: "hp_desc", label: "HP High" },
  { value: "name_asc", label: "A-Z" },
];

function productIconName(category) {
  if (category === "window") return "tablet-landscape-sharp";
  if (category === "floor") return "server-sharp";
  return "albums-sharp";
}

function ProductImage({ product, size = 136 }) {
  const [broken, setBroken] = useState(false);

  return (
    <View
      style={{
        height: size,
        borderRadius: BQ_RADIUS.md,
        backgroundColor: BQ_COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {product.imageUrl && !broken ? (
        <Image
          source={{ uri: product.imageUrl }}
          onError={() => setBroken(true)}
          resizeMode="contain"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Ionicons name={productIconName(product.category)} size={52} color="rgba(0,0,0,0.12)" />
      )}
    </View>
  );
}

function ProductCard({ product, onPress, onAddToCart, onBuyNow }) {
  const displayName = product.name.toLowerCase().startsWith(product.brand.toLowerCase())
    ? product.name.slice(product.brand.length).trim()
    : product.name;

  return (
    <BoutiqueCard onPress={onPress} padding={0} style={{ marginBottom: BQ_SPACING.md }}>
      <ProductImage product={product} size={174} />
      <View style={{ padding: BQ_SPACING.lg, gap: BQ_SPACING.md }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: BQ_SPACING.md }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: BQ_RADIUS.sm,
              backgroundColor: BQ_COLORS.bg,
              borderWidth: 1,
              borderColor: BQ_COLORS.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BoutiqueText variant="caption" color={BQ_COLORS.ink} style={{ fontWeight: "800" }}>
              {product.brand.slice(0, 2).toUpperCase()}
            </BoutiqueText>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <BoutiqueText variant="label" color={BQ_COLORS.inkMuted} numberOfLines={1}>
              {product.model || product.sku || "Model"}
            </BoutiqueText>
            <BoutiqueText variant="h3" numberOfLines={2}>
              {displayName}
            </BoutiqueText>
          </View>
          {product.specs ? <BoutiqueChip label={product.specs} variant="blue" /> : null}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: BQ_SPACING.md }}>
          <BoutiqueText variant="h2" style={{ letterSpacing: -0.6 }}>
            {formatPeso(product.price)}
          </BoutiqueText>
          <BoutiqueChip
            label={product.stock > 0 ? (product.stockLabel || `${product.stock} units`) : "Out"}
            variant={product.stock > 0 ? "success" : "danger"}
          />
        </View>

        <View style={{ flexDirection: "row", gap: BQ_SPACING.sm }}>
          <BoutiqueButton
            title="Buy Now"
            variant="outline"
            size="sm"
            disabled={!product.inStock}
            onPress={() => onBuyNow(product)}
            style={{ flex: 1 }}
            rightIcon={<Ionicons name="flash-sharp" size={16} color={BQ_COLORS.ink} />}
          />
          <BoutiqueButton
            title="Add"
            size="sm"
            disabled={!product.inStock}
            onPress={() => onAddToCart(product)}
            style={{ flex: 1 }}
            rightIcon={<Ionicons name="cart-sharp" size={16} color="#fff" />}
          />
        </View>
      </View>
    </BoutiqueCard>
  );
}

function CartModal({ visible, onClose }) {
  const router = useRouter();
  const { cart, cartTotal, updateQuantity, removeFromCart } = useCart();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.28)", justifyContent: "flex-end" }}>
        <View
          style={[
            {
              maxHeight: "82%",
              backgroundColor: BQ_COLORS.surface,
              borderTopLeftRadius: BQ_RADIUS.card,
              borderTopRightRadius: BQ_RADIUS.card,
              padding: BQ_SPACING.lg,
              gap: BQ_SPACING.md,
            },
            BQ_SHADOW.float,
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <BoutiqueText variant="h2">Cart</BoutiqueText>
              <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
                {cart.length} product line{cart.length === 1 ? "" : "s"}
              </BoutiqueText>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close-sharp" size={24} color={BQ_COLORS.ink} />
            </Pressable>
          </View>

          {cart.length === 0 ? (
            <View style={{ paddingVertical: BQ_SPACING.xl, alignItems: "center", gap: BQ_SPACING.sm }}>
              <Ionicons name="cart-outline" size={48} color={BQ_COLORS.inkFaint} />
              <BoutiqueText variant="h3">Your cart is empty</BoutiqueText>
            </View>
          ) : (
            <View style={{ gap: BQ_SPACING.md }}>
              {cart.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    gap: BQ_SPACING.md,
                    paddingBottom: BQ_SPACING.md,
                    borderBottomWidth: 1,
                    borderBottomColor: BQ_COLORS.border,
                  }}
                >
                  <ProductImage product={item} size={72} />
                  <View style={{ flex: 1, gap: BQ_SPACING.xs }}>
                    <BoutiqueText variant="h3" numberOfLines={1}>
                      {item.name}
                    </BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
                      {formatPeso(item.price)} each
                    </BoutiqueText>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <BoutiqueQuantityStepper
                        value={item.quantity}
                        max={Math.max(1, item.stock || 99)}
                        onChange={(next) => updateQuantity(item.id, next)}
                      />
                      <Pressable onPress={() => removeFromCart(item.id)} hitSlop={8}>
                        <Ionicons name="trash-sharp" size={18} color={BQ_COLORS.danger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                  Subtotal
                </BoutiqueText>
                <BoutiqueText variant="h2">{formatPeso(cartTotal)}</BoutiqueText>
              </View>
              <BoutiqueButton
                title="Checkout"
                fullWidth
                onPress={() => {
                  onClose();
                  router.push("/customer/checkout");
                }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ProductModal({ product, visible, onClose, onAddToCart, onBuyNow }) {
  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.32)", justifyContent: "center", padding: BQ_SPACING.md }}>
        <BoutiqueCard padding={0}>
          <ProductImage product={product} size={230} />
          <View style={{ padding: BQ_SPACING.lg, gap: BQ_SPACING.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: BQ_SPACING.md }}>
              <View style={{ flex: 1 }}>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                  {product.brand} / {product.model || product.sku || "Model"}
                </BoutiqueText>
                <BoutiqueText variant="h2">{product.name}</BoutiqueText>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close-sharp" size={24} color={BQ_COLORS.ink} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: BQ_SPACING.sm }}>
              {product.specs ? <BoutiqueChip label={product.specs} variant="blue" /> : null}
              <BoutiqueChip label={product.category} variant="neutral" />
              <BoutiqueChip label={product.stock > 0 ? (product.stockLabel || `${product.stock} units`) : "Out of stock"} variant={product.stock > 0 ? "success" : "danger"} />
            </View>
            <BoutiqueText color={BQ_COLORS.inkMuted}>{product.description}</BoutiqueText>
            <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
              Warranty: {product.warranty}
            </BoutiqueText>
            <BoutiqueText variant="h1">{formatPeso(product.price)}</BoutiqueText>
            <View style={{ flexDirection: "row", gap: BQ_SPACING.sm }}>
              <BoutiqueButton title="Add to Cart" fullWidth disabled={!product.inStock} onPress={() => onAddToCart(product)} style={{ flex: 1 }} />
              <BoutiqueButton title="Buy Now" variant="outline" fullWidth disabled={!product.inStock} onPress={() => onBuyNow(product)} style={{ flex: 1 }} />
            </View>
          </View>
        </BoutiqueCard>
      </View>
    </Modal>
  );
}

export default function CustomerShopScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const { addToCart, cartCount } = useCart();
  const [backendProducts, setBackendProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadCatalogue = () => {
        setLoading(true);
        fetchShopProducts(resolveInventoryBranch(current))
          .then((products) => {
            if (active) setBackendProducts(products);
          })
          .catch(() => {
            // Do not replace an already-confirmed catalogue with local demo
            // products when the connection briefly drops.
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      };
      loadCatalogue();
      const pollId = setInterval(loadCatalogue, 20000);
      return () => {
        active = false;
        clearInterval(pollId);
      };
    }, [current]),
  );

  const products = useMemo(() => mergeProducts(fallbackProducts, backendProducts), [backendProducts]);
  const categories = useMemo(() => buildCategories(products), [products]);
  const brands = useMemo(() => buildBrands(products), [products]);
  const filteredProducts = useMemo(
    () => filterAndSortProducts(products, { selectedCategory, selectedBrand, searchTerm, sortBy }),
    [products, selectedCategory, selectedBrand, searchTerm, sortBy],
  );

  const requireCustomer = () => {
    if (current) return true;
    Alert.alert("Login required", "Please log in before checking out.");
    router.push("/sign-in");
    return false;
  };

  const handleAddToCart = (product) => {
    if (!requireCustomer()) return;
    addToCart(product, 1);
  };

  const handleBuyNow = (product) => {
    if (!requireCustomer()) return;
    addToCart(product, 1);
    router.push("/customer/checkout");
  };

  return (
    <>
      <BoutiqueHeader
        title="Shop AC Units"
        subtitle="Browse available AC units"
        onBack={() => router.replace("/customer/home")}
        onCart={() => setCartOpen(true)}
        cartCount={cartCount}
      />
      <BoutiqueScreen contentContainerStyle={{ gap: BQ_SPACING.md }}>
        <BoutiqueCard
          elevated={false}
          padding={BQ_SPACING.sm + 4}
          style={{ backgroundColor: BQ_COLORS.bgAlt, gap: BQ_SPACING.sm + 2 }}
        >
          <BoutiqueSearchInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Search products, brand, model" />
          <BoutiqueSegmented options={categories} value={selectedCategory} onChange={setSelectedCategory} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: BQ_SPACING.sm }}>
            <BoutiqueButton
              title={filtersOpen ? "Hide Filters" : "Filters"}
              variant="outline"
              size="sm"
              onPress={() => setFiltersOpen((open) => !open)}
              leftIcon={<Ionicons name="options-sharp" size={16} color={BQ_COLORS.brand} />}
              style={{ flex: 1, borderColor: BQ_COLORS.brand }}
            />
            <BoutiqueButton
              title="Reset"
              variant="ghost"
              size="sm"
              onPress={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setSelectedBrand("all");
                setSortBy("default");
                setFiltersOpen(false);
              }}
            />
          </View>

          {filtersOpen ? (
            <View style={{ gap: BQ_SPACING.sm }}>
              <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                Brand
              </BoutiqueText>
              <BoutiqueSegmented options={brands} value={selectedBrand} onChange={setSelectedBrand} />
              <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                Sort
              </BoutiqueText>
              <BoutiqueSegmented options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
            </View>
          ) : selectedBrand !== "all" || sortBy !== "default" ? (
            <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
              {selectedBrand !== "all" ? selectedBrand : "All brands"} / {SORT_OPTIONS.find((item) => item.value === sortBy)?.label || "Default"}
            </BoutiqueText>
          ) : null}
        </BoutiqueCard>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
            Found {filteredProducts.length} products
          </BoutiqueText>
          {loading ? <ActivityIndicator color={BQ_COLORS.brand} /> : null}
        </View>

        {filteredProducts.length === 0 && !loading ? (
          <BoutiqueCard style={{ alignItems: "center", gap: BQ_SPACING.sm, paddingVertical: BQ_SPACING.xl }}>
            <Ionicons name="warning-sharp" size={44} color={BQ_COLORS.inkFaint} />
            <BoutiqueText variant="h3">No products found</BoutiqueText>
            <BoutiqueButton
              title="Clear Filters"
              variant="outline"
              onPress={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setSelectedBrand("all");
                setSortBy("default");
                setFiltersOpen(false);
              }}
            />
          </BoutiqueCard>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => setSelectedProduct(product)}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
            />
          ))
        )}
      </BoutiqueScreen>

      <CartModal visible={cartOpen} onClose={() => setCartOpen(false)} />
      <ProductModal
        product={selectedProduct}
        visible={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(product) => {
          handleAddToCart(product);
          setSelectedProduct(null);
        }}
        onBuyNow={(product) => {
          setSelectedProduct(null);
          handleBuyNow(product);
        }}
      />
    </>
  );
}
