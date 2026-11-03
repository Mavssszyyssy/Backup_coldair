import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { startLiveRefresh } from "../../services/liveRefresh";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, View } from "react-native";

import {
  BoutiqueButton,
  BoutiqueCard,
  BoutiqueChip,
  BoutiqueHeader,
  BoutiqueScreen,
  BoutiqueText,
  BQ_COLORS,
  BQ_SPACING,
} from "../../components/boutique";
import { formatCartModel } from "../../services/cartDisplayService";
import { formatPeso } from "../../services/ecommerceService";
import { getOrderById, getOrderPage, requestOrderCancellation, retryOrderPayment } from "../../services/orderStorage";
import { formatOrderDeliveryAddress, getOrderRecipient, getPaymentRetryState, orderPaymentMethodLabel, resolveOrderTimelineEndState } from "../../services/orderStatusService";
import { confirmAction } from "../../utils/confirmAction";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

function orderStatusVariant(order = {}) {
  const workflow = String(order.workflowStatus || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();
  if (workflow === "complete") return "success";
  if (workflow === "cancelled") return "danger";
  if (["to_deliver", "to_dispatch", "to_install"].includes(workflow)) return "blue";
  if (workflow) return "warning";
  if (["completed", "released", "delivered"].includes(status)) return "success";
  if (["cancelled", "rejected"].includes(status)) return "danger";
  if (["approved", "paid", "processing", "dispatched"].includes(status)) return "blue";
  return "warning";
}

function paymentStatusVariant(order = {}) {
  if (String(order.paymentMethod || "").toLowerCase() === "cod") {
    return order.codCollection?.collectedAt ? "success" : "warning";
  }
  const status = String(order.paymentStatus || "").toLowerCase();
  if (["paid", "verified"].includes(status)) return "success";
  if (["failed", "cancelled", "expired"].includes(status)) return "danger";
  return "warning";
}

function refundStatusLabel(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return "Refund completed";
  if (normalized === "reviewed") return "Refund reviewed";
  return "Refund review pending";
}

function cancellationStatusLabel(order = {}) {
  if (order.refundReview?.required) return refundStatusLabel(order.refundReview.status);
  if (order.cancellationRequest?.status === "approved") return "Cancellation approved";
  if (order.cancellationRequest?.requested) return "Cancellation requested";
  return "";
}

function workflowInfo(order = {}) {
  const workflow = String(order.workflowStatus || "").toLowerCase();
  if (workflow === "to_pay") {
    return {
      label: "Awaiting approval",
      body: "Your order is submitted and waiting for admin payment or COD approval.",
      activeStep: 0,
    };
  }
  if (workflow === "to_deliver") {
    return {
      label: "Preparing delivery",
      body: "Payment is approved. Your assigned unit is being prepared for delivery.",
      activeStep: 1,
    };
  }
  if (workflow === "to_dispatch") {
    if (String(order.deliveryStatus || "").toLowerCase() === "dispatched") {
      return {
        label: "Dispatch",
        body: "Your AC is dispatched. Installation starts after the technician checks in and confirms someone is available.",
        activeStep: 2,
      };
    }
    return {
      label: "To Dispatch",
      body: "The revisit could not proceed. Your branch must dispatch the installation again.",
      activeStep: 1,
    };
  }
  if (workflow === "for_rescheduling") {
    return {
      label: "For Rescheduling",
      body: "The installation could not proceed because nobody was available. Admin will confirm a new schedule.",
      activeStep: 1,
    };
  }
  if (workflow === "to_install") {
    return {
      label: "Installation in progress",
      body: "Your unit is dispatched and queued for technician installation.",
      activeStep: 2,
    };
  }
  if (workflow === "complete") {
    return {
      label: "Completed",
      body: "Delivery and installation are complete.",
      activeStep: 3,
    };
  }
  if (workflow === "cancelled") {
    return {
      label: "Cancelled",
      body: order.refundReview?.required
        ? `${refundStatusLabel(order.refundReview.status)}.`
        : order.cancellationReason || "This order has been cancelled.",
      activeStep: -1,
    };
  }
  return {
    label: order.workflowLabel || order.status || "Pending",
    body: "Delivery updates will appear here as your order moves forward.",
    activeStep: 0,
  };
}

function formatDate(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function humanizeStatus(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function deliveryStatusLabel(order = {}) {
  const workflow = String(order.workflowStatus || "").toLowerCase();
  if (workflow === "complete") return "Delivered and installed";
  const labels = {
    not_started: "Not started",
    pending: "Waiting for dispatch",
    preparing: "Preparing your order",
    dispatched: "Dispatch",
    arrived: "Technician arrived",
    installing: "Installation in progress",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    failed_attempt: "Delivery attempt unsuccessful",
    failed_installation: "Failed to Install",
    for_rescheduling: "For Rescheduling",
  };
  return labels[String(order.deliveryStatus || "").toLowerCase()] || humanizeStatus(order.deliveryStatus || "Not started");
}

function paymentStatusLabel(order = {}) {
  const status = String(order.paymentStatus || "").toLowerCase();
  const method = String(order.paymentMethod || "").toLowerCase();
  if (method === "cod") return order.codCollection?.collectedAt ? "Paid on delivery" : "Payment due on delivery";
  if (status === "not_required") {
    if (method === "cod") return "Cash on delivery";
    if (["pay_on_installation", "pay-on-installation", "poi"].includes(method)) return "Pay on installation";
    return "No online payment required";
  }
  const labels = {
    paid: "Paid",
    verified: "Payment confirmed",
    cod_pending: "Cash on delivery",
    pending: "Payment pending",
    pending_verification: "Checking payment",
    failed: "Payment failed",
    cancelled: "Payment cancelled",
    expired: "Payment link expired",
  };
  return labels[status] || humanizeStatus(status || "Pending");
}

function OrderProgressRow({ icon, title, subtitle, color = BQ_COLORS.accent }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: BQ_SPACING.md }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: BQ_COLORS.bgAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <BoutiqueText variant="h3">{title}</BoutiqueText>
        <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
          {subtitle}
        </BoutiqueText>
      </View>
    </View>
  );
}

function OrderStepTimeline({ tracking = {}, activeStep = 0, workflowStatus = "" }) {
  const { t } = useInterfaceLanguage();
  const steps = Array.isArray(tracking.timeline) && tracking.timeline.length
    ? tracking.timeline
    : ["Submitted", "Approved", "Installation", "Completed"].slice(0, Math.max(activeStep + 1, 1)).map((label) => ({ label }));
  const endState = resolveOrderTimelineEndState(workflowStatus, steps);
  return (
    <View style={{ padding: BQ_SPACING.md, borderRadius: 14, backgroundColor: BQ_COLORS.bgAlt }}>
      <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
        {t("ORDER PROGRESS")}
      </BoutiqueText>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCurrent = isLast && endState === "current";
        return (
          <View
            key={step.stage || step.label}
            style={{
              flexDirection: "row",
              minHeight: 46,
              paddingTop: index === 0 ? BQ_SPACING.sm : 0,
            }}
          >
            <View style={{ width: 30, alignItems: "center" }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: BQ_COLORS.brand }}>
                <Ionicons name={isCurrent ? "location-sharp" : endState === "cancelled" && isLast ? "close-sharp" : "checkmark-sharp"} size={15} color="#fff" />
              </View>
              {index < steps.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: BQ_COLORS.brand, opacity: 0.35 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingLeft: BQ_SPACING.sm, paddingBottom: index < steps.length - 1 ? BQ_SPACING.md : 0 }}>
              <BoutiqueText variant="h3">{t(step.label)}</BoutiqueText>
              <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
                {isCurrent ? t("Current order stage") : step.timestamp ? formatDate(step.timestamp) : endState === "cancelled" && isLast ? t("Cancelled") : t("Completed")}
              </BoutiqueText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function OrderItemSummary({ item }) {
  const { t } = useInterfaceLanguage();
  const serialNumbers = Array.isArray(item.serialNumbers) ? item.serialNumbers.filter(Boolean) : [];
  const unitText =
    serialNumbers.length > 0
      ? serialNumbers.join(", ")
      : "Unit serial pending";
  const horsepower = Number(item.horsepower || String(item.specs || "").match(/(\d+(?:\.\d+)?)/)?.[1] || 0);

  return (
    <View
      style={{
        padding: BQ_SPACING.sm,
        borderRadius: 12,
        backgroundColor: BQ_COLORS.bgAlt,
        gap: 4,
      }}
    >
      <BoutiqueText variant="h3">
        {item.name} x{item.quantity}
      </BoutiqueText>
      <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
        {t("Model")}: {formatCartModel(item)}
      </BoutiqueText>
      <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
        {t("Horsepower")}: {horsepower > 0 ? `${horsepower} HP` : t("Not specified")}
      </BoutiqueText>
      <BoutiqueText variant="caption" color={BQ_COLORS.success}>
        {serialNumbers.length > 0 ? unitText : t(unitText)}
      </BoutiqueText>
    </View>
  );
}

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const { language, t } = useInterfaceLanguage();
  const { orderId } = useLocalSearchParams();
  const selectedOrderId = String(Array.isArray(orderId) ? orderId[0] || "" : orderId || "");
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [payingId, setPayingId] = useState("");
  const paymentInFlightRef = useRef(false);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOrderPage(page);
      const selected = selectedOrderId ? await getOrderById(selectedOrderId) : null;
      setOrders(selected && !result.orders.some((item) => String(item.id) === String(selected.id)) ? [selected, ...result.orders] : result.orders);
      if (selected) setExpandedOrderId(String(selected.id));
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      setLoadError("");
    } catch (error) {
      setLoadError(error?.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedOrderId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = ({ background } = {}) => {
        if (!background) setLoading(true);
        return getOrderPage(page).then(async (result) => {
          if (active) {
            const selected = selectedOrderId ? await getOrderById(selectedOrderId) : null;
            if (!active) return;
            setOrders(selected && !result.orders.some((item) => String(item.id) === String(selected.id)) ? [selected, ...result.orders] : result.orders);
            if (selected) setExpandedOrderId(String(selected.id));
            setTotal(result.pagination.total);
            setTotalPages(result.pagination.totalPages);
            setLoadError("");
          }
        }).catch((error) => {
          if (active) setLoadError(error?.message || "Unable to load orders.");
        }).finally(() => {
          if (active && !background) setLoading(false);
        });
      };
      const stop = startLiveRefresh(load);
      return () => {
        active = false;
        stop();
      };
    }, [page, selectedOrderId]),
  );

  const handleCancelRequest = (order) => confirmAction({
      title: t("Cancel Order?"),
      message: order.paymentProvider === "paymongo" && order.paymentStatus === "paid"
        ? t("This paid order will be cancelled and sent to admin for refund review.")
        : t("This order will be cancelled if it is still before dispatch."),
      cancelText: t("Keep Order"),
      confirmText: t("Request Cancellation"),
      pendingText: t("Submitting..."),
      destructive: true,
      onConfirm: async () => {
            setCancellingId(String(order.id));
            try {
              const result = await requestOrderCancellation(
                order.id,
                order.paymentProvider === "paymongo" && order.paymentStatus === "paid"
                  ? "Requesting cancellation and refund review."
                  : "Customer requested cancellation.",
              );
              await refreshOrders();
              Alert.alert(t("Cancellation submitted"), t(result.message));
            } catch (error) {
              Alert.alert(t("Unable to cancel order"), t(error?.message || "Please try again."));
            } finally {
              setCancellingId("");
            }
      },
    });

  const handlePayNow = async (order) => {
    if (paymentInFlightRef.current || !getPaymentRetryState(order).eligible) return;
    paymentInFlightRef.current = true;
    setPayingId(String(order.id));
    try {
      const checkoutUrl = await retryOrderPayment(order.id);
      if (!checkoutUrl || !(await Linking.canOpenURL(checkoutUrl))) {
        throw new Error("PayMongo did not return a usable checkout link.");
      }
      await Linking.openURL(checkoutUrl);
      router.push(`/customer/order-confirmation/${order.id}?payment=returned`);
    } catch (error) {
      Alert.alert(t("Unable to open payment"), t(error?.message || "Please try again."));
    } finally {
      paymentInFlightRef.current = false;
      setPayingId("");
    }
  };

  return (
    <>
      <BoutiqueHeader title={t("Orders")} subtitle={t("Purchases and delivery updates")} />
      <BoutiqueScreen>
        <BoutiqueCard style={{ gap: BQ_SPACING.md, backgroundColor: BQ_COLORS.brand }}>
          <BoutiqueText variant="label" color="rgba(255,255,255,0.72)">
            {t("Order Center")}
          </BoutiqueText>
          <BoutiqueText variant="h1" color="#fff">
            {loading && !orders.length ? "—" : language === "Filipino" ? `${total} order` : `${total} order${total === 1 ? "" : "s"}`}
          </BoutiqueText>
          <BoutiqueText color="rgba(255,255,255,0.76)">
            {t("Track your payment, delivery, and installation in one place.")}
          </BoutiqueText>
        </BoutiqueCard>

        {loadError ? <BoutiqueCard style={{ gap: BQ_SPACING.sm }}><BoutiqueText color={BQ_COLORS.danger}>{t(loadError)}</BoutiqueText><BoutiqueButton title={t("Try again")} disabled={loading} onPress={refreshOrders} /></BoutiqueCard> : null}
        {loading ? (
          <BoutiqueCard style={{ alignItems: "center", gap: BQ_SPACING.md, paddingVertical: BQ_SPACING.xl }}>
            <ActivityIndicator size="large" color={BQ_COLORS.brand} accessibilityLabel={t("Loading orders...")} />
            <BoutiqueText color={BQ_COLORS.inkMuted}>{t("Loading orders...")}</BoutiqueText>
          </BoutiqueCard>
        ) : orders.length === 0 && !loadError ? (
          <BoutiqueCard style={{ alignItems: "center", gap: BQ_SPACING.md, paddingVertical: BQ_SPACING.xl }}>
            <Ionicons name="receipt-outline" size={52} color={BQ_COLORS.inkFaint} />
            <BoutiqueText variant="h2" align="center">
              {t("No orders yet")}
            </BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted} align="center">
              {t("Browse our AC products. Your orders will appear here after checkout.")}
            </BoutiqueText>
            <BoutiqueButton title={t("Shop AC Units")} onPress={() => router.push("/customer/shop")} />
          </BoutiqueCard>
        ) : (
          orders.map((order) => {
            const variant = orderStatusVariant(order);
            const paymentVariant = paymentStatusVariant(order);
            const itemCount = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const progress = workflowInfo(order);
            const canRequestCancel =
              ["to_pay", "to_deliver", "to_dispatch", "for_rescheduling"].includes(String(order.workflowStatus || "").toLowerCase()) &&
              !order.cancellationRequest?.requested;
            const cancellationLabel = cancellationStatusLabel(order);
            const isExpanded = expandedOrderId === String(order.id);

            return (
              <BoutiqueCard key={order.id} style={{ gap: BQ_SPACING.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: BQ_SPACING.md }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                      {t("Order")} #{String(order.id).slice(-8).toUpperCase()}
                    </BoutiqueText>
                    <BoutiqueText variant="h2">{formatPeso(order.total)}</BoutiqueText>
                  </View>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: BQ_SPACING.md }}>
                  <View style={{ gap: BQ_SPACING.xs, flexShrink: 1 }}>
                    <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("Order status")}</BoutiqueText>
                    <BoutiqueChip label={t(progress.label)} variant={variant} />
                  </View>
                  <View style={{ gap: BQ_SPACING.xs, flexShrink: 1 }}>
                    <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("Payment status")}</BoutiqueText>
                    <BoutiqueChip label={t(paymentStatusLabel(order))} variant={paymentVariant} />
                  </View>
                </View>

                <View style={{ gap: BQ_SPACING.sm }} accessibilityLabel={t("Ordered items")}>
                  {order.items.map((item) => (
                    <OrderItemSummary key={item.id} item={item} />
                  ))}
                </View>

                <BoutiqueText color={BQ_COLORS.inkMuted}>
                  {language === "Filipino" ? `${itemCount} produktong naisumite` : `${itemCount} item${itemCount === 1 ? "" : "s"} submitted`}{" "}
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                </BoutiqueText>

                <BoutiqueButton
                  title={isExpanded ? t("Hide details") : t("View details")}
                  variant="outline"
                  onPress={() => setExpandedOrderId(isExpanded ? "" : String(order.id))}
                />

                {isExpanded ? (
                  <>

                <OrderStepTimeline tracking={order.tracking} activeStep={progress.activeStep} workflowStatus={order.workflowStatus} />

                <BoutiqueText color={BQ_COLORS.inkMuted}>
                  {progress.body === order.cancellationReason
                    ? progress.body
                    : order.workflowStatus === "cancelled" && order.refundReview?.required
                      ? `${t(refundStatusLabel(order.refundReview.status))}.`
                      : t(progress.body)}
                </BoutiqueText>

                <View style={{ gap: BQ_SPACING.md }}>
                  <OrderProgressRow icon="person-sharp" title={t("Recipient")} subtitle={Object.values(getOrderRecipient(order)).filter(Boolean).join("\n") || t("Not available")} />
                  <OrderProgressRow icon="location-sharp" title={t("Delivery address")} subtitle={formatOrderDeliveryAddress(order) || t("Not available")} />
                  <OrderProgressRow icon="card-sharp" title={t("Payment method")} subtitle={t(orderPaymentMethodLabel(order))} />
                  <OrderProgressRow icon="cash-sharp" title={t("Payment status")} subtitle={t(paymentStatusLabel(order))} color={BQ_COLORS[paymentVariant === "blue" ? "accent" : paymentVariant]} />
                  <OrderProgressRow icon="wallet-sharp" title={t("Amount")} subtitle={formatPeso(order.total)} />
                  <OrderProgressRow
                    icon="receipt-sharp"
                    title={t("Order stage")}
                    subtitle={t(order.tracking?.currentLabel || order.workflowLabel || progress.label)}
                  />
                  <OrderProgressRow icon="bicycle-sharp" title={t("Delivery")} subtitle={t(deliveryStatusLabel(order))} />
                  {order.refundReview?.required ? (
                    <OrderProgressRow
                      icon="alert-circle-sharp"
                      title={t("Refund Review")}
                      subtitle={t(refundStatusLabel(order.refundReview.status))}
                      color={BQ_COLORS.warning}
                    />
                  ) : null}
                  {cancellationLabel ? (
                    <OrderProgressRow
                      icon="close-circle-sharp"
                      title={t("Cancellation")}
                      subtitle={t(cancellationLabel)}
                      color={BQ_COLORS.warning}
                    />
                  ) : null}
                  {order.receipt?.receiptNumber ? (
                    <>
                      <OrderProgressRow
                        icon="document-text-sharp"
                        title={t("Receipt")}
                        subtitle={`${order.receipt.receiptNumber} - ${formatPeso(order.receipt.amountPaid || order.total)}`}
                        color={BQ_COLORS.success}
                      />
                      <BoutiqueButton
                        title={t("View Receipt")}
                        variant="outline"
                        onPress={() => router.push(`/customer/receipt/${order.id}`)}
                      />
                    </>
                  ) : null}
                  {order.assignedTechnician ? (
                    <OrderProgressRow icon="construct-sharp" title={t("Technician")} subtitle={order.assignedTechnician} color={BQ_COLORS.accent} />
                  ) : null}
                  {order.estimatedDelivery || order.estimatedArrival || order.installationDate ? (
                    <OrderProgressRow
                      icon="calendar-sharp"
                      title={t("Schedule")}
                      subtitle={[
                        order.estimatedDelivery ? `${t("Delivery")} ${formatDate(order.estimatedDelivery)}` : "",
                        order.estimatedArrival ? `${t("Arrival")} ${formatDate(order.estimatedArrival)}` : "",
                        order.installationDate ? `${t("Install")} ${formatDate(order.installationDate)}` : "",
                        order.installationTimeSlot || "",
                      ].filter(Boolean).join(" - ")}
                      color={BQ_COLORS.warning}
                    />
                  ) : null}
                  {order.trackingNumber ? (
                    <OrderProgressRow icon="navigate-sharp" title={t("Tracking")} subtitle={order.trackingNumber} color={BQ_COLORS.warning} />
                  ) : null}
                </View>

                {canRequestCancel ? (
                  <BoutiqueButton
                    title={cancellingId === String(order.id) ? t("Submitting...") : t("Request Cancellation")}
                    variant="outline"
                    disabled={cancellingId === String(order.id)}
                    loading={cancellingId === String(order.id)}
                    onPress={() => handleCancelRequest(order)}
                  />
                ) : null}

                {order.paymentProvider === "paymongo" &&
                order.paymentStatus !== "paid" &&
                order.workflowStatus === "to_pay" ? (() => {
                  const { isGcash, limitReached, eligible, resuming } = getPaymentRetryState(order);
                  return limitReached ? (
                    <BoutiqueText color={BQ_COLORS.danger} weight={700} align="center">
                      {t("Maximum payment attempts reached. You can no longer retry payment for this order.")}
                    </BoutiqueText>
                  ) : eligible ? (
                    <BoutiqueButton
                      title={payingId === String(order.id) ? t("Connecting…") : isGcash && !resuming ? t("Pay Again") : t("Complete payment")}
                      variant="primary"
                      disabled={payingId === String(order.id)}
                      loading={payingId === String(order.id)}
                      onPress={() => handlePayNow(order)}
                    />
                  ) : null;
                })() : null}
                  </>
                ) : null}
              </BoutiqueCard>
            );
          })
        )}
        {totalPages > 1 ? (
          <BoutiqueCard style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: BQ_SPACING.sm }}>
            <BoutiqueButton title={t("Previous")} variant="outline" disabled={page <= 1} onPress={() => { setExpandedOrderId(""); setPage((value) => Math.max(1, value - 1)); }} />
            <BoutiqueText variant="caption" align="center">{t("Page")} {page} {t("of")} {totalPages}</BoutiqueText>
            <BoutiqueButton title={t("Next")} variant="outline" disabled={page >= totalPages} onPress={() => { setExpandedOrderId(""); setPage((value) => value + 1); }} />
          </BoutiqueCard>
        ) : null}
      </BoutiqueScreen>
    </>
  );
}
