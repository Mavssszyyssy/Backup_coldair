import { ShoppingBag, WarningDiamond } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_GEOMETRY } from "../common/boutique/BoutiqueTheme";
import OrderCard from "./OrderCard";
import TrackOrderModal from "./TrackOrderModal";

const VALID_ORDER_STATUSES = [
  "all",
  "to_pay",
  "to_deliver",
  "to_install",
  "complete",
  "cancelled",
];

const normalizeCustomerOrder = (order = {}) => ({
  ...order,
  // Prefer the database identifier for mutations. The API also accepts the
  // human-readable order code, but using one canonical ID prevents a stale
  // card from submitting a cancellation against a mismatched cached code.
  id: order.id || order._id || order.orderCode,
  date: order.createdAt || order.date,
  total: order.totalAmount || order.total || 0,
  status: order.workflowStatus || order.status,
  items: order.items || [],
  trackingNumber: order.trackingNumber || "Pending",
  tracking: order.tracking || { timeline: [], currentLabel: order.workflowLabel || "Order Placed" },
  invoice: order.invoice || null,
  estimatedDelivery: order.estimatedDelivery || "",
  estimatedArrival: order.estimatedArrival || "",
  installationDate: order.installationDate || "",
  assignedTechnician: order.assignedTechnician || "",
  receipt: order.receipt || null,
  refundReview: order.refundReview || null,
  cancellationRequest: order.cancellationRequest || null,
  cancellationReason: order.cancellationReason || "",
});

function MyOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { isAuthenticated } = useUser();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancellingOrderId, setCancellingOrderId] = useState("");

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status") || "all";
    setStatusFilter(VALID_ORDER_STATUSES.includes(status) ? status : "all");
  }, [location.search]);

  useEffect(() => {
    let mounted = true;

    const loadOrders = async () => {
      try {
        const response = await apiRequest(`/orders/me?ts=${Date.now()}`);
        if (!mounted) return;
        const normalized = (response.orders || []).map(normalizeCustomerOrder);
        setOrders(normalized);
      } catch (_error) {
        if (!mounted) return;
        // Orders are always sourced from the backend. Falling back to a
        // browser copy can show an outdated or duplicate transaction after
        // payments, cancellations, dispatch, or installation updates.
        setOrders([]);
      }
    };

    loadOrders();
    const pollId = window.setInterval(loadOrders, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadOrders();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleTrack = (order) => {
    setSelectedOrder(order);
    setShowTrackModal(true);
  };

  const handleReorder = (order) => {
    order.items.forEach((item) => {
      addToCart(
        {
          id: item.productId || item.id,
          name: item.name,
          icon: item.icon,
          price: item.price,
          specs: item.specs,
          category: item.category || "product",
        },
        item.quantity,
      );
    });
    alert("Items added to cart!");
    navigate("/shop");
  };

  const handleReceipt = (order) => {
    navigate(`/receipt/${encodeURIComponent(order.id)}`);
  };

  const handleCancelRequest = async (order) => {
    const reason = window.prompt(
      "Please enter a short cancellation reason.",
      order.paymentProvider === "paymongo" && order.paymentStatus === "paid"
        ? "Requesting cancellation and refund review."
        : "Customer requested cancellation.",
    );
    if (reason === null) return;

    try {
      setCancellingOrderId(String(order.id));
      const response = await apiRequest(`/orders/me/${encodeURIComponent(order.id)}/cancel-request`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      if (response.order) {
        const updated = normalizeCustomerOrder(response.order);
        setOrders((current) =>
          current.map((item) => (String(item.id) === String(order.id) ? updated : item)),
        );
      }
      alert(response.message || "Cancellation request submitted.");
    } catch (error) {
      alert(error?.message || "Unable to request cancellation.");
    } finally {
      setCancellingOrderId("");
    }
  };

  const handleBack = () => {
    navigate("/home");
  };

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title="My Orders"
        leftAction="back"
        onLeftAction={handleBack}
        isAuthenticated={isAuthenticated}
      />

      <BoutiqueBox
        direction="column"
        flex={1}
        width="100%"
        padding="40px 24px"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        <BoutiqueBox
          direction="row"
          align="center"
          justify="space-between"
          margin="0 0 32px"
        >
          <BoutiqueStack gap={4}>
            <BoutiqueText variant="h2">Order History</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted} size="14px">
              Review and track your boutique orders.
            </BoutiqueText>
          </BoutiqueStack>
        </BoutiqueBox>

        <BoutiqueBox
          direction="row"
          gap={8}
          margin="0 0 40px"
          padding="4px"
          background={BQ_COLORS.surfaceAlt}
          style={{ borderRadius: BQ_GEOMETRY.radiusPill, overflowX: "auto" }}
          className="bq-hide-scrollbar"
        >
          {["all", "to_pay", "to_deliver", "to_install", "complete", "cancelled"].map(
            (status) => (
              <button
                key={status}
                type="button"
                className={`bq-filter-pill ${statusFilter === status ? "active" : ""}`}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: "10px 24px",
                  border: "none",
                  background: statusFilter === status ? "white" : "transparent",
                  color:
                    statusFilter === status
                      ? BQ_COLORS.brand
                      : BQ_COLORS.inkMuted,
                  borderRadius: BQ_GEOMETRY.radiusPill,
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                  boxShadow:
                    statusFilter === status
                      ? "0 4px 12px rgba(0,0,0,0.05)"
                      : "none",
                }}
              >
                {status === "all"
                  ? "All Orders"
                  : status
                      .replace("_", " ")
                      .replace(/\b\w/g, (ch) => ch.toUpperCase())}
              </button>
            ),
          )}
        </BoutiqueBox>

        <BoutiqueStack gap={24} className="orders-main">
          {orders.length === 0 ? (
            <BoutiqueBox
              align="center"
              justify="center"
              padding={60}
              background="white"
              style={{
                borderRadius: "24px",
                border: `1px dashed ${BQ_COLORS.border}`,
              }}
            >
              <BoutiqueStack gap={20} align="center">
                <ShoppingBag
                  size={64}
                  weight="bold"
                  color={BQ_COLORS.inkFaint}
                />
                <BoutiqueText variant="h3">No Orders Yet</BoutiqueText>
                <BoutiqueText
                  color={BQ_COLORS.inkMuted}
                  align="center"
                  style={{ maxWidth: "320px" }}
                >
                  Start your boutique experience by exploring our premium AC
                  collections.
                </BoutiqueText>
                <BoutiqueButton
                  variant="primary"
                  onClick={() => navigate("/shop")}
                  style={{ width: "auto", marginTop: "12px" }}
                >
                  Start Shopping
                </BoutiqueButton>
              </BoutiqueStack>
            </BoutiqueBox>
          ) : filteredOrders.length === 0 ? (
            <BoutiqueBox
              align="center"
              justify="center"
              padding={60}
              color={BQ_COLORS.inkMuted}
            >
              <WarningDiamond size={48} weight="bold" />
              <BoutiqueText variant="h3" margin="16px 0 8px">
                No matching orders
              </BoutiqueText>
              <BoutiqueText>
                Try a different filter to see your other orders.
              </BoutiqueText>
            </BoutiqueBox>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onTrack={handleTrack}
                onReorder={handleReorder}
                onReceipt={handleReceipt}
                onCancelRequest={handleCancelRequest}
                cancelling={cancellingOrderId === String(order.id)}
              />
            ))
          )}
        </BoutiqueStack>
      </BoutiqueBox>

      {showTrackModal && selectedOrder && (
        <TrackOrderModal
          order={selectedOrder}
          onClose={() => {
            setShowTrackModal(false);
            setSelectedOrder(null);
          }}
        />
      )}
      <BoutiqueFooter />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-hide-scrollbar::-webkit-scrollbar { display: none; }
        .bq-hide-scrollbar { scrollbar-width: none; }
        .bq-filter-pill:hover:not(.active) { color: ${BQ_COLORS.brand} !important; }
      `,
        }}
      />
    </BoutiqueScreen>
  );
}

export default MyOrders;
