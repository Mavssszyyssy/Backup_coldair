import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  BoutiqueButton,
  BoutiqueCard,
  BoutiqueHeader,
  BoutiqueQuantityStepper,
  BoutiqueScreen,
  BoutiqueSegmented,
  BoutiqueText,
  BQ_COLORS,
  BQ_SPACING,
} from "../../components/boutique";
import { useCart } from "../../context/CartContext";
import { useUserContext } from "../../context/UserContext";
import { createOrder, me } from "../../services/api";
import {
  fetchShopProducts,
  formatPeso,
  resolveConfiguredInventoryBranch,
} from "../../services/ecommerceService";
import { validatePhone } from "../../utils/authValidation";
import { validatePostalCodeForAddress } from "../../services/postalCodeValidation";
import { formatCartModel } from "../../services/cartDisplayService";
import { subscribeBackendRecovery } from "../../services/backendConnectionState";
import { checkoutFingerprint, getAddressForOrder, validateBranchCart } from "../../services/checkoutAddressSelection";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

const DELIVERY_FEE_BY_BRANCH = {
  Bulacan: 380,
  Cavite: 350,
  Laguna: 400,
  Bataan: 420,
  Pangasinan: 550,
  Ilocos: 600,
};

const PAYMENT_CONNECTION_TIMEOUT_MS = 30000;
const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = "aeropulse_mobile_checkout_idempotency_v2";
const CHECKOUT_IDEMPOTENCY_TTL_MS = 30 * 60 * 1000;

const formatHorsepower = (item = {}) => {
  const parsed = Number(item.horsepower || String(item.specs || "").match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
  return parsed > 0 ? `${parsed} HP` : "Not specified";
};


const getCheckoutIdempotencyKey = async (fingerprint) => {
  try {
    const saved = JSON.parse(await AsyncStorage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY) || "null");
    if (
      saved?.key &&
      saved.fingerprint === fingerprint &&
      Date.now() - Number(saved.createdAt || 0) < CHECKOUT_IDEMPOTENCY_TTL_MS
    ) return saved.key;
  } catch (_error) {
    // An in-memory key still protects the current screen.
  }
  const key = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    await AsyncStorage.setItem(
      CHECKOUT_IDEMPOTENCY_STORAGE_KEY,
      JSON.stringify({ key, fingerprint, createdAt: Date.now() }),
    );
  } catch (_error) {
    // Storage failures do not prevent an order from being created safely.
  }
  return key;
};

const clearCheckoutIdempotencyKey = async () => {
  try {
    await AsyncStorage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
  } catch (_error) {
    // The key naturally expires, so an unavailable store needs no action.
  }
};

const calculateCheckoutTotals = (items = [], branch = "") => {
  const subtotal = Math.round(items.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  ) * 100) / 100;
  const vatAmount = Math.round(subtotal * 0.12 * 100) / 100;
  const shippingFee = DELIVERY_FEE_BY_BRANCH[branch] || 400;
  return { subtotal, vatAmount, shippingFee, total: subtotal + vatAmount + shippingFee };
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { addressId } = useLocalSearchParams();
  const { language, t } = useInterfaceLanguage();
  const localizeIssue = (message) => {
    const zipMismatch = String(message || "").match(/^ZIP code does not match (.+)\.$/);
    return zipMismatch && language === "Filipino"
      ? `Hindi tumutugma ang ZIP code sa ${zipMismatch[1]}.`
      : t(message);
  };
  const { cart, clearCart, replaceCart, updateQuantity, removeFromCart } = useCart();
  const { current, token } = useUserContext();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [inventoryBranch, setInventoryBranch] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState(String(Array.isArray(addressId) ? addressId[0] || "" : addressId || ""));
  const [showAddressChoices, setShowAddressChoices] = useState(false);
  const [branchStockById, setBranchStockById] = useState({});
  const [stockIssues, setStockIssues] = useState([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [connectionRecoveryRevision, setConnectionRecoveryRevision] = useState(0);
  const orderRequestKeyRef = useRef("");
  const submissionInFlightRef = useRef(false);
  const stockRefreshRef = useRef(0);
  const savedAddresses = useMemo(() => Array.isArray(current?.addresses) ? current.addresses : [], [current?.addresses]);
  const address = useMemo(() => getAddressForOrder(current, selectedAddressId), [current, selectedAddressId]);
  const addressIssue = useMemo(() => {
    const missingField = ["region", "province", "city", "barangay", "street"]
      .some((field) => !String(address?.[field] || "").trim());
    if (missingField) return "Complete the region, province, city, barangay, and street address.";
    const phoneError = address?.phone ? validatePhone(address.phone) : "Phone number is required.";
    return phoneError || validatePostalCodeForAddress(address);
  }, [address]);
  const checkoutTotals = useMemo(() => calculateCheckoutTotals(cart, inventoryBranch), [cart, inventoryBranch]);

  useEffect(() => {
    return subscribeBackendRecovery(() => {
      setConnectionRecoveryRevision((revision) => revision + 1);
    });
  }, []);

  useEffect(() => {
    let active = true;
    stockRefreshRef.current += 1;
    setInventoryBranch("");
    setBranchStockById({});
    setStockIssues([]);
    resolveConfiguredInventoryBranch(address)
      .then((branch) => { if (active) setInventoryBranch(branch); })
      .catch(() => { if (active) setInventoryBranch(""); });
    return () => { active = false; };
  }, [address, connectionRecoveryRevision]);

  const refreshCheckoutStock = useCallback(async () => {
    const refreshId = ++stockRefreshRef.current;
    if (!inventoryBranch || cart.length === 0) {
      setBranchStockById({});
      setStockIssues([]);
      return [];
    }
    try {
      const catalogue = await fetchShopProducts(inventoryBranch);
      const stockById = Object.fromEntries(catalogue.map((product) => [String(product.id), Number(product.stock || 0)]));
      const stockBySku = Object.fromEntries(catalogue
        .filter((product) => product.sku)
        .map((product) => [`sku:${String(product.sku)}`, Number(product.stock || 0)]));
      const nextIssues = cart.flatMap((item) => {
        const stock = stockById[String(item.id)] ?? stockBySku[`sku:${String(item.sku || "")}`];
        if (!Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0) return [{ id: String(item.id), name: item.name || "This item", available: stock || 0, code: "invalid_quantity" }];
        if (!Number.isFinite(stock)) return [{ id: String(item.id), name: item.name || "This item", available: 0, code: "out_of_stock" }];
        if (stock <= 0) return [{ id: String(item.id), name: item.name || "This item", available: 0, code: "out_of_stock" }];
        if (Number(item.quantity || 0) > stock) return [{ id: String(item.id), name: item.name || "This item", available: stock, code: "insufficient_stock" }];
        return [];
      });
      if (refreshId === stockRefreshRef.current) {
        setBranchStockById(stockById);
        setStockIssues(nextIssues);
      }
      return nextIssues;
    } catch (_error) {
      // The order submission performs the same authoritative check. Do not
      // incorrectly label stock unavailable when the catalogue is offline.
      return [];
    }
  }, [cart, inventoryBranch]);

  useEffect(() => {
    void refreshCheckoutStock();
  }, [refreshCheckoutStock, connectionRecoveryRevision]);

  const submitOrder = async () => {
    if (submissionInFlightRef.current) return;
    if (!cart.length) return Alert.alert(t("Cart is empty"), t("Add an item before checking out."));
    if (!token) return Alert.alert(t("Sign in required"), t("Please sign in again before checking out."));
    if (addressIssue) return Alert.alert(t("Complete delivery address"), localizeIssue(addressIssue));

    // Lock before the first network request; React state alone cannot stop a
    // second tap while the stock refresh is still in flight.
    submissionInFlightRef.current = true;
    setSubmitting(true);
    try {

    const currentStockIssues = await refreshCheckoutStock();
    if (currentStockIssues.length) {
      // The stock card below already explains the issue and stays visible for
      // correction. A second native alert would stack the same message.
      return;
    }

    setCheckoutMessage("Checking the latest stock and prices…");

    // Cart contents can persist between app updates. Resolve every line back
    // to the active catalogue before checkout so placeholder or stale IDs
    // cannot make COD or PayMongo appear to do nothing.
    let checkoutCart = cart;
    let liveBranch = "";
    try {
      liveBranch = await resolveConfiguredInventoryBranch(address);
      if (!liveBranch) {
        throw new Error("This delivery address is outside the current service areas. Choose another address before checkout.");
      }
      setInventoryBranch(liveBranch);
      const catalogue = await fetchShopProducts(
        liveBranch,
      );
      const activeItems = validateBranchCart(cart, catalogue, liveBranch);
      checkoutCart = activeItems;
      replaceCart(activeItems);
    } catch (error) {
      setSubmitting(false);
      setCheckoutMessage("");
      Alert.alert(t("Review your cart"), t(error?.message || "Unable to verify the current catalogue."));
      return;
    }

    // Always re-read the profile at checkout time. The address on the screen
    // can be an earlier session snapshot after a profile update.
    let checkoutUser = current;
    try {
      const latestSession = await me(token);
      if (latestSession.success && latestSession.user) {
        checkoutUser = latestSession.user;
      }
    } catch (_error) {
      // The current session remains a safe fallback if the refresh is unavailable.
    }
    const selectedSavedAddress = selectedAddressId
      ? checkoutUser?.addresses?.find((item) => String(item.id || item._id) === String(selectedAddressId))
      : null;
    if (selectedAddressId && !selectedSavedAddress) {
      setSubmitting(false);
      setCheckoutMessage("");
      return Alert.alert(t("Address changed"), t("That saved address is no longer available. Select another delivery address for this order."));
    }
    const checkoutAddress = getAddressForOrder(checkoutUser, selectedAddressId);
    const missingAddressField = ["region", "province", "city", "barangay", "street"]
      .some((field) => !String(checkoutAddress?.[field] || "").trim());
    const phoneError = checkoutAddress?.phone ? validatePhone(checkoutAddress.phone) : "Phone number is required.";
    const postalCodeError = validatePostalCodeForAddress(checkoutAddress);
    if (missingAddressField || phoneError || postalCodeError) {
      setSubmitting(false);
      setCheckoutMessage("");
      return Alert.alert(
        t("Complete delivery address"),
        localizeIssue(phoneError || postalCodeError || "Choose Region, Province, City/Municipality, Barangay, and Street in Account before checking out."),
        [
          { text: t("Cancel"), style: "cancel" },
          { text: t("Open Account"), onPress: () => router.push("/customer/settings") },
        ],
      );
    }

    let latestBranch;
    try {
      latestBranch = await resolveConfiguredInventoryBranch(checkoutAddress);
      if (!latestBranch) throw new Error("This delivery address is outside the current service areas. Choose another address before checkout.");
      if (latestBranch !== liveBranch) {
        const latestCatalogue = await fetchShopProducts(latestBranch);
        checkoutCart = validateBranchCart(checkoutCart, latestCatalogue, latestBranch);
        replaceCart(checkoutCart);
      }
    } catch (error) {
      setSubmitting(false);
      setCheckoutMessage("");
      return Alert.alert(t("Review your order"), t(error?.message || "Unable to verify stock for this delivery branch."));
    }
    setInventoryBranch(latestBranch);
    const latestTotals = calculateCheckoutTotals(checkoutCart, latestBranch);
    orderRequestKeyRef.current = await getCheckoutIdempotencyKey(
      checkoutFingerprint({ cartItems: checkoutCart, address: checkoutAddress, paymentMethod, customerId: checkoutUser?.id || checkoutUser?._id, branch: latestBranch }),
    );
    setCheckoutMessage(
      paymentMethod === "cod"
        ? "Submitting your order…"
        : "Connecting to secure payment…",
    );
    try {
      const result = await Promise.race([
        createOrder(token, {
          items: checkoutCart.map((item) => ({
            productId: item.id,
            sku: item.sku || "",
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            specs: item.specs || "",
            horsepower: Number(item.horsepower || 0),
          })),
          addressId: checkoutAddress.id || checkoutAddress._id || "",
          address: checkoutAddress,
          paymentMethod,
          subtotal: latestTotals.subtotal,
          vatAmount: latestTotals.vatAmount,
          shippingFee: latestTotals.shippingFee,
          total: latestTotals.total,
          paymentReturnTarget: "mobile",
          idempotencyKey: orderRequestKeyRef.current,
        }),
        new Promise((_, reject) =>
          setTimeout(() => {
            const timeout = new Error(
              "Connection timed out. Check My Orders before trying again; your order may still be processing.",
            );
            timeout.code = "PAYMENT_CONNECTION_TIMEOUT";
            reject(timeout);
          }, PAYMENT_CONNECTION_TIMEOUT_MS),
        ),
      ]);
      if (!result.success) {
        if (result.code === "ORDER_PAYMENT_RETRY_REQUIRED" && result.orderId) {
          clearCart();
          orderRequestKeyRef.current = "";
          await clearCheckoutIdempotencyKey();
          router.replace(`/customer/order-confirmation/${result.orderId}?payment=returned`);
          return;
        }
        if (result.code === "ORDER_CHECKOUT_FAILED") {
          orderRequestKeyRef.current = "";
          await clearCheckoutIdempotencyKey();
        }
        const error = new Error(result.error);
        error.status = result.status;
        throw error;
      }

      const orderId = result.order?.id || result.order?._id;
      if (!orderId) throw new Error("The order was created without an order reference. Please check My Orders before trying again.");
      const checkoutUrl =
        result.payment?.checkoutUrl ||
        result.order?.paymentUrl ||
        result.order?.paymongo?.checkoutUrl;

      if (paymentMethod !== "cod") {
        if (!checkoutUrl) {
          throw new Error("A secure payment link was not provided. Your cart is still available—please try again shortly.");
        }
        setCheckoutMessage("Connecting to secure payment…");
        const canOpenCheckout = await Linking.canOpenURL(checkoutUrl);
        if (!canOpenCheckout) {
          throw new Error("This device could not open the secure payment link. Your cart is still available—please try again or use another payment method.");
        }
        await Linking.openURL(checkoutUrl);
      }

      clearCart();
      orderRequestKeyRef.current = "";
      await clearCheckoutIdempotencyKey();
      router.replace(`/customer/order-confirmation/${orderId}${paymentMethod !== "cod" ? "?payment=returned" : ""}`);
    } catch (error) {
      Alert.alert(
        error?.code === "PAYMENT_CONNECTION_TIMEOUT"
          ? t("Connection timed out")
          : t("Payment connection failed"),
        t(error?.message || "Unable to connect to secure payment."),
      );
    }
    } finally {
      submissionInFlightRef.current = false;
      setSubmitting(false);
      setCheckoutMessage("");
    }
  };

  return (
    <>
      <BoutiqueHeader title={t("Checkout")} subtitle={t("Review and place your order")} onBack={() => { if (!submissionInFlightRef.current) router.back(); }} />
      <BoutiqueScreen>
        {cart.length === 0 ? (
          <BoutiqueCard style={{ gap: BQ_SPACING.md }}>
            <BoutiqueText variant="h2">{t("Your cart is empty")}</BoutiqueText>
            <BoutiqueButton title={t("Browse products")} onPress={() => router.replace("/customer/shop")} />
          </BoutiqueCard>
        ) : (
          <>
            <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: BQ_SPACING.sm }}>
                <BoutiqueText variant="h3">{t("Delivery address")}</BoutiqueText>
                <BoutiqueButton title={showAddressChoices ? t("Done") : t("Change")} size="sm" variant="outline" disabled={submitting} onPress={() => setShowAddressChoices((value) => !value)} />
              </View>
              {showAddressChoices ? (
                <View style={{ gap: BQ_SPACING.xs }}>
                  {savedAddresses.length ? savedAddresses.map((item) => {
                    const id = String(item.id || item._id || "");
                    const selected = String(address.id || address._id || "") === id;
                    return (
                      <TouchableOpacity
                        key={id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        disabled={submitting}
                        accessibilityLabel={`${item.label || t("Saved address")}: ${[item.street, item.barangay, item.city, item.province].filter(Boolean).join(", ")}`}
                        onPress={() => { if (submissionInFlightRef.current) return; setSelectedAddressId(id); setShowAddressChoices(false); orderRequestKeyRef.current = ""; }}
                        style={{ padding: BQ_SPACING.sm, borderWidth: 1, borderColor: selected ? BQ_COLORS.brand : BQ_COLORS.border, borderRadius: 10, gap: BQ_SPACING.xs }}
                      >
                        <BoutiqueText variant="label">{item.label || t("Saved address")}{item.isDefault ? ` · ${t("Account default")}` : ""}{selected ? ` · ${t("Selected for this order")}` : ""}</BoutiqueText>
                        <BoutiqueText color={BQ_COLORS.inkMuted}>{[item.street, item.barangay, item.city, item.province, item.postalCode].filter(Boolean).join(", ")}</BoutiqueText>
                      </TouchableOpacity>
                    );
                  }) : <BoutiqueText color={BQ_COLORS.inkMuted}>{t("No saved addresses yet. Add one in Account settings.")}</BoutiqueText>}
                  <BoutiqueButton title={t("Manage saved addresses")} size="sm" variant="outline" disabled={submitting} onPress={() => router.push("/customer/settings")} />
                </View>
              ) : null}
              <BoutiqueText color={BQ_COLORS.inkMuted}>
                {[address.street, address.barangay, address.city, address.province, address.postalCode].filter(Boolean).join(", ") || current?.address || t("No saved address")}
              </BoutiqueText>
              <BoutiqueText variant="caption" color={addressIssue || !inventoryBranch ? BQ_COLORS.danger : BQ_COLORS.success}>
                {addressIssue
                  ? `${t("Address needs review")}: ${localizeIssue(addressIssue)}`
                  : inventoryBranch
                    ? `${t("Assigned branch")}: ${inventoryBranch}`
                    : t("Choose a delivery address within a configured service area.")}
              </BoutiqueText>
            </BoutiqueCard>

            <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
              <TouchableOpacity onPress={() => setShowOrderDetails((value) => !value)} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={showOrderDetails ? t("Hide order details") : t("View order details")} accessibilityState={{ expanded: showOrderDetails }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <BoutiqueText variant="h3">{t("Order summary")}</BoutiqueText>
                  <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{cart.reduce((count, item) => count + Number(item.quantity || 0), 0)} {t("item(s)")}</BoutiqueText>
                </View>
                <BoutiqueText variant="label" color={BQ_COLORS.brand}>{showOrderDetails ? t("Hide details") : t("View details")}</BoutiqueText>
              </TouchableOpacity>
              {showOrderDetails ? cart.map((item) => {
                const branchStock = branchStockById[String(item.id)];
                  const maximumQuantity = Number.isFinite(branchStock)
                    ? branchStock
                    : Number(item.stock ?? 99);
                return (
                <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: BQ_SPACING.sm, paddingBottom: BQ_SPACING.sm, borderBottomWidth: 1, borderBottomColor: BQ_COLORS.border }}>
                  <View style={{ flex: 1 }}>
                    <BoutiqueText variant="label">{item.name}</BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{t("Model")}: {formatCartModel(item)}</BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{t("Horsepower")}: {t(formatHorsepower(item))}</BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{item.quantity} × {formatPeso(item.price)}</BoutiqueText>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: BQ_SPACING.sm, gap: BQ_SPACING.sm }}>
                      <BoutiqueQuantityStepper value={item.quantity} max={maximumQuantity} disabled={submitting} onChange={(quantity) => { if (!submissionInFlightRef.current) updateQuantity(item.id, quantity); }} />
                      <TouchableOpacity disabled={submitting} onPress={() => { if (!submissionInFlightRef.current) removeFromCart(item.id); }} accessibilityRole="button" accessibilityState={{ disabled: submitting }} accessibilityLabel={`${t("Remove")} ${item.name} ${t("from order")}`}>
                        <BoutiqueText variant="caption" color={BQ_COLORS.danger} style={{ fontWeight: "800" }}>{t("Remove")}</BoutiqueText>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <BoutiqueText variant="label">{formatPeso(item.quantity * item.price)}</BoutiqueText>
                </View>
              );
              }) : null}
            </BoutiqueCard>

            {stockIssues.length ? (
              <BoutiqueCard style={{ gap: BQ_SPACING.xs, borderWidth: 1, borderColor: BQ_COLORS.danger, backgroundColor: "#fff7f7" }}>
                <BoutiqueText variant="h3" color={BQ_COLORS.danger}>
                  {stockIssues.some((issue) => issue.code === "invalid_quantity")
                    ? t("Each cart quantity must be a positive whole number.")
                    : stockIssues.some((issue) => issue.code === "out_of_stock")
                      ? t("This branch currently has no stock of this item")
                      : t("This branch does not have enough stock for the requested quantity")}
                </BoutiqueText>
                <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{t("Remove the unavailable item or reduce its quantity to continue.")}</BoutiqueText>
              </BoutiqueCard>
            ) : null}

            <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
              <BoutiqueText variant="h3">{t("Payment method")}</BoutiqueText>
              <BoutiqueSegmented value={paymentMethod} disabled={submitting} onChange={(value) => { if (!submissionInFlightRef.current) setPaymentMethod(value); }} options={[
                { value: "card", label: t("Card") },
                { value: "gcash", label: "GCash" },
                { value: "maya", label: "Maya" },
                { value: "cod", label: t("Cash on delivery") },
              ]} />
            </BoutiqueCard>

            <BoutiqueCard style={{ gap: BQ_SPACING.xs }}>
              <BoutiqueText variant="h3">{t("Price details")}</BoutiqueText>
              {[
                [t("Items subtotal"), checkoutTotals.subtotal],
                [t("VAT"), checkoutTotals.vatAmount],
                [t("Delivery fee"), checkoutTotals.shippingFee],
              ].map(([label, amount]) => <View key={label} style={{ flexDirection: "row", justifyContent: "space-between" }}><BoutiqueText color={BQ_COLORS.inkMuted}>{label}</BoutiqueText><BoutiqueText>{formatPeso(amount)}</BoutiqueText></View>)}
              <View style={{ borderTopWidth: 1, borderTopColor: BQ_COLORS.border, marginTop: BQ_SPACING.sm, paddingTop: BQ_SPACING.sm, flexDirection: "row", justifyContent: "space-between" }}>
                <BoutiqueText variant="h2">{t("Final total")}</BoutiqueText><BoutiqueText variant="h2">{formatPeso(checkoutTotals.total)}</BoutiqueText>
              </View>
            </BoutiqueCard>

            <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
              {checkoutMessage ? <BoutiqueText align="center" color={BQ_COLORS.inkMuted}>{t(checkoutMessage)}</BoutiqueText> : null}
              <BoutiqueButton title={submitting ? (paymentMethod === "cod" ? t("Submitting order...") : t("Connecting...")) : paymentMethod === "cod" ? t("Place order") : t("Continue to payment")} disabled={submitting || Boolean(addressIssue) || !inventoryBranch || stockIssues.length > 0} fullWidth onPress={() => void submitOrder()} />
            </BoutiqueCard>
          </>
        )}
      </BoutiqueScreen>
    </>
  );
}
