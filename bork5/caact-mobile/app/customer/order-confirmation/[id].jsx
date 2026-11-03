import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BoutiqueButton, BoutiqueCard, BoutiqueHeader, BoutiqueScreen, BoutiqueText, BQ_COLORS, BQ_SPACING } from "../../../components/boutique";
import { getOrderById, retryOrderPayment, verifyOrderPayment } from "../../../services/orderStorage";
import { paymentOutcome } from "../../../services/paymentOutcome";
import { formatOrderDeliveryAddress, getOrderRecipient, getPaymentRetryState, orderPaymentMethodLabel } from "../../../services/orderStatusService";
import { subscribeBackendRecovery } from "../../../services/backendConnectionState";
import { useInterfaceLanguage } from "../../../hooks/useInterfaceLanguage";
import { formatPeso } from "../../../services/ecommerceService";

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const { t } = useInterfaceLanguage();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const payment = Array.isArray(params.payment) ? params.payment[0] : params.payment;
  const [order, setOrder] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [paying, setPaying] = useState(false);
  const paymentInFlightRef = useRef(false);

  useEffect(() => {
    let active = true;
    let request = 0;
    const check = async () => {
      const currentRequest = ++request;
      setChecking(true);
      setError(false);
      try {
        let next = await getOrderById(id);
        // The local order cache and callback URL cannot confirm a charge.
        if (payment || next?.paymentProvider === "paymongo" || ["gcash", "card", "maya"].includes(next?.paymentMethod)) {
          next = await verifyOrderPayment(id);
        }
        if (!next) throw new Error("Order could not be verified");
        if (active && request === currentRequest) setOrder(next);
      } catch (_error) {
        if (active && request === currentRequest) setError(true);
      } finally {
        if (active && request === currentRequest) setChecking(false);
      }
    };
    check();
    // Opening the external browser is not success. Verify again on return,
    // including closing the browser without a callback link.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    const unsubscribeRecovery = subscribeBackendRecovery(check);
    return () => {
      active = false;
      subscription.remove();
      unsubscribeRecovery();
    };
  }, [id, payment, refresh]);

  const outcome = paymentOutcome(order, payment, { checking, error });
  const failed = outcome.kind === "failed";
  const paid = outcome.kind === "paid";
  const paymentStatusLabel = String(order?.paymentMethod || "").toLowerCase() === "cod"
    ? "Payment due on delivery"
    : ({ paid: "Paid", pending: "Pending", failed: "Failed", cancelled: "Cancelled", expired: "Expired" }[String(order?.paymentStatus || "").toLowerCase()] || "Pending");
  const color = failed ? "#dc2626" : paid ? "#047857" : BQ_COLORS.brand;
  const { eligible: canRetry, limitReached: retryLimitReached, resuming } = getPaymentRetryState(order || {});

  const handlePayAgain = async () => {
    if (!order?.id || !canRetry || paymentInFlightRef.current) return;
    paymentInFlightRef.current = true;
    setPaying(true);
    try {
      const checkoutUrl = await retryOrderPayment(order.id);
      if (!checkoutUrl || !(await Linking.canOpenURL(checkoutUrl))) {
        throw new Error("A secure GCash payment link was not returned.");
      }
      await Linking.openURL(checkoutUrl);
      router.replace(`/customer/order-confirmation/${order.id}?payment=returned`);
    } catch (paymentError) {
      Alert.alert(t("Unable to open payment"), t(paymentError?.message || "Please try again."));
    } finally {
      paymentInFlightRef.current = false;
      setPaying(false);
    }
  };
  return (
    <>
      <BoutiqueHeader title={t("Order payment")} onBack={() => router.replace("/customer/orders")} />
      <BoutiqueScreen>
        <BoutiqueCard style={{ gap: BQ_SPACING.md, alignItems: "center" }}>
          <View style={{ padding: 18, borderRadius: 48, backgroundColor: failed ? "#fef2f2" : paid ? "#ecfdf5" : "#eff6ff" }}>
            <Ionicons name={failed || error ? "alert-circle-outline" : paid ? "checkmark-circle-outline" : "time-outline"} size={44} color={color} />
          </View>
          <BoutiqueText variant="h1" align="center" color={color}>{t(outcome.title)}</BoutiqueText>
          <BoutiqueText align="center" color={BQ_COLORS.inkMuted}>{t(outcome.body)}</BoutiqueText>
          <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{t("Order")}: {order?.orderCode || id}</BoutiqueText>
          {!paid && outcome.kind !== "received" ? (
            <BoutiqueButton title={checking ? t("Checking…") : t("Check payment status")} disabled={checking} onPress={() => setRefresh((value) => value + 1)} />
          ) : null}
          {retryLimitReached ? (
            <BoutiqueText align="center" color="#dc2626" weight={700}>
              {t("Maximum payment attempts reached. You can no longer retry payment for this order.")}
            </BoutiqueText>
          ) : canRetry ? (
            <BoutiqueButton
              title={paying ? t("Connecting…") : resuming ? t("Complete payment") : t("Pay Again")}
              loading={paying}
              disabled={paying || checking}
              onPress={handlePayAgain}
            />
          ) : null}
          <BoutiqueButton title={t("View my orders")} variant="outline" onPress={() => router.replace("/customer/orders")} />
        </BoutiqueCard>
        {order ? (
          <BoutiqueCard style={{ gap: BQ_SPACING.sm }}>
            <BoutiqueText variant="h2">{t("Order details")}</BoutiqueText>
            <BoutiqueText variant="label">{t("Recipient")}</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted}>{Object.values(getOrderRecipient(order)).filter(Boolean).join("\n") || t("Not available")}</BoutiqueText>
            <BoutiqueText variant="label">{t("Delivery address")}</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted}>{formatOrderDeliveryAddress(order) || t("Not available")}</BoutiqueText>
            <BoutiqueText variant="label">{t("Payment method")}</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted}>{t(orderPaymentMethodLabel(order))}</BoutiqueText>
            <BoutiqueText variant="label">{t("Payment status")}</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted}>{t(paymentStatusLabel)}</BoutiqueText>
            <BoutiqueText variant="label">{t("Amount")}</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted}>{formatPeso(order.total)}</BoutiqueText>
          </BoutiqueCard>
        ) : null}
      </BoutiqueScreen>
    </>
  );
}
