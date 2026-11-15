import LoadingSkeleton from "../../components/ui/LoadingSkeleton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { startLiveRefresh } from "../../services/liveRefresh";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  getShopDeliveryAddress,
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

const cartStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.32)", justifyContent: "flex-end" },
  sheet: {
    width: "100%", maxWidth: 560, maxHeight: "90%", alignSelf: "center",
    backgroundColor: BQ_COLORS.surface, borderTopLeftRadius: BQ_RADIUS.card, borderTopRightRadius: BQ_RADIUS.card,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: BQ_SPACING.sm,
    paddingHorizontal: BQ_SPACING.md, paddingVertical: BQ_SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: BQ_COLORS.border,
  },
  list: { flexShrink: 1, flexGrow: 0 },
  listContent: { gap: BQ_SPACING.md, padding: BQ_SPACING.md },
  card: { gap: BQ_SPACING.sm, padding: BQ_SPACING.sm + 4, borderWidth: 1, borderColor: BQ_COLORS.border, borderRadius: BQ_RADIUS.md },
  product: { flexDirection: "row", alignItems: "flex-start", gap: BQ_SPACING.sm + 4 },
  photo: { width: 76 },
  zoom: {
    position: "absolute", right: 4, bottom: 4, width: 24, height: 24, borderRadius: 12,
    backgroundColor: BQ_COLORS.surface, alignItems: "center", justifyContent: "center",
  },
  summary: { flex: 1, gap: BQ_SPACING.xs },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: BQ_SPACING.sm },
  touch: { width: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  detailRow: { borderTopWidth: 1, borderTopColor: BQ_COLORS.border, paddingTop: BQ_SPACING.sm },
  footer: {
    flexShrink: 0, gap: BQ_SPACING.sm, padding: BQ_SPACING.md,
    backgroundColor: BQ_COLORS.bg, borderTopWidth: 1, borderColor: BQ_COLORS.border,
  },
  empty: { alignItems: "center", gap: BQ_SPACING.sm, padding: BQ_SPACING.lg },
});

function CartProductSpecs({ item, t }) {
  return (
    <View style={{ gap: BQ_SPACING.xs }}>
      <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{t("Model")}: {formatCartModel(item)}</BoutiqueText>
      <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{t("Horsepower")}: {formatCartHorsepower(item)}</BoutiqueText>
    </View>
  );
}

function CartQuantity({ item, updateQuantity, t }) {
  return <BoutiqueQuantityStepper value={item.quantity} max={Number(item.stock ?? 99)}
    onChange={(next) => updateQuantity(item.id, next)} largeTargets t={t} />;
}

export function CartModal({ visible, onClose, addressId = "" }) {
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, cartTotal, hydrated = true, updateQuantity, removeFromCart } = useCart();
  const [selectedId, setSelectedId] = useState(null);
  const item = hydrated ? cart.find((entry) => entry.id === selectedId) : null;
  const listOffset = useRef(0);
  const sheetPadding = { paddingBottom: Math.max(BQ_SPACING.md, insets.bottom) };

  useEffect(() => {
    if (!visible) {
      setSelectedId(null);
      listOffset.current = 0;
    } else if (!item && selectedId !== null) {
      setSelectedId(null);
    }
  }, [visible, item?.id, selectedId]);

  const close = () => {
    if (item) setSelectedId(null);
    else onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={cartStyles.overlay}>
        <View style={[cartStyles.sheet, BQ_SHADOW.float]} accessibilityViewIsModal>
          <View style={cartStyles.header}>
            <BoutiqueText variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
              {t(item ? "Cart item details" : "Cart")}
            </BoutiqueText>
            <Pressable onPress={close} style={cartStyles.touch} accessibilityRole="button" accessibilityLabel={t(item ? "Back to cart" : "Close cart")}>
              <Ionicons name={item ? "arrow-back-sharp" : "close-sharp"} size={24} color={BQ_COLORS.ink} />
            </Pressable>
          </View>

          {item ? (
            <>
              <ScrollView key="cart-item-details" style={cartStyles.list} contentContainerStyle={cartStyles.listContent} nestedScrollEnabled>
                <ProductImage key={item.id} product={item} size={176} />
                <View style={{ gap: BQ_SPACING.sm }}>
                  <BoutiqueText variant="h3">{item.name}</BoutiqueText>
                  <CartProductSpecs item={item} t={t} />
                </View>
                <View style={[cartStyles.controls, cartStyles.detailRow]}>
                  <BoutiqueText color={BQ_COLORS.inkMuted}>{t("Unit price")}</BoutiqueText>
                  <BoutiqueText variant="h3">{formatPeso(item.price)}</BoutiqueText>
                </View>
                <View style={[cartStyles.controls, cartStyles.detailRow]}>
                  <BoutiqueText color={BQ_COLORS.inkMuted}>{t("Quantity")}</BoutiqueText>
                  <CartQuantity item={item} updateQuantity={updateQuantity} t={t} />
                </View>
              </ScrollView>
              <View style={[cartStyles.footer, sheetPadding]}>
                <View style={cartStyles.controls}>
                  <BoutiqueText color={BQ_COLORS.inkMuted}>{t("Item total")}</BoutiqueText>
                  <BoutiqueText variant="h3" accessibilityLiveRegion="polite">{formatPeso(item.price * item.quantity)}</BoutiqueText>
                </View>
              </View>
            </>
          ) : !hydrated ? (
            <View style={[cartStyles.listContent, sheetPadding]}><LoadingSkeleton label={t("Loading your cart…")} /></View>
          ) : cart.length === 0 ? (
            <View style={cartStyles.empty}>
              <Ionicons name="cart-outline" size={42} color={BQ_COLORS.inkMuted} />
              <BoutiqueText variant="h3" align="center">{t("Your cart is empty")}</BoutiqueText>
            </View>
          ) : (
            <>
              <ScrollView key="cart-items" testID="cart-items-scroll" style={cartStyles.list} contentContainerStyle={cartStyles.listContent}
                contentOffset={{ x: 0, y: listOffset.current }} scrollEventThrottle={32}
                onScroll={(event) => { listOffset.current = event.nativeEvent.contentOffset.y; }} nestedScrollEnabled>
                {cart.map((line) => (
                  <View key={line.id} style={cartStyles.card}>
                    <View style={cartStyles.product}>
                      <Pressable onPress={() => setSelectedId(line.id)} style={cartStyles.photo} accessibilityRole="button"
                        accessibilityLabel={`${t("View details")}: ${line.name}`}>
                        <ProductImage product={line} size={76} />
                        <View style={cartStyles.zoom}><Ionicons name="search-sharp" size={14} color={BQ_COLORS.ink} /></View>
                      </Pressable>
                      <View style={cartStyles.summary}>
                        <BoutiqueText variant="h3">{line.name}</BoutiqueText>
                        <CartProductSpecs item={line} t={t} />
                        <BoutiqueText variant="h3">{formatPeso(line.price * line.quantity)}</BoutiqueText>
                      </View>
                    </View>
                    <View style={cartStyles.controls}>
                      <CartQuantity item={line} updateQuantity={updateQuantity} t={t} />
                      <Pressable onPress={() => removeFromCart(line.id)} style={cartStyles.touch} accessibilityRole="button"
                        accessibilityLabel={`${t("Remove")} ${line.name} ${t("from cart")}`}>
                        <Ionicons name="trash-outline" size={20} color={BQ_COLORS.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={[cartStyles.footer, sheetPadding]}>
                <View style={cartStyles.controls}>
                  <BoutiqueText color={BQ_COLORS.inkMuted}>{t("Subtotal")}</BoutiqueText>
                  <BoutiqueText variant="h3">{formatPeso(cartTotal)}</BoutiqueText>
                </View>
                <BoutiqueButton title={t("Checkout")} fullWidth onPress={() => {
                  onClose();
                  router.push(addressId ? { pathname: "/customer/checkout", params: { addressId } } : "/customer/checkout");
                }} />
              </View>
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
  const [selectedAddressId, setSelectedAddressId] = useState("");
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
          const address = getShopDeliveryAddress(current, selectedAddressId);
          const branch = address ? await resolveConfiguredInventoryBranch(address) : "";
          const products = await fetchShopProducts(branch, { reuseRecent: true });
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
    }, [current, selectedAddressId]),
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

  const preparePurchase = async (product, buyNow) => {
    if (addInFlightRef.current || !requireCustomer()) return false;
    addInFlightRef.current = true;
    try {
      const session = await me(token);
      if (!session?.success || !session.user) throw new Error(t(buyNow
        ? "Please sign in again before checking out."
        : "Unable to confirm your account. Please try again before adding to cart."));
      const user = session.user;
      const address = getShopDeliveryAddress(user, selectedAddressId);
      if (!address) throw new Error(t("Please add a delivery address to continue."));
      const branch = await resolveConfiguredInventoryBranch(address);
      if (!branch) throw new Error(t("Your saved delivery address is outside our service areas. Choose a different address in Account first."));
      const latest = await fetchShopProducts(branch);
      const currentProduct = latest.find((entry) => String(entry.id) === String(product.id));
      const available = Number(currentProduct?.stock || 0);
      const requested = 1 + (buyNow ? 0 : Number(cart.find((entry) => String(entry.id) === String(product.id))?.quantity || 0));
      if (!Number.isSafeInteger(available) || available < requested) throw new Error(available <= 0
        ? (language === "Filipino" ? `Hindi available ang AC unit na ito sa sangay ng ${branch}.` : `This AC unit is unavailable at the ${branch} branch.`)
        : (language === "Filipino" ? `Ang sangay ng ${branch} ay may ${available} available na unit lamang.` : `The ${branch} branch has only ${available} unit(s) available.`));
      lastStockAlertRef.current = { message: "", at: 0 };
      if (buyNow) {
        router.push({ pathname: "/customer/checkout", params: { addressId: selectedAddressId, buyNowProductId: String(currentProduct.id) } });
      } else {
        addToCart({ ...currentProduct, fulfillmentBranch: branch }, 1);
        setCartNotice({ id: Date.now(), name: product.name || "AC unit" });
      }
      return true;
    } catch (error) {
      const message = error?.message || t("Unable to confirm branch stock. Please try again.");
      const previous = lastStockAlertRef.current;
      if (previous.message !== message || Date.now() - previous.at > 2500) {
        Alert.alert(t(buyNow ? "Review your order" : "Cannot add to cart"), message);
        lastStockAlertRef.current = { message, at: Date.now() };
      }
      return false;
    } finally {
      addInFlightRef.current = false;
    }
  };

  const handleAddToCart = (product) => preparePurchase(product, false);
  const handleBuyNow = (product) => preparePurchase(product, true);

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
        {Array.isArray(current?.addresses) && current.addresses.length > 0 ? (
          <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
            <BoutiqueText variant="label">{t("Delivery address for local stock")}</BoutiqueText>
            <BoutiqueSegmented
              options={current.addresses.map((entry, index) => ({
                value: String(entry.id || entry._id),
                label: entry.label || entry.name || `${t("Address")} ${index + 1}`,
              }))}
              value={selectedAddressId || String((current.addresses.find((entry) => entry.isDefault) || current.addresses[0]).id || (current.addresses.find((entry) => entry.isDefault) || current.addresses[0])._id)}
              onChange={setSelectedAddressId}
            />
          </BoutiqueCard>
        ) : null}
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
            {loading ? t("Loading products...") : language === "Filipino" ? `${filteredProducts.length} produktong nakita` : `Found ${filteredProducts.length} products`}
          </BoutiqueText>
        </View>

        {loading && !filteredProducts.length ? (
          <LoadingSkeleton label={t("Loading the latest available AC units...")} variant="cards" />
        ) : filteredProducts.length === 0 ? (
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

      <CartModal visible={cartOpen} onClose={() => setCartOpen(false)} addressId={selectedAddressId} />
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
