import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, View } from "react-native";

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
import { useUserContext } from "../../context/UserContext";
import { formatPeso } from "../../services/ecommerceService";
import { getOrdersByUser, requestOrderCancellation, retryOrderPayment } from "../../services/orderStorage";

function statusVariant(status = "") {
  const value = status.toLowerCase();
  if (value.includes("approved") || value.includes("released") || value.includes("delivered")) return "success";
  if (value.includes("rejected") || value.includes("cancelled") || value.includes("failed")) return "danger";
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
    body: "Order progress will appear here once the backend updates fulfillment.",
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
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    failed_attempt: "Delivery attempt unsuccessful",
  };
  return labels[String(order.deliveryStatus || "").toLowerCase()] || humanizeStatus(order.deliveryStatus || "Not started");
}

function paymentStatusLabel(order = {}) {
  const status = String(order.paymentStatus || "").toLowerCase();
  const method = String(order.paymentMethod || "").toLowerCase();
  if (status === "not_required") {
    if (method === "cod") return "Cash on delivery";
    if (["pay_on_installation", "pay-on-installation", "poi"].includes(method)) return "Pay on installation";
    return "No online payment required";
  }
  const labels = {
    paid: "Paid",
    verified: "Payment verified",
    cod_pending: "Cash on delivery",
    pending: "Payment pending",
    pending_verification: "Payment verification pending",
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

function OrderStepTimeline({ tracking = {}, activeStep = 0 }) {
  const steps = Array.isArray(tracking.timeline) && tracking.timeline.length
    ? tracking.timeline
    : ["Submitted", "Approved", "Installation", "Completed"].slice(0, Math.max(activeStep + 1, 1)).map((label) => ({ label }));
  return (
    <View style={{ padding: BQ_SPACING.md, borderRadius: 14, backgroundColor: BQ_COLORS.bgAlt }}>
      <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
        ORDER PROGRESS
      </BoutiqueText>
      {steps.map((step, index) => {
        const isCurrent = index === steps.length - 1;
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
                <Ionicons name={isCurrent ? "location-sharp" : "checkmark-sharp"} size={15} color="#fff" />
              </View>
              {index < steps.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: BQ_COLORS.brand, opacity: 0.35 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingLeft: BQ_SPACING.sm, paddingBottom: index < steps.length - 1 ? BQ_SPACING.md : 0 }}>
              <BoutiqueText variant="h3">{step.label}</BoutiqueText>
              <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
                {isCurrent ? "Current order stage" : step.timestamp ? formatDate(step.timestamp) : "Completed"}
              </BoutiqueText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function OrderItemSummary({ item }) {
  const unitText =
    item.serialNumbers.length > 0
      ? item.serialNumbers.join(", ")
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
      {!!item.specs && (
        <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
          {item.specs}
        </BoutiqueText>
      )}
      <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>
        Horsepower: {horsepower > 0 ? `${horsepower} HP` : "Not specified"}
      </BoutiqueText>
      <BoutiqueText variant="caption" color={BQ_COLORS.success}>
        {unitText}
      </BoutiqueText>
    </View>
  );
}

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [orders, setOrders] = useState([]);
  const [cancellingId, setCancellingId] = useState("");
  const [payingId, setPayingId] = useState("");

  const refreshOrders = useCallback(async () => {
    const items = await getOrdersByUser(current);
    setOrders(items);
  }, [current]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () => {
        getOrdersByUser(current).then((items) => {
          if (active) setOrders(items);
        });
      };
      load();
      const pollId = setInterval(load, 20000);
      return () => {
        active = false;
        clearInterval(pollId);
      };
    }, [current]),
  );

  const handleCancelRequest = (order) => {
    Alert.alert(
      "Cancel order?",
      order.paymentProvider === "paymongo" && order.paymentStatus === "paid"
        ? "This paid order will be cancelled and sent to admin for refund review."
        : "This order will be cancelled if it is still before dispatch.",
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Request Cancel",
          style: "destructive",
          onPress: async () => {
            setCancellingId(String(order.id));
            try {
              const result = await requestOrderCancellation(
                order.id,
                order.paymentProvider === "paymongo" && order.paymentStatus === "paid"
                  ? "Requesting cancellation and refund review."
                  : "Customer requested cancellation.",
              );
              await refreshOrders();
              Alert.alert("Cancellation submitted", result.message);
            } catch (error) {
              Alert.alert("Unable to cancel order", error?.message || "Please try again.");
            } finally {
              setCancellingId("");
            }
          },
        },
      ],
    );
  };

  const handlePayNow = async (order) => {
    setPayingId(String(order.id));
    try {
      const checkoutUrl = await retryOrderPayment(order.id);
      if (!checkoutUrl || !(await Linking.canOpenURL(checkoutUrl))) {
        throw new Error("PayMongo did not return a usable checkout link.");
      }
      await Linking.openURL(checkoutUrl);
    } catch (error) {
      Alert.alert("Unable to open payment", error?.message || "Please try again.");
    } finally {
      setPayingId("");
    }
  };

  return (
    <>
      <BoutiqueHeader title="Orders" subtitle="Purchases and delivery updates" onBack={() => router.replace("/customer/home")} />
      <BoutiqueScreen>
        <BoutiqueCard style={{ gap: BQ_SPACING.md, backgroundColor: BQ_COLORS.brand }}>
          <BoutiqueText variant="label" color="rgba(255,255,255,0.72)">
            Order Center
          </BoutiqueText>
          <BoutiqueText variant="h1" color="#fff">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </BoutiqueText>
          <BoutiqueText color="rgba(255,255,255,0.76)">
            Track stock approval, payment review, and fulfillment progress from mobile checkout.
          </BoutiqueText>
        </BoutiqueCard>

        {orders.length === 0 ? (
          <BoutiqueCard style={{ alignItems: "center", gap: BQ_SPACING.md, paddingVertical: BQ_SPACING.xl }}>
            <Ionicons name="receipt-outline" size={52} color={BQ_COLORS.inkFaint} />
            <BoutiqueText variant="h2" align="center">
              No orders yet
            </BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted} align="center">
              Browse the mobile boutique catalogue and your submitted orders will appear here.
            </BoutiqueText>
            <BoutiqueButton title="Shop AC Units" onPress={() => router.push("/customer/shop")} />
          </BoutiqueCard>
        ) : (
          orders.map((order) => {
            const variant = statusVariant(`${order.status} ${order.deliveryStatus}`);
            const itemCount = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const progress = workflowInfo(order);
            const canRequestCancel =
              ["to_pay", "to_deliver"].includes(String(order.workflowStatus || "").toLowerCase()) &&
              !order.cancellationRequest?.requested;
            const cancellationLabel = cancellationStatusLabel(order);

            return (
              <BoutiqueCard key={order.id} style={{ gap: BQ_SPACING.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: BQ_SPACING.md }}>
                  <View style={{ flex: 1 }}>
                    <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                      Order #{String(order.id).slice(-8).toUpperCase()}
                    </BoutiqueText>
                    <BoutiqueText variant="h2">{formatPeso(order.total)}</BoutiqueText>
                  </View>
                  <BoutiqueChip label={progress.label} variant={variant} />
                </View>

                <BoutiqueText color={BQ_COLORS.inkMuted}>
                  {itemCount} item{itemCount === 1 ? "" : "s"} submitted{" "}
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                </BoutiqueText>

                <OrderStepTimeline tracking={order.tracking} activeStep={progress.activeStep} />

                <BoutiqueText color={BQ_COLORS.inkMuted}>
                  {progress.body}
                </BoutiqueText>

                <View style={{ gap: BQ_SPACING.md }}>
                  <OrderProgressRow
                    icon="receipt-sharp"
                    title="Order stage"
                    subtitle={order.tracking?.currentLabel || order.workflowLabel || progress.label}
                  />
                  <OrderProgressRow icon="bicycle-sharp" title="Delivery" subtitle={deliveryStatusLabel(order)} />
                  <OrderProgressRow icon="card-sharp" title="Payment" subtitle={paymentStatusLabel(order)} color={BQ_COLORS.success} />
                  {order.refundReview?.required ? (
                    <OrderProgressRow
                      icon="alert-circle-sharp"
                      title="Refund Review"
                      subtitle={refundStatusLabel(order.refundReview.status)}
                      color={BQ_COLORS.warning}
                    />
                  ) : null}
                  {cancellationLabel ? (
                    <OrderProgressRow
                      icon="close-circle-sharp"
                      title="Cancellation"
                      subtitle={cancellationLabel}
                      color={BQ_COLORS.warning}
                    />
                  ) : null}
                  {order.receipt?.receiptNumber ? (
                    <>
                      <OrderProgressRow
                        icon="document-text-sharp"
                        title="Receipt"
                        subtitle={`${order.receipt.receiptNumber} - ${formatPeso(order.receipt.amountPaid || order.total)}`}
                        color={BQ_COLORS.success}
                      />
                      <BoutiqueButton
                        title="View Receipt"
                        variant="outline"
                        onPress={() => router.push(`/customer/receipt/${order.id}`)}
                      />
                    </>
                  ) : null}
                  {order.assignedTechnician ? (
                    <OrderProgressRow icon="construct-sharp" title="Technician" subtitle={order.assignedTechnician} color={BQ_COLORS.accent} />
                  ) : null}
                  {order.estimatedDelivery || order.installationDate ? (
                    <OrderProgressRow
                      icon="calendar-sharp"
                      title="Schedule"
                      subtitle={[
                        order.estimatedDelivery ? `Delivery ${formatDate(order.estimatedDelivery)}` : "",
                        order.installationDate ? `Install ${formatDate(order.installationDate)}` : "",
                      ].filter(Boolean).join(" - ")}
                      color={BQ_COLORS.warning}
                    />
                  ) : null}
                  {order.trackingNumber ? (
                    <OrderProgressRow icon="navigate-sharp" title="Tracking" subtitle={order.trackingNumber} color={BQ_COLORS.warning} />
                  ) : null}
                </View>

                {canRequestCancel ? (
                  <BoutiqueButton
                    title={cancellingId === String(order.id) ? "Submitting..." : "Request Cancellation"}
                    variant="outline"
                    disabled={cancellingId === String(order.id)}
                    loading={cancellingId === String(order.id)}
                    onPress={() => handleCancelRequest(order)}
                  />
                ) : null}

                {order.paymentProvider === "paymongo" &&
                order.paymentStatus !== "paid" &&
                order.workflowStatus === "to_pay" ? (
                  <BoutiqueButton
                    title={payingId === String(order.id) ? "Connecting…" : "Complete payment"}
                    variant="primary"
                    disabled={payingId === String(order.id)}
                    loading={payingId === String(order.id)}
                    onPress={() => handlePayNow(order)}
                  />
                ) : null}

                <View style={{ gap: BQ_SPACING.sm }}>
                  {order.items.map((item) => (
                    <OrderItemSummary key={item.id} item={item} />
                  ))}
                </View>
              </BoutiqueCard>
            );
          })
        )}
      </BoutiqueScreen>
    </>
  );
}
