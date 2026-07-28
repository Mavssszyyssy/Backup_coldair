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
import { formatPeso } from "../../services/ecommerceService";

const getDefaultAddress = (user = {}) =>
  user?.addresses?.find((item) => item?.isDefault) ||
  user?.addresses?.[0] ||
  {};

export default function CheckoutScreen() {
  const router = useRouter();
  const { cart, cartTotal, clearCart } = useCart();
  const { current, token } = useUserContext();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [submitting, setSubmitting] = useState(false);
  const address = useMemo(() => getDefaultAddress(current), [current]);

  const submitOrder = async () => {
    if (!cart.length) return Alert.alert("Cart is empty", "Add an item before checking out.");
    if (!token) return Alert.alert("Sign in required", "Please sign in again before checking out.");

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
    if (
      !checkoutAddress?.id &&
      !checkoutAddress?._id &&
      !checkoutUser?.address
    ) {
      return Alert.alert("Address required", "Add a delivery address in Settings before checking out.");
    }

    setSubmitting(true);
    try {
      const result = await createOrder(token, {
        items: cart.map((item) => ({
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
        subtotal: cartTotal,
        total: cartTotal,
        paymentReturnTarget: "mobile",
      });
      if (!result.success) throw new Error(result.error);

      clearCart();
      const orderId = result.order?.id || result.order?._id;
      const checkoutUrl =
        result.payment?.checkoutUrl ||
        result.order?.paymentUrl ||
        result.order?.paymongo?.checkoutUrl;
      if (checkoutUrl) await Linking.openURL(checkoutUrl);
      router.replace(`/customer/order-confirmation/${orderId}`);
    } catch (error) {
      Alert.alert("Checkout unavailable", error?.message || "Unable to create the order.");
    } finally {
      setSubmitting(false);
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
            <BoutiqueButton title={submitting ? "Creating order..." : "Place order"} disabled={submitting} fullWidth onPress={submitOrder} />
          </>
        )}
      </BoutiqueScreen>
    </>
  );
}
