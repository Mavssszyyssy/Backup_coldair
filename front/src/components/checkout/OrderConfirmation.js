import {
  CheckCircle,
  Clock,
  MapPin,
  Receipt,
  ShoppingBag,
  WarningDiamond,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  workflowStatus: String(order.workflowStatus || order.status || "to_pay"),
  workflowLabel: String(order.workflowLabel || order.status || "Processing"),
  paymentMethod: String(order.paymentMethod || ""),
  address: order.address || {},
  items: (Array.isArray(order.items) ? order.items : []).map((it) => ({
    ...it,
    price: Number(it.price || 0),
  })),
});

function OrderConfirmation() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiRequest(`/orders/me/${orderId}`);
        if (response.order) {
          setOrder(normalizeOrder(response.order));
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
  }, [orderId]);

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
              Thank you for your order!
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
