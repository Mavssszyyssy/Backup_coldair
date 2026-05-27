import {
  CheckCircle,
  Clock,
  MapPin,
  Receipt,
  ShoppingBag,
  WarningDiamond,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../config/api";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueGrid from "../common/boutique/BoutiqueGrid";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_SHADOWS } from "../common/boutique/BoutiqueTheme";

const normalizeOrder = (order = {}) => ({
  id: String(order.id || order.orderCode || ""),
  orderCode: String(order.orderCode || order.id || ""),
  createdAt: String(order.createdAt || order.date || ""),
  total: Number(order.totalAmount || order.total || 0),
  subtotalAmount: Number(order.subtotalAmount || order.receipt?.subtotalAmount || 0),
  vatAmount: Number(order.vatAmount || order.receipt?.vatAmount || 0),
  shippingFee: Number(order.shippingFee || order.receipt?.shippingFee || 0),
  discountAmount: Number(order.discountAmount || order.receipt?.discountAmount || 0),
  workflowStatus: String(order.workflowStatus || order.status || "to_pay"),
  workflowLabel: String(order.workflowLabel || order.status || "Processing"),
  paymentMethod: String(order.paymentMethod || ""),
  paymentStatus: String(order.paymentStatus || ""),
  paymentProvider: String(order.paymentProvider || ""),
  paymongo: order.paymongo || {},
  receipt: order.receipt || {},
  address: order.address || {},
  items: (Array.isArray(order.items) ? order.items : []).map((it) => ({
    ...it,
    price: Number(it.price || 0),
  })),
});

function OrderConfirmation() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiRequest(`/orders/me/${orderId}`);
        if (response.order) {
          let nextOrder = normalizeOrder(response.order);
          if (
            searchParams.get("payment") === "success" &&
            nextOrder.paymentProvider === "paymongo" &&
            nextOrder.paymentStatus !== "paid"
          ) {
            const verifyResponse = await apiRequest(`/orders/${nextOrder.id}/paymongo/verify`, {
              method: "POST",
            });
            if (verifyResponse.order) nextOrder = normalizeOrder(verifyResponse.order);
          }
          setOrder(nextOrder);
        } else {
          setError("Order not found.");
        }
      } catch (err) {
        setError("Unable to load order details.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, searchParams]);

  const paymentReturnState = searchParams.get("payment");
  const canRetryPayment =
    order &&
    order.paymentProvider === "paymongo" &&
    order.paymentStatus !== "paid" &&
    order.workflowStatus === "to_pay";

  const handlePayNow = async () => {
    if (!order?.id) return;
    setPaying(true);
    try {
      const response = await apiRequest(`/orders/${order.id}/paymongo/checkout`, {
        method: "POST",
      });
      const paymentUrl =
        response.payment?.checkoutUrl ||
        response.order?.paymentUrl ||
        response.order?.paymongo?.checkoutUrl ||
        "";
      if (!paymentUrl) throw new Error("PayMongo checkout URL was not returned.");
      window.location.assign(paymentUrl);
    } catch (err) {
      alert(err?.message || "Unable to open PayMongo checkout.");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
        <BoutiqueBox flex={1} align="center" justify="center" padding={60}>
          <BoutiqueStack gap={20} align="center">
            <BoutiqueBox className="bq-spin" color={BQ_COLORS.brand}>
              <Clock size={48} weight="bold" />
            </BoutiqueBox>
            <BoutiqueText variant="h3">
              Fetching your order details...
            </BoutiqueText>
          </BoutiqueStack>
        </BoutiqueBox>
      </BoutiqueScreen>
    );
  }

  if (error || !order) {
    return (
      <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
        <BoutiqueBox flex={1} align="center" justify="center" padding={60}>
          <BoutiqueStack gap={24} align="center">
            <WarningDiamond size={64} weight="bold" color={BQ_COLORS.danger} />
            <BoutiqueText variant="h2">
              {error || "Something went wrong"}
            </BoutiqueText>
            <BoutiqueButton
              onClick={() => navigate("/shop")}
              style={{ width: "auto" }}
            >
              Back to Shop
            </BoutiqueButton>
          </BoutiqueStack>
        </BoutiqueBox>
      </BoutiqueScreen>
    );
  }

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title="Order Success"
        leftAction="back"
        onLeftAction={() => navigate("/shop")}
      />

      <BoutiqueBox
        direction="column"
        flex={1}
        width="100%"
        padding="40px 24px"
        style={{ maxWidth: "800px", margin: "0 auto" }}
      >
        <BoutiqueStack gap={32}>
          <BoutiqueCard padding={48} align="center">
            <BoutiqueBox
              width={80}
              height={80}
              background="#ecfdf5"
              color="#10b981"
              align="center"
              justify="center"
              margin="0 0 24px"
              style={{ borderRadius: "50%", boxShadow: BQ_SHADOWS.soft }}
            >
              <CheckCircle size={48} weight="fill" />
            </BoutiqueBox>
            <BoutiqueText variant="h1" align="center">
              {paymentReturnState === "cancelled"
                ? "Order received, payment pending"
                : "Thank you for your order!"}
            </BoutiqueText>
            <BoutiqueBox
              margin="12px 0 0"
              padding="6px 16px"
              background={BQ_COLORS.bg}
              style={{ borderRadius: "12px" }}
            >
              <BoutiqueText
                weight={800}
                size="14px"
                color={BQ_COLORS.inkMuted}
                style={{ letterSpacing: "0.05em" }}
              >
                ORDER #{order.orderCode}
              </BoutiqueText>
            </BoutiqueBox>

            {order.paymentProvider === "paymongo" ? (
              <BoutiqueBox
                margin="16px 0 0"
                padding="14px 18px"
                width="100%"
                background={order.paymentStatus === "paid" ? "#ecfdf5" : "#fff7ed"}
                style={{
                  borderRadius: "16px",
                  border: `1px solid ${order.paymentStatus === "paid" ? "#bbf7d0" : "#fed7aa"}`,
                }}
              >
                <BoutiqueText weight={800} color={order.paymentStatus === "paid" ? "#047857" : "#9a3412"}>
                  PayMongo Payment: {(order.paymentStatus || "pending").toUpperCase()}
                </BoutiqueText>
                {canRetryPayment ? (
                  <BoutiqueText size="13px" color={BQ_COLORS.inkMuted} margin="6px 0 0">
                    Complete payment to move this order forward for branch processing.
                  </BoutiqueText>
                ) : null}
              </BoutiqueBox>
            ) : null}

            <BoutiqueBox
              margin="32px 0 0"
              padding="16px 24px"
              width="100%"
              background={BQ_COLORS.bgAlt}
              style={{
                borderRadius: "16px",
                border: `1px solid ${BQ_COLORS.border}`,
              }}
            >
              <BoutiqueBox
                direction="row"
                align="center"
                justify="space-between"
              >
                <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                  Current Status
                </BoutiqueText>
                <BoutiqueText weight={800} color={BQ_COLORS.accent}>
                  {(
                    order.workflowLabel ||
                    order.workflowStatus ||
                    "Processing"
                  ).toUpperCase()}
                </BoutiqueText>
              </BoutiqueBox>
            </BoutiqueBox>
          </BoutiqueCard>

          <BoutiqueGrid columns="1fr 1fr" gap={24}>
            <BoutiqueCard padding={32}>
              <BoutiqueBox
                direction="row"
                align="center"
                gap={12}
                margin="0 0 20px"
              >
                <Receipt size={20} weight="fill" color={BQ_COLORS.accent} />
                <BoutiqueText variant="h3">Summary</BoutiqueText>
              </BoutiqueBox>
              <BoutiqueStack gap={16}>
                {order.items.map((item, idx) => (
                  <BoutiqueBox
                    key={idx}
                    direction="row"
                    justify="space-between"
                    align="baseline"
                  >
                    <BoutiqueText
                      size="14px"
                      weight={600}
                      style={{ opacity: 0.8 }}
                    >
                      {item.name}{" "}
                      <BoutiqueText
                        tag="span"
                        size="12px"
                        color={BQ_COLORS.inkFaint}
                      >
                        x{item.quantity}
                      </BoutiqueText>
                    </BoutiqueText>
                    <BoutiqueText size="14px" weight={700}>
                      ₱{item.price.toLocaleString()}
                    </BoutiqueText>
                  </BoutiqueBox>
                ))}
                <BoutiqueBox
                  direction="row"
                  justify="space-between"
                >
                  <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>Subtotal</BoutiqueText>
                  <BoutiqueText size="14px" weight={700}>
                    PHP {order.subtotalAmount.toLocaleString()}
                  </BoutiqueText>
                </BoutiqueBox>
                <BoutiqueBox
                  direction="row"
                  justify="space-between"
                >
                  <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>VAT</BoutiqueText>
                  <BoutiqueText size="14px" weight={700}>
                    PHP {order.vatAmount.toLocaleString()}
                  </BoutiqueText>
                </BoutiqueBox>
                <BoutiqueBox
                  direction="row"
                  justify="space-between"
                >
                  <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>Delivery</BoutiqueText>
                  <BoutiqueText size="14px" weight={700}>
                    PHP {order.shippingFee.toLocaleString()}
                  </BoutiqueText>
                </BoutiqueBox>
                {order.discountAmount > 0 ? (
                  <BoutiqueBox
                    direction="row"
                    justify="space-between"
                  >
                    <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>Discount</BoutiqueText>
                    <BoutiqueText size="14px" weight={700}>
                      -PHP {order.discountAmount.toLocaleString()}
                    </BoutiqueText>
                  </BoutiqueBox>
                ) : null}
                <BoutiqueBox
                  margin="8px 0 0"
                  padding="16px 0 0"
                  style={{ borderTop: `1.5px dashed ${BQ_COLORS.border}` }}
                  direction="row"
                  justify="space-between"
                >
                  <BoutiqueText weight={800}>Total Amount</BoutiqueText>
                  <BoutiqueText variant="h2" color={BQ_COLORS.brand}>
                    ₱{order.total.toLocaleString()}
                  </BoutiqueText>
                </BoutiqueBox>
              </BoutiqueStack>
            </BoutiqueCard>

            <BoutiqueCard padding={32}>
              <BoutiqueBox
                direction="row"
                align="center"
                gap={12}
                margin="0 0 20px"
              >
                <Receipt size={20} weight="fill" color={BQ_COLORS.accent} />
                <BoutiqueText variant="h3">Receipt</BoutiqueText>
              </BoutiqueBox>
              <BoutiqueStack gap={12}>
                <BoutiqueBox direction="row" justify="space-between">
                  <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>Receipt No.</BoutiqueText>
                  <BoutiqueText size="14px" weight={700}>{order.receipt?.receiptNumber || "Pending"}</BoutiqueText>
                </BoutiqueBox>
                <BoutiqueBox direction="row" justify="space-between">
                  <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>Payment Status</BoutiqueText>
                  <BoutiqueText size="14px" weight={700}>{order.receipt?.paymentStatus || order.paymentStatus || "pending"}</BoutiqueText>
                </BoutiqueBox>
                <BoutiqueBox direction="row" justify="space-between">
                  <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>Payment Ref.</BoutiqueText>
                  <BoutiqueText size="14px" weight={700}>{order.receipt?.paymentReference || order.paymongo?.paymentId || "Pending"}</BoutiqueText>
                </BoutiqueBox>
                <BoutiqueBox direction="row" justify="space-between">
                  <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>Amount Paid</BoutiqueText>
                  <BoutiqueText size="14px" weight={800}>PHP {Number(order.receipt?.amountPaid || 0).toLocaleString()}</BoutiqueText>
                </BoutiqueBox>
              </BoutiqueStack>
            </BoutiqueCard>

            <BoutiqueCard padding={32}>
              <BoutiqueBox
                direction="row"
                align="center"
                gap={12}
                margin="0 0 20px"
              >
                <MapPin size={20} weight="fill" color={BQ_COLORS.accent} />
                <BoutiqueText variant="h3">Delivery</BoutiqueText>
              </BoutiqueBox>
              <BoutiqueStack gap={12}>
                <BoutiqueText weight={700}>{order.address?.name}</BoutiqueText>
                <BoutiqueText
                  size="14px"
                  color={BQ_COLORS.inkMuted}
                  style={{ lineHeight: 1.5 }}
                >
                  {[
                    order.address?.street,
                    order.address?.barangay,
                    order.address?.city,
                    order.address?.province,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </BoutiqueText>
                <BoutiqueText size="13px" weight={600} margin="4px 0 0">
                  Phone: {order.address?.phone}
                </BoutiqueText>
              </BoutiqueStack>
            </BoutiqueCard>
          </BoutiqueGrid>

          <BoutiqueBox direction="row" gap={16} margin="16px 0 0">
            {canRetryPayment ? (
              <BoutiqueButton
                variant="primary"
                flex={1}
                onClick={handlePayNow}
                disabled={paying}
              >
                {paying ? "Opening PayMongo..." : "Pay Now"}
              </BoutiqueButton>
            ) : null}
            <BoutiqueButton
              variant="outline"
              flex={1}
              onClick={() => navigate(`/receipt/${order.id}`)}
            >
              <Receipt size={18} weight="bold" /> View Receipt
            </BoutiqueButton>
            <BoutiqueButton
              variant="outline"
              flex={1}
              onClick={() => navigate("/my-orders")}
            >
              <Receipt size={18} weight="bold" /> View My Orders
            </BoutiqueButton>
            <BoutiqueButton
              variant="primary"
              flex={1}
              onClick={() => navigate("/shop")}
            >
              <ShoppingBag size={18} weight="bold" /> Continue Shopping
            </BoutiqueButton>
          </BoutiqueBox>
        </BoutiqueStack>
      </BoutiqueBox>

      <BoutiqueFooter />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-spin { animation: bq-spin 1s linear infinite; }
        @keyframes bq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .bq-grid-primitive { grid-template-columns: 1fr !important; }
        }
      `,
        }}
      />
    </BoutiqueScreen>
  );
}

export default OrderConfirmation;
