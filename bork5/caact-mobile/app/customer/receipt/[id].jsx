import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { startLiveRefresh } from "../../../services/liveRefresh";
import { useCallback, useState } from "react";
import { Image, View } from "react-native";
import { paymentMethodLabel } from "../../../services/paymentMethodLabel";
import { receiptOrderName, receiptReferences, customerStatus } from "../../../services/customerLanguage";

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
import { useInterfaceLanguage } from "../../../hooks/useInterfaceLanguage";

const formatDateTime = (value = "") => {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const statusVariant = (status = "") => {
  const value = String(status).toLowerCase();
  if (["paid", "verified", "complete", "completed"].some((state) => new RegExp(`\\b${state}\\b`).test(value))) return "success";
  if (["failed", "cancelled", "expired"].some((state) => new RegExp(`\\b${state}\\b`).test(value))) return "danger";
  return "warning";
};

const readablePaymentValue = (value = "") => String(value || "")
  .replace(/[_-]+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const receiptDetails = (order = {}) => {
  const rawMethod = order.paymentMethod || order.receipt?.paymentProvider || order.paymentProvider || "";
  const normalizedMethod = String(rawMethod).toLowerCase();
  const isCod = normalizedMethod === "cod" || normalizedMethod.includes("cash on delivery");
  const orderComplete = Boolean(order.codCollection?.collectedAt);
  const paymentStatus = isCod
    ? (orderComplete ? "Paid on Delivery" : "Payment Due on Delivery")
    : readablePaymentValue(order.invoice?.payment?.status || order.paymentStatus || order.receipt?.paymentStatus || "Pending");
  const isPaid = isCod
    ? orderComplete
    : ["paid", "verified", "complete", "completed"].some((state) => new RegExp(`\\b${state}\\b`).test(paymentStatus.toLowerCase()));

  return {
    receiptNumber: order.invoice?.invoiceNumber || order.receipt?.receiptNumber || order.orderCode || order.id,
    issuedAt: order.invoice?.transactionDate || order.receipt?.issuedAt || order.createdAt,
    paymentStatus,
    paymentMethod: paymentMethodLabel(order.paymentMethod || order.receipt?.paymentMethod),
    paymentReference: isCod
      ? (orderComplete ? "Cash collected upon delivery" : "No reference needed")
      : order.receipt?.paymentReference || order.paymongo?.paymentId || order.paymongo?.checkoutSessionId || "Pending",
    subtotal: Number(order.subtotal || order.receipt?.subtotalAmount || 0),
    vat: Number(order.vatAmount || order.receipt?.vatAmount || 0),
    delivery: Number(order.shippingFee || order.receipt?.shippingFee || 0),
    discount: Number(order.discountAmount || order.receipt?.discountAmount || 0),
    total: Number(order.total || order.receipt?.amountPaid || 0),
    totalLabel: isPaid ? "Total Paid" : "Amount Due",
  };
};

const formatAddress = (address = {}) =>
  address?.formatted || [address?.street, address?.barangay, address?.city, address?.province, address?.region, address?.postalCode]
    .filter(Boolean)
    .join(", ");

const resolveDeliveryAddress = (order = {}) => {
  const savedAddress = order.address || {};
  const invoiceAddress = order.invoice?.deliveryAddress || {};
  return {
    ...savedAddress,
    ...invoiceAddress,
    name: invoiceAddress.name || savedAddress.name || order.invoice?.customer?.name || order.customerName || "",
    phone: invoiceAddress.phone || savedAddress.phone || order.invoice?.customer?.phone || "",
  };
};

const formatHorsepower = (item = {}) => {
  const parsed = Number(item.horsepower || String(item.specs || "").match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
  return parsed > 0 ? `${parsed} HP` : "Not specified";
};

const deliveryAddressRows = (address = {}) => [
  ["Recipient", address.name],
  ["Contact number", address.phone],
  ["Street address", address.street],
  ["Barangay", address.barangay],
  ["City / Municipality", address.city],
  ["Province", address.province],
  ["Region", address.region],
  ["ZIP Code", address.postalCode],
].filter(([, value]) => String(value || "").trim());

function DeliveryAddressDetails({ address }) {
  const { t } = useInterfaceLanguage();
  const rows = deliveryAddressRows(address);
  return (
    <View
      style={{
        width: "100%",
        padding: BQ_SPACING.md,
        gap: BQ_SPACING.sm,
        backgroundColor: BQ_COLORS.surface,
        borderBottomWidth: 1,
        borderColor: BQ_COLORS.border,
      }}
    >
      <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("DELIVERY ADDRESS DETAILS")}</BoutiqueText>
      {rows.length ? rows.map(([label, value]) => (
        <View key={label} style={{ flexDirection: "row", gap: BQ_SPACING.sm, alignItems: "flex-start" }}>
          <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted} style={{ width: 112 }}>{t(label)}</BoutiqueText>
          <BoutiqueText variant="body" style={{ flex: 1, fontWeight: "700" }}>{value}</BoutiqueText>
        </View>
      )) : <BoutiqueText variant="h3">{t("Pending")}</BoutiqueText>}
    </View>
  );
}

function DetailCell({ label, value, fullWidth = true }) {
  const { t } = useInterfaceLanguage();
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
      <BoutiqueText variant="body" selectable style={{ fontWeight: "600", flexShrink: 1 }}>
        {value || t("Pending")}
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
  const { t } = useInterfaceLanguage();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const stop = startLiveRefresh(({ background }) => {
      if (!background) setLoading(true);
      return getOrderById(id)
        .then((result) => {
          if (active) setOrder(result);
        })
        .catch(() => {
          if (active && !background) setOrder(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      });
      return () => {
        active = false;
        stop();
      };
    }, [id]),
  );

  const receipt = receiptDetails(order || {});
  const invoice = order?.invoice || {};
  const references = receiptReferences(receipt.receiptNumber, order?.orderCode || order?.id);
  const orderName = receiptOrderName(order?.items);
  const deliveryAddress = resolveDeliveryAddress(order || {});

  return (
    <>
      <BoutiqueHeader title={t("Your receipt")} onBack={() => router.back()} />
      <BoutiqueScreen contentContainerStyle={{ padding: BQ_SPACING.md, paddingBottom: BQ_SPACING.xl * 3 }}>
        {loading ? (
          <BoutiqueCard>
            <BoutiqueText color={BQ_COLORS.inkMuted}>{t("Loading receipt…")}</BoutiqueText>
          </BoutiqueCard>
        ) : !order || !order.receiptAvailable ? (
          <BoutiqueCard style={{ alignItems: "center", gap: BQ_SPACING.md, paddingVertical: BQ_SPACING.xl }}>
            <Ionicons name="receipt-outline" size={48} color={BQ_COLORS.inkFaint} />
            <BoutiqueText variant="h2" align="center">{t("Receipt unavailable")}</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted} align="center">{t("The official receipt will appear after payment is confirmed.")}</BoutiqueText>
            <BoutiqueButton title={t("View Orders")} onPress={() => router.replace("/customer/orders")} />
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
                <Image source={require("../../../images/cold logo.png")} accessibilityLabel={t("Cold Air logo")} style={{ width: 54, height: 54 }} resizeMode="contain" />
              </View>
              <View style={{ flex: 1, minWidth: 120, gap: 2 }}>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("OFFICIAL E-RECEIPT")}</BoutiqueText>
                <BoutiqueText variant="h2">Coldair ACT</BoutiqueText>
              </View>
            </View>

            <View style={{ paddingHorizontal: BQ_SPACING.lg, paddingVertical: BQ_SPACING.md, backgroundColor: BQ_COLORS.bgAlt, borderTopWidth: 1, borderBottomWidth: 1, borderColor: BQ_COLORS.border }}>
              <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("ORDER")}</BoutiqueText>
              <BoutiqueText variant="h3" style={{ marginTop: BQ_SPACING.xs }}>{orderName}</BoutiqueText>
            </View>

            <View style={{ padding: BQ_SPACING.lg, gap: BQ_SPACING.sm, backgroundColor: BQ_COLORS.surface, borderBottomWidth: 1, borderColor: BQ_COLORS.border }}>
              <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("PAYMENT SUMMARY")}</BoutiqueText>
              <BoutiqueText variant="h1" style={{ fontSize: 28 }}>{formatPeso(receipt.total)}</BoutiqueText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: BQ_SPACING.sm }}>
                <BoutiqueChip label={t(String(receipt.paymentStatus)).toUpperCase()} variant={statusVariant(receipt.paymentStatus)} />
                <BoutiqueText variant="body" color={BQ_COLORS.inkMuted}>{t(receipt.paymentMethod)}</BoutiqueText>
              </View>
              <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{t(receipt.totalLabel)}</BoutiqueText>
            </View>

            <View style={{ backgroundColor: BQ_COLORS.surface, borderBottomWidth: 1, borderColor: BQ_COLORS.border }}>
              <View style={{ padding: BQ_SPACING.md, gap: BQ_SPACING.xs }}>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("Receipt number")}</BoutiqueText>
                <BoutiqueText variant="body" selectable style={{ fontWeight: "700" }}>{references.receiptNumber}</BoutiqueText>
                {references.orderNumber ? <>
                  <BoutiqueText variant="label" color={BQ_COLORS.inkMuted} style={{ marginTop: BQ_SPACING.sm }}>{t("Order number")}</BoutiqueText>
                  <BoutiqueText variant="body" selectable>{references.orderNumber}</BoutiqueText>
                </> : null}
              </View>
              <View style={{ paddingHorizontal: BQ_SPACING.md, paddingBottom: BQ_SPACING.md, gap: BQ_SPACING.xs }}>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("Date issued")}</BoutiqueText>
                <BoutiqueText variant="body">{receipt.issuedAt ? formatDateTime(receipt.issuedAt) : t("Pending")}</BoutiqueText>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", backgroundColor: BQ_COLORS.surface }}>
              <DetailCell label={t("CUSTOMER")} value={[invoice.customer?.name || order.customerName || order.address?.name || t("Customer"), invoice.customer?.email, invoice.customer?.phone].filter(Boolean).join("\n")} />
              <DetailCell label={t("BRANCH")} value={invoice.branch || order.stockSourceBranch || order.customerBranch || t("Pending")} />
              <DetailCell label={t("PAYMENT REFERENCE")} value={t(receipt.paymentReference)} />
              <DeliveryAddressDetails address={deliveryAddress} />
              <DetailCell label={t("BILLING ADDRESS")} value={formatAddress(invoice.billingAddress || order.address) || t("Same as delivery")} />
              <DetailCell label={t("Delivery progress")} value={t(order.tracking?.currentLabel || customerStatus(invoice.orderStatus || order.workflowLabel || "Pending"))} />
              <DetailCell label={t("WARRANTY / TECHNICIAN")} value={[invoice.warranty, invoice.technician?.name && `${invoice.technician.name} (${t(invoice.technician.status)})`].filter(Boolean).join("\n") || t("Warranty activates after installation.")} />
            </View>

            <View style={{ paddingHorizontal: BQ_SPACING.lg, paddingTop: BQ_SPACING.lg, gap: BQ_SPACING.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: BQ_SPACING.sm, borderBottomWidth: 1, borderBottomColor: BQ_COLORS.border }}>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("ITEM")}</BoutiqueText>
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("TOTAL")}</BoutiqueText>
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
                        <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{t("Horsepower")}: {item.horsepower ? formatHorsepower(item) : t(formatHorsepower(item))}</BoutiqueText>
                        {!!item.serialNumbers?.length && <BoutiqueText variant="caption" color={BQ_COLORS.success}>{t("Serial")}: {item.serialNumbers.join(", ")}</BoutiqueText>}
                      </View>
                      <BoutiqueText variant="h3">{formatPeso(price * quantity)}</BoutiqueText>
                    </View>
                    <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>{t("Qty")} {quantity} × {formatPeso(price)}</BoutiqueText>
                  </View>
                );
              })}
            </View>

            <View style={{ padding: BQ_SPACING.lg, gap: BQ_SPACING.lg }}>
              <BoutiqueText color={BQ_COLORS.inkMuted} style={{ lineHeight: 21 }}>
                {t("Keep this receipt for payment questions and warranty support.")}
              </BoutiqueText>
              {!!order.tracking?.timeline?.length && (
                <View style={{ gap: BQ_SPACING.xs, padding: BQ_SPACING.md, backgroundColor: BQ_COLORS.bgAlt, borderRadius: BQ_RADIUS.sm }}>
                  <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>{t("DELIVERY TRACKING")}</BoutiqueText>
                  {order.tracking.timeline.map((step) => (
                    <BoutiqueText key={step.stage} variant="caption">✓ {t(step.label)}{step.timestamp ? ` · ${formatDateTime(step.timestamp)}` : ""}</BoutiqueText>
                  ))}
                </View>
              )}
              <View style={{ gap: BQ_SPACING.sm }}>
                <AmountRow label={t("Subtotal")} value={receipt.subtotal} />
                <AmountRow label={t("VAT")} value={receipt.vat} />
                <AmountRow label={t("Delivery")} value={receipt.delivery} />
                <AmountRow label={t("Discount")} value={receipt.discount} negative />
                <AmountRow label={t(receipt.totalLabel)} value={receipt.total} strong />
              </View>
            </View>
          </View>
        )}
      </BoutiqueScreen>
    </>
  );
}
