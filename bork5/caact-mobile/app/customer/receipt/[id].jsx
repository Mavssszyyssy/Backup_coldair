import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import {
  BoutiqueButton,
  BoutiqueCard,
  BoutiqueChip,
  BoutiqueHeader,
  BoutiqueScreen,
  BoutiqueText,
  BQ_COLORS,
  BQ_RADIUS,
  BQ_SHADOW,
  BQ_SPACING,
} from "../../../components/boutique";
import { formatPeso } from "../../../services/ecommerceService";
import { getOrderById } from "../../../services/orderStorage";

const formatDateTime = (value = "") => {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const statusVariant = (status = "") => {
  const value = String(status).toLowerCase();
  if (["paid", "verified", "complete", "completed"].some((state) => value.includes(state))) return "success";
  if (["failed", "cancelled", "expired"].some((state) => value.includes(state))) return "danger";
  return "warning";
};

const receiptDetails = (order = {}) => ({
  receiptNumber: order.receipt?.receiptNumber || order.orderCode || order.id,
  issuedAt: order.receipt?.issuedAt || order.createdAt,
  paymentStatus: order.paymentStatus || order.receipt?.paymentStatus || "Pending",
  paymentMethod: order.paymentProvider || order.receipt?.paymentProvider || order.paymentMethod || "Pending",
  paymentReference:
    order.receipt?.paymentReference || order.paymongo?.paymentId || order.paymongo?.checkoutSessionId || "Pending",
  subtotal: Number(order.subtotal || order.receipt?.subtotalAmount || 0),
  vat: Number(order.vatAmount || order.receipt?.vatAmount || 0),
  delivery: Number(order.shippingFee || order.receipt?.shippingFee || 0),
  discount: Number(order.discountAmount || order.receipt?.discountAmount || 0),
  total: Number(order.total || order.receipt?.amountPaid || 0),
});

function DetailCell({ label, value, fullWidth = false }) {
  return (
    <View
      style={{
        width: fullWidth ? "100%" : "50%",
        minWidth: fullWidth ? "100%" : 150,
        padding: BQ_SPACING.md,
        gap: BQ_SPACING.xs,
        backgroundColor: BQ_COLORS.surface,
        borderBottomWidth: 1,
        borderRightWidth: fullWidth ? 0 : 1,
        borderColor: BQ_COLORS.border,
      }}
    >
      <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
        {label}
      </BoutiqueText>
      <BoutiqueText variant="h3" numberOfLines={fullWidth ? 3 : 2}>
        {value || "Pending"}
      </BoutiqueText>
    </View>
  );
}

function AmountRow({ label, value, strong = false, negative = false }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: BQ_SPACING.md,
        paddingTop: strong ? BQ_SPACING.md : 0,
        borderTopWidth: strong ? 2 : 0,
        borderTopColor: BQ_COLORS.ink,
      }}
    >
      <BoutiqueText variant={strong ? "h2" : "body"} color={strong ? BQ_COLORS.accent : BQ_COLORS.inkMuted}>
        {label}
      </BoutiqueText>
      <BoutiqueText variant={strong ? "h2" : "body"} color={strong ? BQ_COLORS.accent : BQ_COLORS.ink}>
        {negative ? "-" : ""}{formatPeso(value)}
      </BoutiqueText>
    </View>
  );
}

export default function ReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getOrderById(id)
        .then((result) => {
          if (active) setOrder(result);
        })
        .catch(() => {
          if (active) setOrder(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [id]),
  );

  const receipt = receiptDetails(order || {});
  const address = [
    order?.address?.street,
    order?.address?.barangay,
    order?.address?.city,
    order?.address?.province,
  ].filter(Boolean).join(", ");

  return (
    <>
      <BoutiqueHeader title="E-Receipt" subtitle="Order payment record" onBack={() => router.back()} />
      <BoutiqueScreen contentContainerStyle={{ padding: BQ_SPACING.md, paddingBottom: BQ_SPACING.xl * 3 }}>
        {loading ? (
          <BoutiqueCard>
            <BoutiqueText color={BQ_COLORS.inkMuted}>Loading receipt…</BoutiqueText>
          </BoutiqueCard>
        ) : !order ? (
          <BoutiqueCard style={{ alignItems: "center", gap: BQ_SPACING.md, paddingVertical: BQ_SPACING.xl }}>
            <Ionicons name="receipt-outline" size={48} color={BQ_COLORS.inkFaint} />
            <BoutiqueText variant="h2" align="center">Receipt unavailable</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted} align="center">The receipt will appear after an order has been created.</BoutiqueText>
            <BoutiqueButton title="View Orders" onPress={() => router.replace("/customer/orders")} />
          </BoutiqueCard>
        ) : (
          <View
            style={[
              {
                overflow: "hidden",
                backgroundColor: BQ_COLORS.surface,
                borderRadius: BQ_RADIUS.md,
                borderWidth: 1,
                borderColor: "#dbe4ee",
              },
              BQ_SHADOW.float,
            ]}
          >
            <View style={{ padding: BQ_SPACING.lg, flexDirection: "row", alignItems: "center", gap: BQ_SPACING.md, flexWrap: "wrap" }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: BQ_RADIUS.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#eff6ff",
                }}
              >
                <Ionicons name="receipt" size={30} color={BQ_COLORS.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 170, gap: 2 }}>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>OFFICIAL E-RECEIPT</BoutiqueText>
                <BoutiqueText variant="h1">Coldair ACT</BoutiqueText>
              </View>
              <View style={{ alignItems: "flex-start", gap: BQ_SPACING.xs }}>
                <BoutiqueChip label={String(receipt.paymentStatus).toUpperCase()} variant={statusVariant(receipt.paymentStatus)} />
                <BoutiqueText variant="h3">{receipt.receiptNumber}</BoutiqueText>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", backgroundColor: "#0f172a" }}>
              <View style={{ flex: 1, minWidth: 160, padding: BQ_SPACING.md, gap: BQ_SPACING.xs }}>
                <BoutiqueText variant="label" color="#94a3b8">ORDER NUMBER</BoutiqueText>
                <BoutiqueText variant="h3" color="#fff">{order.orderCode || order.id}</BoutiqueText>
              </View>
              <View style={{ flex: 1, minWidth: 160, padding: BQ_SPACING.md, gap: BQ_SPACING.xs }}>
                <BoutiqueText variant="label" color="#94a3b8">ISSUED</BoutiqueText>
                <BoutiqueText variant="h3" color="#fff">{formatDateTime(receipt.issuedAt)}</BoutiqueText>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", backgroundColor: BQ_COLORS.border }}>
              <DetailCell label="CUSTOMER" value={order.customerName || order.address?.name || "Customer"} />
              <DetailCell label="PAYMENT METHOD" value={receipt.paymentMethod} />
              <DetailCell label="PAYMENT REFERENCE" value={receipt.paymentReference} />
              <DetailCell label="DELIVERY ADDRESS" value={address || "Pending"} />
            </View>

            <View style={{ paddingHorizontal: BQ_SPACING.lg, paddingTop: BQ_SPACING.lg, gap: BQ_SPACING.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: BQ_SPACING.sm, borderBottomWidth: 1, borderBottomColor: BQ_COLORS.border }}>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>ITEM</BoutiqueText>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>TOTAL</BoutiqueText>
              </View>
              {(order.items || []).map((item, index) => {
                const quantity = Number(item.quantity || 1);
                const price = Number(item.price || 0);
                return (
                  <View key={`${item.id || item.name}-${index}`} style={{ gap: BQ_SPACING.xs, paddingBottom: BQ_SPACING.md, borderBottomWidth: 1, borderBottomColor: BQ_COLORS.border }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: BQ_SPACING.md }}>
                      <View style={{ flex: 1 }}>
                        <BoutiqueText variant="h3">{item.name}</BoutiqueText>
                        {!!item.specs && <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{item.specs}</BoutiqueText>}
                      </View>
                      <BoutiqueText variant="h3">{formatPeso(price * quantity)}</BoutiqueText>
                    </View>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>Qty {quantity} × {formatPeso(price)}</BoutiqueText>
                  </View>
                );
              })}
            </View>

            <View style={{ padding: BQ_SPACING.lg, gap: BQ_SPACING.lg }}>
              <BoutiqueText color={BQ_COLORS.inkMuted} style={{ lineHeight: 21 }}>
                This receipt confirms the order payment record stored in the Coldair ACT system.
              </BoutiqueText>
              <View style={{ gap: BQ_SPACING.sm }}>
                <AmountRow label="Subtotal" value={receipt.subtotal} />
                <AmountRow label="VAT" value={receipt.vat} />
                <AmountRow label="Delivery" value={receipt.delivery} />
                <AmountRow label="Discount" value={receipt.discount} negative />
                <AmountRow label="Total Paid" value={receipt.total} strong />
              </View>
            </View>
          </View>
        )}
      </BoutiqueScreen>
    </>
  );
}
