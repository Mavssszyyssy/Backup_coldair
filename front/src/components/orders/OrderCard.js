import {
  Calendar,
  Clock,
  Package,
  Receipt,
  Snowflake,
  Truck,
  Wrench,
} from "@phosphor-icons/react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

const refundStatusLabel = (status = "") => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return "Refund completed";
  if (normalized === "reviewed") return "Refund reviewed";
  return "Refund review pending";
};

const cancellationStatusLabel = (order = {}) => {
  if (order.refundReview?.required) return refundStatusLabel(order.refundReview.status);
  if (order.cancellationRequest?.status === "approved") return "Cancellation approved";
  if (order.cancellationRequest?.requested) return "Cancellation requested";
  return "";
};

function OrderCard({ order, onTrack, onReorder, onReceipt, onCancelRequest, cancelling = false }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case "to_pay":
      case "processing":
        return {
          label: "Processing",
          color: BQ_COLORS.accent,
          bg: "#eff6ff",
          icon: Clock,
        };
      case "to_deliver":
      case "shipped":
        return {
          label: "To Deliver",
          color: "#d97706",
          bg: "#fffbeb",
          icon: Truck,
        };
      case "to_install":
        return {
          label: "To Install",
          color: "#7c3aed",
          bg: "#f5f3ff",
          icon: Wrench,
        };
      case "complete":
      case "delivered":
        return {
          label: "Complete",
          color: BQ_COLORS.success,
          bg: "#f0fdf4",
          icon: Package,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color: BQ_COLORS.danger,
          bg: "#fef2f2",
          icon: Clock,
        };
      default:
        return {
          label: status?.toUpperCase() || "Status",
          color: BQ_COLORS.inkMuted,
          bg: BQ_COLORS.bg,
          icon: Clock,
        };
    }
  };

  const statusCfg = getStatusConfig(order.status);
  const canRequestCancel =
    ["to_pay", "to_deliver"].includes(String(order.status || "").toLowerCase()) &&
    !order.cancellationRequest?.requested;
  const cancellationLabel = cancellationStatusLabel(order);

  return (
    <BoutiqueCard padding={0} style={{ overflow: "hidden" }}>
      <BoutiqueBox
        direction="row"
        align="center"
        justify="space-between"
        padding="20px 24px"
        background={BQ_COLORS.bgAlt}
        style={{ borderBottom: `1px solid ${BQ_COLORS.border}` }}
      >
        <BoutiqueStack gap={4}>
          <BoutiqueText
            weight={800}
            size="14px"
            color={BQ_COLORS.inkMuted}
            style={{ letterSpacing: "0.05em" }}
          >
            ORDER #{order.id}
          </BoutiqueText>
          <BoutiqueBox direction="row" align="center" gap={6}>
            <Calendar size={14} weight="bold" color={BQ_COLORS.inkFaint} />
            <BoutiqueText size="13px" weight={600} color={BQ_COLORS.inkMuted}>
              {new Date(order.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </BoutiqueText>
          </BoutiqueBox>
        </BoutiqueStack>

        <BoutiqueBox
          direction="row"
          align="center"
          gap={8}
          padding="6px 14px"
          background={statusCfg.bg}
          style={{ borderRadius: "10px", color: statusCfg.color }}
        >
          <statusCfg.icon size={16} weight="fill" />
          <BoutiqueText
            size="11px"
            weight={800}
            color="inherit"
            style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            {statusCfg.label}
          </BoutiqueText>
        </BoutiqueBox>
      </BoutiqueBox>

      <BoutiqueBox padding={24}>
        <BoutiqueStack gap={20}>
          {/* META INFO */}
          <BoutiqueBox direction="row" gap={32} wrap="wrap">
            {order.refundReview?.required && (
              <BoutiqueStack gap={2}>
                <BoutiqueText
                  variant="label"
                  size="9px"
                  color={BQ_COLORS.inkFaint}
                >
                  Refund Review
                </BoutiqueText>
                <BoutiqueText size="13px" weight={700} color="#d97706">
                  {refundStatusLabel(order.refundReview.status)}
                </BoutiqueText>
              </BoutiqueStack>
            )}
            {cancellationLabel && (
              <BoutiqueStack gap={2}>
                <BoutiqueText
                  variant="label"
                  size="9px"
                  color={BQ_COLORS.inkFaint}
                >
                  Cancellation
                </BoutiqueText>
                <BoutiqueText size="13px" weight={700} color="#2563eb">
                  {cancellationLabel}
                </BoutiqueText>
              </BoutiqueStack>
            )}
            {order.receipt?.receiptNumber && (
              <BoutiqueStack gap={2}>
                <BoutiqueText
                  variant="label"
                  size="9px"
                  color={BQ_COLORS.inkFaint}
                >
                  E-Receipt
                </BoutiqueText>
                <BoutiqueText size="13px" weight={700}>
                  {order.receipt.receiptNumber}
                </BoutiqueText>
              </BoutiqueStack>
            )}
            {order.assignedTechnician && (
              <BoutiqueStack gap={2}>
                <BoutiqueText
                  variant="label"
                  size="9px"
                  color={BQ_COLORS.inkFaint}
                >
                  Technician
                </BoutiqueText>
                <BoutiqueText size="13px" weight={700}>
                  {order.assignedTechnician}
                </BoutiqueText>
              </BoutiqueStack>
            )}
            {order.estimatedArrival && (
              <BoutiqueStack gap={2}>
                <BoutiqueText
                  variant="label"
                  size="9px"
                  color={BQ_COLORS.inkFaint}
                >
                  Arrival
                </BoutiqueText>
                <BoutiqueText size="13px" weight={700}>
                  {new Date(order.estimatedArrival).toLocaleDateString()}
                </BoutiqueText>
              </BoutiqueStack>
            )}
          </BoutiqueBox>

          {/* ITEMS LIST */}
          <BoutiqueStack
            gap={16}
            padding="20px 0"
            style={{
              borderTop: `1px solid ${BQ_COLORS.border}`,
              borderBottom: `1px solid ${BQ_COLORS.border}`,
            }}
          >
            {order.items.map((item, idx) => (
              <BoutiqueBox key={idx} direction="row" align="center" gap={16}>
                <BoutiqueBox
                  width={48}
                  height={48}
                  background={BQ_COLORS.bg}
                  align="center"
                  justify="center"
                  style={{ borderRadius: "10px", color: BQ_COLORS.inkFaint }}
                >
                  <Snowflake size={24} weight="bold" style={{ opacity: 0.3 }} />
                </BoutiqueBox>
                <BoutiqueBox flex={1}>
                  <BoutiqueText weight={700} size="15px">
                    {item.name}
                  </BoutiqueText>
                  <BoutiqueText size="12px" color={BQ_COLORS.inkMuted}>
                    {item.specs || item.model}
                  </BoutiqueText>
                </BoutiqueBox>
                <BoutiqueBox align="flex-end">
                  <BoutiqueText weight={700} size="15px">
                    ₱{Number(item.price || 0).toLocaleString()}
                  </BoutiqueText>
                  <BoutiqueText
                    size="12px"
                    weight={600}
                    color={BQ_COLORS.inkFaint}
                  >
                    QTY: {item.quantity}
                  </BoutiqueText>
                </BoutiqueBox>
              </BoutiqueBox>
            ))}
          </BoutiqueStack>

          {/* FOOTER ACTIONS */}
          <BoutiqueBox direction="row" align="center" justify="space-between">
            <BoutiqueStack gap={2}>
              <BoutiqueText
                variant="label"
                size="10px"
                color={BQ_COLORS.inkFaint}
              >
                Total Amount
              </BoutiqueText>
              <BoutiqueText weight={800} size="20px" color={BQ_COLORS.brand}>
                ₱{Number(order.total || 0).toLocaleString()}
              </BoutiqueText>
            </BoutiqueStack>

            <BoutiqueBox direction="row" gap={12}>
              {order.receipt?.receiptNumber ? (
                <BoutiqueButton
                  variant="outline"
                  size="sm"
                  onClick={() => onReceipt(order)}
                  style={{ width: "auto" }}
                >
                  <Receipt size={16} weight="bold" /> Receipt
                </BoutiqueButton>
              ) : null}
              <BoutiqueButton
                variant="outline"
                size="sm"
                onClick={() => onTrack(order)}
                style={{ width: "auto" }}
              >
                Track Order
              </BoutiqueButton>
              {canRequestCancel ? (
                <BoutiqueButton
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={cancelling}
                  onClick={() => onCancelRequest(order)}
                  style={{ width: "auto", color: BQ_COLORS.danger, borderColor: "#fecaca" }}
                >
                  {cancelling ? "Submitting..." : "Request Cancel"}
                </BoutiqueButton>
              ) : null}
              <BoutiqueButton
                variant="ghost"
                size="sm"
                onClick={() => onReorder(order)}
                style={{ width: "auto" }}
              >
                Reorder
              </BoutiqueButton>
            </BoutiqueBox>
          </BoutiqueBox>
        </BoutiqueStack>
      </BoutiqueBox>
    </BoutiqueCard>
  );
}

export default OrderCard;
