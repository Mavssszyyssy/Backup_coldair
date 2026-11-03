import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { startLiveRefresh } from "../../services/liveRefresh";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, View } from "react-native";

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
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";
import { me } from "../../services/api";
import { formatCartHorsepower, formatCartModel } from "../../services/cartDisplayService";
import {
  buildBrands,
  buildCategories,
  fallbackProducts,
  fetchShopProducts,
  filterAndSortProducts,
  partitionProductsByAvailability,
  formatPeso,
  mergeProducts,
  paginateProducts,
  resolveConfiguredInventoryBranch,
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

function localizedStockLabel(product, t) {
  if (!product.inStock) return t("Out of stock");
  const label = product.stockLabel || `${product.stock} units`;
  return label
    .replace(/ units across branches$/, ` ${t("units across branches")}`)
    .replace(/ units · /, ` ${t("units")} · `)
    .replace(/ units$/, ` ${t("units")}`);
}

function ProductImage({ product, size = 136 }) {
  const [broken, setBroken] = useState(false);
  const { t } = useInterfaceLanguage();

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
      {(product.imageSource || product.imageUrl) && !broken ? (
        <Image
          source={product.imageSource || { uri: product.imageUrl, cache: "force-cache" }}
          onError={() => setBroken(true)}
          accessibilityLabel={`${product.brand} ${product.model || product.name} ${t("product image")}`}
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
  const { t } = useInterfaceLanguage();
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
              {product.model || product.sku || t("Model")}
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
            label={localizedStockLabel(product, t)}
            variant={product.inStock ? "success" : "danger"}
          />
        </View>

        {product.inStock ? (
          <View style={{ flexDirection: "row", gap: BQ_SPACING.sm }}>
            <BoutiqueButton title={t("Buy Now")} variant="outline" size="sm" onPress={() => onBuyNow(product)} style={{ flex: 1 }} rightIcon={<Ionicons name="flash-sharp" size={16} color={BQ_COLORS.ink} />} />
            <BoutiqueButton title={t("Add")} size="sm" onPress={() => onAddToCart(product)} style={{ flex: 1 }} rightIcon={<Ionicons name="cart-sharp" size={16} color="#fff" />} />
          </View>
        ) : (
          <BoutiqueButton title={t("Out of stock")} variant="outline" size="sm" disabled fullWidth />
        )}
      </View>
    </BoutiqueCard>
  );
}

export function CartModal({ visible, onClose }) {
  const { language, t } = useInterfaceLanguage();
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
              ...(cart.length ? { height: "82%" } : {}),
            },
            BQ_SHADOW.float,
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <BoutiqueText variant="h2">{t("Cart")}</BoutiqueText>
              <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
                {language === "Filipino" ? `${cart.length} uri ng produkto` : `${cart.length} product line${cart.length === 1 ? "" : "s"}`}
              </BoutiqueText>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Close cart")}>
              <Ionicons name="close-sharp" size={24} color={BQ_COLORS.ink} />
            </Pressable>
          </View>

          {cart.length === 0 ? (
            <View style={{ paddingVertical: BQ_SPACING.xl, alignItems: "center", gap: BQ_SPACING.sm }}>
              <Ionicons name="cart-outline" size={48} color={BQ_COLORS.inkFaint} />
              <BoutiqueText variant="h3" align="center" style={{ alignSelf: "stretch", flexShrink: 0, minHeight: 28 }}>{t("Your cart is empty")}</BoutiqueText>
            </View>
          ) : (
            <>
              <ScrollView testID="cart-items-scroll" style={{ flex: 1 }} contentContainerStyle={{ gap: BQ_SPACING.md, paddingBottom: BQ_SPACING.sm }} nestedScrollEnabled>
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
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted} numberOfLines={1}>
                      {t("Model")}: {formatCartModel(item)}
                    </BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted} numberOfLines={1}>
                      {t("Horsepower")}: {formatCartHorsepower(item)}
                    </BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
                      {formatPeso(item.price)} {t("each")}
                    </BoutiqueText>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <BoutiqueQuantityStepper
                        value={item.quantity}
                        max={Number(item.stock ?? 99)}
                        onChange={(next) => updateQuantity(item.id, next)}
                      />
                      <Pressable onPress={() => removeFromCart(item.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t("Remove")} ${item.name} ${t("from cart")}`}>
                        <Ionicons name="trash-sharp" size={18} color={BQ_COLORS.danger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
              </ScrollView>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                  {t("Subtotal")}
                </BoutiqueText>
                <BoutiqueText variant="h2">{formatPeso(cartTotal)}</BoutiqueText>
              </View>
              <BoutiqueButton
                title={t("Checkout")}
                fullWidth
                onPress={() => {
                  onClose();
                  router.push("/customer/checkout");
                }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ProductModal({ product, visible, onClose, onAddToCart, onBuyNow }) {
  const { t } = useInterfaceLanguage();
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
                  {product.brand} / {product.model || product.sku || t("Model")}
                </BoutiqueText>
                <BoutiqueText variant="h2">{product.name}</BoutiqueText>
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Close product details")}>
                <Ionicons name="close-sharp" size={24} color={BQ_COLORS.ink} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: BQ_SPACING.sm }}>
              {product.specs ? <BoutiqueChip label={product.specs} variant="blue" /> : null}
              <BoutiqueChip label={t(product.category)} variant="neutral" />
              <BoutiqueChip label={localizedStockLabel(product, t)} variant={product.inStock ? "success" : "danger"} />
            </View>
            <BoutiqueText color={BQ_COLORS.inkMuted}>{product.description}</BoutiqueText>
            <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
              {t("Warranty")}: {product.warranty}
            </BoutiqueText>
            <BoutiqueText variant="h1">{formatPeso(product.price)}</BoutiqueText>
            {product.inStock ? (
              <View style={{ flexDirection: "row", gap: BQ_SPACING.sm }}>
                <BoutiqueButton title={t("Add to Cart")} fullWidth onPress={() => onAddToCart(product)} style={{ flex: 1 }} />
                <BoutiqueButton title={t("Buy Now")} variant="outline" fullWidth onPress={() => onBuyNow(product)} style={{ flex: 1 }} />
              </View>
            ) : (
              <BoutiqueButton title={t("Out of stock")} variant="outline" fullWidth disabled />
            )}
          </View>
        </BoutiqueCard>
      </View>
    </Modal>
  );
}

export default function CustomerShopScreen() {
  const router = useRouter();
  const { language, t } = useInterfaceLanguage();
  const { current, token } = useUserContext();
  const { cart, addToCart, cartCount } = useCart();
  const [backendProducts, setBackendProducts] = useState([]);
  const [inventoryBranch, setInventoryBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const addInFlightRef = useRef(false);
  const lastStockAlertRef = useRef({ message: "", at: 0 });

  useEffect(() => {
    if (!cartNotice) return undefined;
    const timeoutId = setTimeout(() => setCartNotice(null), 2200);
    return () => clearTimeout(timeoutId);
  }, [cartNotice]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadCatalogue = async ({ background }) => {
        if (!background) setLoading(true);
        try {
          const address = current?.addresses?.find((entry) => entry.isDefault) || current?.addresses?.[0] || current?.billingAddress;
          const branch = address ? await resolveConfiguredInventoryBranch(address) : "";
          const products = await fetchShopProducts(branch);
          if (active) { setBackendProducts(products); setInventoryBranch(branch); }
        } catch (_error) {
          // Keep the last confirmed catalogue when connectivity drops.
        } finally {
          if (active) setLoading(false);
        }
      };
      const stop = startLiveRefresh(loadCatalogue);
      return () => {
        active = false;
        stop();
      };
    }, [current]),
  );

  const products = useMemo(() => mergeProducts(fallbackProducts, backendProducts), [backendProducts]);
  const categories = useMemo(() => buildCategories(products).map((entry) => ({ ...entry, label: t(entry.label) })), [products, t]);
  const brands = useMemo(() => buildBrands(products).map((entry) => entry.value === "all" ? { ...entry, label: t(entry.label) } : entry), [products, t]);
  const sortOptions = useMemo(() => SORT_OPTIONS.map((entry) => ({ ...entry, label: t(entry.label) })), [t]);
  const filteredProducts = useMemo(
    () => filterAndSortProducts(products, { selectedCategory, selectedBrand, searchTerm, sortBy }),
    [products, selectedCategory, selectedBrand, searchTerm, sortBy],
  );
  const { available: availableProducts, unavailable: unavailableProducts } = useMemo(
    () => partitionProductsByAvailability(filteredProducts),
    [filteredProducts],
  );
  const pageResult = useMemo(
    () => paginateProducts([...availableProducts, ...unavailableProducts], page),
    [availableProducts, unavailableProducts, page],
  );
  const visibleProducts = useMemo(() => partitionProductsByAvailability(pageResult.items), [pageResult.items]);

  useEffect(() => setPage(1), [searchTerm, selectedCategory, selectedBrand, sortBy]);
  useEffect(() => setPage(pageResult.page), [pageResult.page]);

  const requireCustomer = () => {
    if (current) return true;
    Alert.alert(t("Login required"), t("Please log in before checking out."));
    router.push("/sign-in");
    return false;
  };

  const handleAddToCart = async (product) => {
    if (addInFlightRef.current || !requireCustomer()) return false;
    addInFlightRef.current = true;
    try {
      const session = await me(token);
      if (!session?.success || !session.user) throw new Error(t("Unable to confirm your account. Please try again before adding to cart."));
      const user = session.user;
      const address = user?.addresses?.find((entry) => entry.isDefault) || user?.addresses?.[0] || user?.billingAddress;
      if (!address) throw new Error(t("Save a delivery address in Account before adding AC units to your cart."));
      const branch = await resolveConfiguredInventoryBranch(address);
      if (!branch) throw new Error(t("Your delivery address is outside our service areas. Update it in Account first."));
      const latest = await fetchShopProducts(branch);
      const currentProduct = latest.find((entry) => String(entry.id) === String(product.id));
      const available = Number(currentProduct?.stock || 0);
      const requested = Number(cart.find((entry) => String(entry.id) === String(product.id))?.quantity || 0) + 1;
      if (!Number.isSafeInteger(available) || available < requested) throw new Error(available <= 0
        ? (language === "Filipino" ? `Hindi available ang AC unit na ito sa sangay ng ${branch}.` : `This AC unit is unavailable at the ${branch} branch.`)
        : (language === "Filipino" ? `Ang sangay ng ${branch} ay may ${available} available na unit lamang.` : `The ${branch} branch has only ${available} unit(s) available.`));
      addToCart({ ...currentProduct, fulfillmentBranch: branch }, 1);
      lastStockAlertRef.current = { message: "", at: 0 };
      setCartNotice({ id: Date.now(), name: product.name || "AC unit" });
      return true;
    } catch (error) {
      const message = error?.message || t("Unable to confirm branch stock. Please try again.");
      const previous = lastStockAlertRef.current;
      if (previous.message !== message || Date.now() - previous.at > 2500) {
        Alert.alert(t("Cannot add to cart"), message);
        lastStockAlertRef.current = { message, at: Date.now() };
      }
      return false;
    } finally {
      addInFlightRef.current = false;
    }
  };

  const handleBuyNow = async (product) => {
    if (await handleAddToCart(product)) router.push("/customer/checkout");
  };

  return (
    <>
      <BoutiqueHeader
        title={t("Shop AC Units")}
        subtitle={inventoryBranch ? (language === "Filipino" ? `Available sa sangay ng ${inventoryBranch} para sa paghahatid` : `Available at your ${inventoryBranch} delivery branch`) : t("Browse AC units · save an address to check local stock")}
        onCart={() => setCartOpen(true)}
        cartCount={cartCount}
      />
      {cartNotice ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{
            position: "absolute",
            top: 86,
            left: BQ_SPACING.md,
            right: BQ_SPACING.md,
            zIndex: 1000,
            flexDirection: "row",
            alignItems: "center",
            gap: BQ_SPACING.sm,
            paddingHorizontal: BQ_SPACING.md,
            paddingVertical: BQ_SPACING.sm + 3,
            borderRadius: BQ_RADIUS.md,
            backgroundColor: "#111827",
            ...BQ_SHADOW.float,
          }}
        >
          <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#22C55E" }}>
            <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <BoutiqueText variant="label" color="#FFFFFF">{t("Added to cart")}</BoutiqueText>
            <BoutiqueText variant="caption" color="#D1D5DB" numberOfLines={1}>{cartNotice.name}</BoutiqueText>
          </View>
        </View>
      ) : null}
      <BoutiqueScreen contentContainerStyle={{ gap: BQ_SPACING.md }}>
        <BoutiqueCard
          elevated={false}
          padding={BQ_SPACING.sm + 4}
          style={{ backgroundColor: BQ_COLORS.bgAlt, gap: BQ_SPACING.sm + 2 }}
        >
          <BoutiqueSearchInput value={searchTerm} onChangeText={setSearchTerm} placeholder={t("Search products, brand, model")} />
          <BoutiqueSegmented options={categories} value={selectedCategory} onChange={setSelectedCategory} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: BQ_SPACING.sm }}>
            <BoutiqueButton
              title={filtersOpen ? t("Hide Filters") : t("Filters")}
              variant="outline"
              size="sm"
              onPress={() => setFiltersOpen((open) => !open)}
              leftIcon={<Ionicons name="options-sharp" size={16} color={BQ_COLORS.brand} />}
              style={{ flex: 1, borderColor: BQ_COLORS.brand }}
            />
            <BoutiqueButton
              title={t("Reset")}
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
                {t("Brand")}
              </BoutiqueText>
              <BoutiqueSegmented options={brands} value={selectedBrand} onChange={setSelectedBrand} />
              <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                {t("Sort")}
              </BoutiqueText>
              <BoutiqueSegmented options={sortOptions} value={sortBy} onChange={setSortBy} />
            </View>
          ) : selectedBrand !== "all" || sortBy !== "default" ? (
            <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
              {selectedBrand !== "all" ? selectedBrand : t("All brands")} / {sortOptions.find((item) => item.value === sortBy)?.label || t("Default")}
            </BoutiqueText>
          ) : null}
        </BoutiqueCard>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
            {language === "Filipino" ? `${filteredProducts.length} produktong nakita` : `Found ${filteredProducts.length} products`}
          </BoutiqueText>
          {loading ? <ActivityIndicator color={BQ_COLORS.brand} /> : null}
        </View>

        {filteredProducts.length === 0 && !loading ? (
          <BoutiqueCard style={{ alignItems: "center", gap: BQ_SPACING.sm, paddingVertical: BQ_SPACING.xl }}>
            <Ionicons name="warning-sharp" size={44} color={BQ_COLORS.inkFaint} />
            <BoutiqueText variant="h3">{t("No products found")}</BoutiqueText>
            <BoutiqueButton
              title={t("Clear Filters")}
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
          <View style={{ gap: BQ_SPACING.sm }}>
            {visibleProducts.available.length > 0 ? (
              <View>
                <BoutiqueText variant="h3" style={{ marginBottom: BQ_SPACING.sm }}>{t("Available now")} ({availableProducts.length})</BoutiqueText>
                {visibleProducts.available.map((product) => (
                  <ProductCard key={product.id} product={product} onPress={() => setSelectedProduct(product)} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} />
                ))}
              </View>
            ) : null}
            {visibleProducts.unavailable.length > 0 ? (
              <View>
                <BoutiqueText variant="h3" style={{ marginBottom: BQ_SPACING.xs }}>{t("Out of stock")} ({unavailableProducts.length})</BoutiqueText>
                <BoutiqueText color={BQ_COLORS.inkMuted} style={{ marginBottom: BQ_SPACING.md }}>{t("View these AC units while waiting for stock to return.")}</BoutiqueText>
                {visibleProducts.unavailable.map((product) => (
                  <ProductCard key={product.id} product={product} onPress={() => setSelectedProduct(product)} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} />
                ))}
              </View>
            ) : null}
          </View>
        )}
        {filteredProducts.length > 0 && pageResult.totalPages > 1 ? (
          <BoutiqueCard style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: BQ_SPACING.sm }}>
            <BoutiqueButton title={t("Previous")} variant="outline" disabled={pageResult.page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} />
            <BoutiqueText variant="caption" align="center">{t("Page")} {pageResult.page} {t("of")} {pageResult.totalPages}</BoutiqueText>
            <BoutiqueButton title={t("Next")} variant="outline" disabled={pageResult.page >= pageResult.totalPages} onPress={() => setPage((value) => value + 1)} />
          </BoutiqueCard>
        ) : null}
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
