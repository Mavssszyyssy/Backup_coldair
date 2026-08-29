import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  BoutiqueButton,
  BoutiqueCard,
  BoutiqueHeader,
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

const getProfileAddress = (user = {}) => {
  const billing = user?.billingAddress || user?.billing_address || {};
  const location = user?.location?.address || {};
  const street =
    [
      user?.apartment_unit || user?.apartmentUnit,
      user?.property_block_lot || user?.propertyBlockLot,
      user?.thoroughfare,
    ]
      .filter(Boolean)
      .join(", ") ||
    billing.street ||
    location.street ||
    user?.address ||
    "";

  return {
    name: user?.name || [user?.name_first, user?.name_last].filter(Boolean).join(" "),
    phone: user?.phone || "",
    street,
    barangay: user?.submunicipality || billing.barangay || location.barangay || "",
    city: user?.municipality || billing.city || location.city || "",
    province: billing.province || location.province || "",
    region: billing.region || location.region || "",
    postalCode: location.postalCode || billing.postalCode || "",
    isDefault: true,
  };
};

const getDefaultAddress = (user = {}) =>
  user?.addresses?.find((item) => item?.isDefault) ||
  user?.addresses?.[0] ||
  getProfileAddress(user);

const DELIVERY_FEE_BY_BRANCH = {
  Bulacan: 380,
  Cavite: 350,
  Laguna: 400,
  Bataan: 420,
  Pangasinan: 550,
  Ilocos: 600,
};

const PAYMENT_CONNECTION_TIMEOUT_MS = 30000;
const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = "aeropulse_mobile_checkout_idempotency_v1";
const CHECKOUT_IDEMPOTENCY_TTL_MS = 30 * 60 * 1000;

const formatHorsepower = (item = {}) => {
  const parsed = Number(item.horsepower || String(item.specs || "").match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
  return parsed > 0 ? `${parsed} HP` : "Not specified";
};

const checkoutFingerprint = ({ cartItems = [], address = {}, paymentMethod = "" }) =>
  JSON.stringify({
    paymentMethod: String(paymentMethod || "").toLowerCase(),
    addressId: String(address.id || address._id || ""),
    address: [address.street, address.barangay, address.city, address.province, address.postalCode]
      .map((value) => String(value || "").trim().toLowerCase()),
    items: cartItems
      .map((item) => ({
        id: String(item.id || item.productId || item.sku || ""),
        quantity: Number(item.quantity || 0),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });

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
  const { cart, clearCart, replaceCart } = useCart();
  const { current, token } = useUserContext();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [inventoryBranch, setInventoryBranch] = useState("");
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const orderRequestKeyRef = useRef("");
  const address = useMemo(() => getDefaultAddress(current), [current]);
  const addressIssue = useMemo(() => {
    const missingField = ["region", "province", "city", "barangay", "street"]
      .some((field) => !String(address?.[field] || "").trim());
    if (missingField) return "Complete the region, province, city, barangay, and street address.";
    const phoneError = address?.phone ? validatePhone(address.phone) : "Phone number is required.";
    return phoneError || validatePostalCodeForAddress(address);
  }, [address]);
  const checkoutTotals = useMemo(() => calculateCheckoutTotals(cart, inventoryBranch), [cart, inventoryBranch]);

  useEffect(() => {
    let active = true;
    resolveConfiguredInventoryBranch(address)
      .then((branch) => { if (active) setInventoryBranch(branch); })
      .catch(() => { if (active) setInventoryBranch(""); });
    return () => { active = false; };
  }, [address]);

  const submitOrder = async () => {
    if (submitting) return;
    if (!cart.length) return Alert.alert("Cart is empty", "Add an item before checking out.");
    if (!token) return Alert.alert("Sign in required", "Please sign in again before checking out.");

    setSubmitting(true);
    setCheckoutMessage("Checking the latest stock and prices…");

    // Cart contents can persist between app updates. Resolve every line back
    // to the active catalogue before checkout so placeholder or stale IDs
    // cannot make COD or PayMongo appear to do nothing.
    let checkoutCart = cart;
    let liveBranch = "";
    try {
      liveBranch = await resolveConfiguredInventoryBranch(getDefaultAddress(current));
      if (!liveBranch) {
        throw new Error("This delivery address is outside the current service areas. Choose another address before checkout.");
      }
      setInventoryBranch(liveBranch);
      const catalogue = await fetchShopProducts(
        liveBranch,
      );
      const activeItems = cart
        .map((cartItem) => {
          const product = catalogue.find(
            (candidate) =>
              String(candidate.id) === String(cartItem.id) ||
              (cartItem.sku && String(candidate.sku) === String(cartItem.sku)),
          );
          if (!product || !product.inStock) return null;
          return {
            ...product,
            quantity: Math.min(
              Math.max(1, Number(cartItem.quantity || 1)),
              Math.max(1, Number(product.stock || 1)),
            ),
          };
        })
        .filter(Boolean);

      if (activeItems.length !== cart.length) {
        replaceCart(activeItems);
        throw new Error(
          "One or more older cart items are no longer available. Your cart was updated to the active catalogue; please review it and place the order again.",
        );
      }
      checkoutCart = activeItems;
      replaceCart(activeItems);
    } catch (error) {
      setSubmitting(false);
      setCheckoutMessage("");
      Alert.alert("Review your cart", error?.message || "Unable to verify the current catalogue.");
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
    const checkoutAddress = getDefaultAddress(checkoutUser);
    const missingAddressField = ["region", "province", "city", "barangay", "street"]
      .some((field) => !String(checkoutAddress?.[field] || "").trim());
    const phoneError = checkoutAddress?.phone ? validatePhone(checkoutAddress.phone) : "Phone number is required.";
    const postalCodeError = validatePostalCodeForAddress(checkoutAddress);
    if (missingAddressField || phoneError || postalCodeError) {
      setSubmitting(false);
      setCheckoutMessage("");
      return Alert.alert(
        "Complete delivery address",
        phoneError || postalCodeError || "Choose Region, Province, City/Municipality, Barangay, and Street in Settings before checking out.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => router.push("/customer/settings") },
        ],
      );
    }

    const latestBranch = await resolveConfiguredInventoryBranch(checkoutAddress);
    if (!latestBranch) {
      setSubmitting(false);
      setCheckoutMessage("");
      return Alert.alert("Address not serviceable", "This delivery address is outside the current service areas. Choose another address before checkout.");
    }
    setInventoryBranch(latestBranch);
    const latestTotals = calculateCheckoutTotals(checkoutCart, latestBranch);
    if (!orderRequestKeyRef.current) {
      orderRequestKeyRef.current = await getCheckoutIdempotencyKey(
        checkoutFingerprint({ cartItems: checkoutCart, address: checkoutAddress, paymentMethod }),
      );
    }
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
          throw new Error("PayMongo did not provide a payment link. Your cart is still available—please try again shortly.");
        }
        setCheckoutMessage("Connecting to secure payment…");
        const canOpenCheckout = await Linking.canOpenURL(checkoutUrl);
        if (!canOpenCheckout) {
          throw new Error("This device could not open the PayMongo payment link. Your cart is still available—please try again or use another payment method.");
        }
        await Linking.openURL(checkoutUrl);
      }

      clearCart();
      orderRequestKeyRef.current = "";
      await clearCheckoutIdempotencyKey();
      router.replace(`/customer/order-confirmation/${orderId}`);
    } catch (error) {
      Alert.alert(
        error?.code === "PAYMENT_CONNECTION_TIMEOUT"
          ? "Connection timed out"
          : "Payment connection failed",
        error?.message || "Unable to connect to secure payment.",
      );
    } finally {
      setSubmitting(false);
      setCheckoutMessage("");
    }
  };

  return (
    <>
      <BoutiqueHeader title="Checkout" subtitle="Review and place your order" onBack={() => router.back()} />
      <BoutiqueScreen>
        {cart.length === 0 ? (
          <BoutiqueCard style={{ gap: BQ_SPACING.md }}>
            <BoutiqueText variant="h2">Your cart is empty</BoutiqueText>
            <BoutiqueButton title="Browse products" onPress={() => router.replace("/customer/shop")} />
          </BoutiqueCard>
        ) : (
          <>
            <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: BQ_SPACING.sm }}>
                <BoutiqueText variant="h3">Delivery address</BoutiqueText>
                <BoutiqueButton title="Change" size="sm" variant="outline" onPress={() => router.push("/customer/settings")} />
              </View>
              <BoutiqueText color={BQ_COLORS.inkMuted}>
                {[address.street, address.barangay, address.city, address.province].filter(Boolean).join(", ") || current?.address || "No saved address"}
              </BoutiqueText>
              <BoutiqueText variant="caption" color={addressIssue || !inventoryBranch ? BQ_COLORS.danger : BQ_COLORS.success}>
                {addressIssue
                  ? `Address needs review: ${addressIssue}`
                  : inventoryBranch
                    ? `Assigned branch: ${inventoryBranch}`
                    : "Choose a delivery address within a configured service area."}
              </BoutiqueText>
            </BoutiqueCard>

            <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
              <TouchableOpacity onPress={() => setShowOrderDetails((value) => !value)} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={showOrderDetails ? "Hide order details" : "View order details"} accessibilityState={{ expanded: showOrderDetails }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <BoutiqueText variant="h3">Order summary</BoutiqueText>
                  <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{cart.reduce((count, item) => count + Number(item.quantity || 0), 0)} item(s)</BoutiqueText>
                </View>
                <BoutiqueText variant="label" color={BQ_COLORS.brand}>{showOrderDetails ? "Hide details" : "View details"}</BoutiqueText>
              </TouchableOpacity>
              {showOrderDetails ? cart.map((item) => (
                <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: BQ_SPACING.sm }}>
                  <View style={{ flex: 1 }}>
                    <BoutiqueText variant="label">{item.name}</BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>Model: {formatCartModel(item)}</BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>Horsepower: {formatHorsepower(item)}</BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{item.quantity} × {formatPeso(item.price)}</BoutiqueText>
                  </View>
                  <BoutiqueText variant="label">{formatPeso(item.quantity * item.price)}</BoutiqueText>
                </View>
              )) : null}
            </BoutiqueCard>

            <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
              <BoutiqueText variant="h3">Payment method</BoutiqueText>
              <BoutiqueSegmented value={paymentMethod} onChange={setPaymentMethod} options={[
                { value: "card", label: "Card" },
                { value: "gcash", label: "GCash" },
                { value: "maya", label: "Maya" },
                { value: "cod", label: "Cash on delivery" },
              ]} />
            </BoutiqueCard>

            <BoutiqueCard style={{ gap: BQ_SPACING.xs }}>
              <BoutiqueText variant="h3">Price details</BoutiqueText>
              {[
                ["Items subtotal", checkoutTotals.subtotal],
                ["VAT", checkoutTotals.vatAmount],
                ["Delivery fee", checkoutTotals.shippingFee],
              ].map(([label, amount]) => <View key={label} style={{ flexDirection: "row", justifyContent: "space-between" }}><BoutiqueText color={BQ_COLORS.inkMuted}>{label}</BoutiqueText><BoutiqueText>{formatPeso(amount)}</BoutiqueText></View>)}
              <View style={{ borderTopWidth: 1, borderTopColor: BQ_COLORS.border, marginTop: BQ_SPACING.sm, paddingTop: BQ_SPACING.sm, flexDirection: "row", justifyContent: "space-between" }}>
                <BoutiqueText variant="h2">Final total</BoutiqueText><BoutiqueText variant="h2">{formatPeso(checkoutTotals.total)}</BoutiqueText>
              </View>
            </BoutiqueCard>

            <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
              {checkoutMessage ? <BoutiqueText align="center" color={BQ_COLORS.inkMuted}>{checkoutMessage}</BoutiqueText> : null}
              <BoutiqueButton title={submitting ? (paymentMethod === "cod" ? "Submitting order..." : "Connecting...") : paymentMethod === "cod" ? "Place order" : "Continue to payment"} disabled={submitting || Boolean(addressIssue) || !inventoryBranch} fullWidth onPress={() => void submitOrder()} />
            </BoutiqueCard>
          </>
        )}
      </BoutiqueScreen>
    </>
  );
}
