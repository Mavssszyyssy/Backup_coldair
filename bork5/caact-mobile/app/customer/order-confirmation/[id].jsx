import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BoutiqueButton, BoutiqueCard, BoutiqueHeader, BoutiqueScreen, BoutiqueText, BQ_COLORS, BQ_SPACING } from "../../../components/boutique";
import { getOrderById, verifyOrderPayment } from "../../../services/orderStorage";

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const { id, payment } = useLocalSearchParams();
  const isCancelled = payment === "cancelled";
  const [order, setOrder] = useState(null);
  const [checking, setChecking] = useState(Boolean(payment === "success"));

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let next = await getOrderById(id);
        if (
          payment === "success" &&
          next?.paymentProvider === "paymongo" &&
          next?.paymentStatus !== "paid"
        ) {
          next = (await verifyOrderPayment(id)) || next;
        }
        if (active) setOrder(next);
      } catch (_error) {
        // The orders screen will retry from the backend; do not mark a
        // payment as successful when verification is unavailable.
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, payment]);

  const paymentStatus = String(order?.paymentStatus || "").toLowerCase();
  const paymentFailed = ["failed", "expired"].includes(paymentStatus);
  const paymentCancelled = isCancelled || paymentStatus === "cancelled";
  const paymentPending = order
    ? order?.paymentProvider === "paymongo" &&
      !paymentFailed &&
      !paymentCancelled &&
      paymentStatus !== "paid"
    : payment === "success";
  const title = paymentCancelled
    ? "Payment cancelled"
    : paymentFailed
      ? "Payment failed"
      : paymentPending
        ? "Payment pending"
        : "Order received";
  const body = paymentCancelled
    ? "You can reopen the order and try payment again."
    : paymentFailed
      ? "PayMongo could not confirm this payment. Please try again from My Orders."
      : paymentPending
        ? "Your order is saved. Coldair will move it forward only after PayMongo confirms the payment."
        : "Your payment was confirmed and your order is now being processed.";
  return <><BoutiqueHeader title={title} onBack={() => router.replace("/customer/orders")} /><BoutiqueScreen><BoutiqueCard style={{ gap: BQ_SPACING.md, alignItems: "center" }}><BoutiqueText variant="h1" align="center">{checking ? "Checking payment…" : paymentCancelled ? "Payment not completed" : paymentFailed ? "Payment failed" : paymentPending ? "Payment pending" : "Thank you"}</BoutiqueText><BoutiqueText align="center" color={BQ_COLORS.inkMuted}>{body}</BoutiqueText><BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>Order: {id}</BoutiqueText><BoutiqueButton title="View my orders" onPress={() => router.replace("/customer/orders")} /></BoutiqueCard></BoutiqueScreen></>;
}
