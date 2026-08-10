import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, View } from "react-native";

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
import { fetchShopProducts, formatPeso } from "../../services/ecommerceService";

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

export default function CheckoutScreen() {
  const router = useRouter();
  const { cart, cartTotal, clearCart, replaceCart } = useCart();
  const { current, token } = useUserContext();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const address = useMemo(() => getDefaultAddress(current), [current]);

  const submitOrder = async () => {
    if (!cart.length) return Alert.alert("Cart is empty", "Add an item before checking out.");
    if (!token) return Alert.alert("Sign in required", "Please sign in again before checking out.");

    setSubmitting(true);
    setCheckoutMessage("Checking the latest stock and prices…");

    // Cart contents can persist between app updates. Resolve every line back
    // to the active catalogue before checkout so placeholder or stale IDs
    // cannot make COD or PayMongo appear to do nothing.
    let checkoutCart = cart;
    try {
      const catalogue = await fetchShopProducts();
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
    if (!checkoutAddress?.street || !checkoutAddress?.phone) {
      setSubmitting(false);
      setCheckoutMessage("");
      return Alert.alert("Address required", "Add a delivery address in Settings before checking out.");
    }

    const checkoutTotal = checkoutCart.reduce(
      (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );
    setCheckoutMessage(
      paymentMethod === "cod"
        ? "Creating your cash-on-delivery order…"
        : "Creating your secure PayMongo checkout…",
    );
    try {
      const result = await createOrder(token, {
        items: checkoutCart.map((item) => ({
          productId: item.id,
          sku: item.sku || "",
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          specs: item.specs || "",
        })),
        addressId: checkoutAddress.id || checkoutAddress._id || "",
        address: checkoutAddress,
        paymentMethod,
        subtotal: checkoutTotal,
        total: checkoutTotal,
        paymentReturnTarget: "mobile",
      });
      if (!result.success) throw new Error(result.error);

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
        setCheckoutMessage("Opening secure PayMongo payment…");
        const canOpenCheckout = await Linking.canOpenURL(checkoutUrl);
        if (!canOpenCheckout) {
          throw new Error("This device could not open the PayMongo payment link. Your cart is still available—please try again or use another payment method.");
        }
        await Linking.openURL(checkoutUrl);
      }

      clearCart();
      router.replace(`/customer/order-confirmation/${orderId}`);
    } catch (error) {
      Alert.alert("Checkout unavailable", error?.message || "Unable to create the order.");
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
            <BoutiqueCard style={{ gap: BQ_SPACING.md }}>
              {cart.map((item) => (
                <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: BQ_SPACING.md }}>
                  <View style={{ flex: 1 }}>
                    <BoutiqueText variant="h3">{item.name}</BoutiqueText>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
                      {item.quantity} x {formatPeso(item.price)}
                    </BoutiqueText>
                  </View>
                  <BoutiqueText variant="label">{formatPeso(item.quantity * item.price)}</BoutiqueText>
                </View>
              ))}
              <View style={{ borderTopWidth: 1, borderTopColor: BQ_COLORS.border, paddingTop: BQ_SPACING.md, flexDirection: "row", justifyContent: "space-between" }}>
                <BoutiqueText variant="h2">Total</BoutiqueText>
                <BoutiqueText variant="h2">{formatPeso(cartTotal)}</BoutiqueText>
              </View>
            </BoutiqueCard>
            <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
              <BoutiqueText variant="h3">Payment method</BoutiqueText>
              <BoutiqueSegmented
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  { value: "card", label: "PayMongo Card" },
                  { value: "gcash", label: "GCash" },
                  { value: "maya", label: "Maya" },
                  { value: "cod", label: "Cash on delivery" },
                ]}
              />
            </BoutiqueCard>
            <BoutiqueCard style={{ gap: BQ_SPACING.xs }}>
              <BoutiqueText variant="h3">Delivery address</BoutiqueText>
              <BoutiqueText color={BQ_COLORS.inkMuted}>
                {[address.street, address.barangay, address.city, address.province].filter(Boolean).join(", ") || current?.address || "No saved address"}
              </BoutiqueText>
            </BoutiqueCard>
            {checkoutMessage ? (
              <BoutiqueText align="center" color={BQ_COLORS.inkMuted}>
                {checkoutMessage}
              </BoutiqueText>
            ) : null}
            <BoutiqueButton
              title={submitting ? "Creating order..." : "Place order"}
              disabled={submitting}
              fullWidth
              onPress={() => void submitOrder()}
            />
          </>
        )}
      </BoutiqueScreen>
    </>
  );
}
