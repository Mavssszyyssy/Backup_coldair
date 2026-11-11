import { ShoppingBag, WarningDiamond } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { openOnlineCheckout } from "../../domain/checkout/openOnlineCheckout";
import { resolveReorderCartProduct } from "../../domain/cart/catalogCartProduct";
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";
import { translateText } from "../../utils/customerI18n";
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
import CancelOrderDialog from "./CancelOrderDialog";
import "./MyOrders.css";

const VALID_ORDER_STATUSES = [
  "all",
  "to_pay",
  "to_deliver",
  "to_dispatch",
  "to_install",
  "for_rescheduling",
  "complete",
  "cancelled",
];

const orderStatusFromSearch = (search) => {
  const status = new URLSearchParams(search).get("status");
  return VALID_ORDER_STATUSES.includes(status) ? status : "all";
};

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
  installationTimeSlot: order.installationTimeSlot || "",
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
  const { isAuthenticated, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [orders, setOrders] = useState([]);
  const [settledQuery, setSettledQuery] = useState(null);
  const [ordersError, setOrdersError] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => orderStatusFromSearch(location.search));
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [cancelOrder, setCancelOrder] = useState(null);
  const [payingOrderId, setPayingOrderId] = useState("");
  const [reorderingOrderId, setReorderingOrderId] = useState("");

  const limit = pagination.limit;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (statusFilter !== "all") params.set("orderStatus", statusFilter);
  if (paymentFilter) params.set("paymentStatus", paymentFilter);
  if (dateFilter) params.set("dateRange", dateFilter);
  if (search) params.set("search", search);
  const orderQuery = params.toString();
  const ordersLoading = settledQuery !== orderQuery;
  const hasFilters = statusFilter !== "all" || Boolean(paymentFilter || dateFilter || search);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim().slice(0, 80));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setStatusFilter(orderStatusFromSearch(location.search));
    setPage(1);
  }, [location.search]);

  useEffect(() => {
    const orderId = new URLSearchParams(location.search).get("orderId");
    if (!orderId) return undefined;
    let active = true;
    apiRequest(`/orders/me/${encodeURIComponent(orderId)}`)
      .then((response) => {
        if (!active || !response.order) return;
        const order = normalizeCustomerOrder(response.order);
        setSelectedOrder(order);
        setShowTrackModal(true);
      })
      .catch(() => {
        if (active) setShowTrackModal(false);
      });
    return () => { active = false; };
  }, [location.search]);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;
    let hasLoaded = false;

    const loadOrders = async () => {
      const currentRequest = ++requestId;
      try {
        const response = await apiRequest(`/orders/me?${orderQuery}`);
        if (!mounted || currentRequest !== requestId) return;
        if (!Array.isArray(response?.orders)) throw new Error("Missing order history");
        const normalized = response.orders.map(normalizeCustomerOrder);
        hasLoaded = true;
        setOrders(normalized);
        setPagination(response.pagination || { total: normalized.length, totalPages: 1, limit });
        setOrdersError(false);
        setSelectedOrder((current) => current ? normalized.find((order) => String(order.id) === String(current.id)) || current : null);
      } catch (_error) {
        if (!mounted || currentRequest !== requestId) return;
        // Orders are always sourced from the backend. Falling back to a
        // browser copy can show an outdated or duplicate transaction after
        // payments, cancellations, dispatch, or installation updates.
        if (!hasLoaded) setOrders([]);
        setOrdersError(true);
      } finally {
        if (mounted && currentRequest === requestId) setSettledQuery(orderQuery);
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
      requestId += 1;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [limit, orderQuery]);

  const updateOrderFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const handleTrack = (order) => {
    setSelectedOrder(order);
    setShowTrackModal(true);
  };

  const handleReorder = async (order) => {
    if (reorderingOrderId) return;
    setReorderingOrderId(String(order.id));

    let catalogProducts = [];
    try {
      const response = await apiRequest("/products/public", { silentConnection: true });
      catalogProducts = response.products || [];
    } catch (error) {
      console.warn("Could not refresh catalogue details for reorder", error);
    }

    order.items.forEach((item) => {
      addToCart(
        resolveReorderCartProduct(item, catalogProducts),
        item.quantity,
      );
    });
    alert(t("Items added to cart!"));
    setReorderingOrderId("");
    navigate("/shop");
  };

  const handleReceipt = (order) => {
    navigate(`/receipt/${encodeURIComponent(order.id)}`);
  };

  const handlePayAgain = async (order) => {
    setPayingOrderId(String(order.id));
    try {
      const response = await apiRequest(`/orders/${encodeURIComponent(order.id)}/paymongo/checkout`, {
        method: "POST",
      });
      const paymentUrl = response.payment?.checkoutUrl || response.order?.paymentUrl || response.order?.paymongo?.checkoutUrl || "";
      if (!paymentUrl) throw new Error(t("A secure payment link was not returned."));
      openOnlineCheckout(paymentUrl, order.id);
    } catch (error) {
      alert(error?.message || t("Unable to open secure payment."));
    } finally {
      setPayingOrderId("");
    }
  };

  const handleCancelRequest = async (order, reason) => {
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
      alert(response.message || t("Cancellation request submitted."));
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
        title={t("My Orders")}
        leftAction="back"
        onLeftAction={handleBack}
        isAuthenticated={isAuthenticated}
      />

      <BoutiqueBox
        tag="main"
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
            <BoutiqueText variant="h2">{t("Order History")}</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted} size="14px">
              {t("Check your orders, payments, and delivery updates.")}
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
          {["all", "to_pay", "to_deliver", "to_dispatch", "to_install", "for_rescheduling", "complete", "cancelled"].map(
            (status) => (
              <button
                key={status}
                type="button"
                className={`bq-filter-pill ${statusFilter === status ? "active" : ""}`}
                onClick={() => updateOrderFilter(setStatusFilter, status)}
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
                {t(({ all: "All Orders", to_pay: "Awaiting payment", to_deliver: "Delivery", to_dispatch: "To Dispatch", to_install: "Installation", for_rescheduling: "For Rescheduling", complete: "Completed", cancelled: "Cancelled" })[status])}
              </button>
            ),
          )}
        </BoutiqueBox>

        <section className="customer-orders-filter-panel" aria-label={t("Filter orders")}>
          <label className="customer-orders-search">
            <span>{t("Search orders")}</span>
            <input
              type="search"
              value={searchDraft}
              maxLength={80}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder={t("Search order code or AC unit")}
            />
          </label>
          <label>
            <span>{t("Payment status")}</span>
            <select value={paymentFilter} onChange={(event) => updateOrderFilter(setPaymentFilter, event.target.value)}>
              <option value="">{t("All payment statuses")}</option>
              {["pending", "paid", "failed", "cancelled", "expired", "not_required"].map((value) => (
                <option key={value} value={value}>{t(({ pending: "Pending", paid: "Paid", failed: "Failed", cancelled: "Cancelled", expired: "Expired", not_required: "No payment required" })[value])}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Order date")}</span>
            <select value={dateFilter} onChange={(event) => updateOrderFilter(setDateFilter, event.target.value)}>
              <option value="">{t("Any date")}</option>
              <option value="30d">{t("Last 30 days")}</option>
              <option value="90d">{t("Last 90 days")}</option>
            </select>
          </label>
        </section>
        {!ordersLoading && !ordersError ? <div className="customer-orders-result-count" aria-live="polite">
          {`${pagination.total ? (page - 1) * pagination.limit + 1 : 0}–${Math.min(page * pagination.limit, pagination.total)} ${t("of")} ${pagination.total} ${t("orders")}`}
        </div> : null}

        <BoutiqueStack gap={24} className="orders-main">
          {ordersLoading ? (
            <div role="status" className="orders-loading-skeleton">
              <span>{t("Loading orders...")}</span>
              {[1, 2, 3].map((row) => <div key={row} className="orders-skeleton-card" aria-hidden="true"><i /><i /><i /></div>)}
            </div>
          ) : ordersError && orders.length === 0 ? (
            <BoutiqueBox padding={32} role="alert">{t("Unable to load orders. Please try again.")}</BoutiqueBox>
          ) : orders.length === 0 && !hasFilters ? (
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
                <BoutiqueText variant="h3">{t("No Orders Yet")}</BoutiqueText>
                <BoutiqueText
                  color={BQ_COLORS.inkMuted}
                  align="center"
                  style={{ maxWidth: "320px" }}
                >
                  {t("Browse our AC products to place your first order.")}
                </BoutiqueText>
                <BoutiqueButton
                  variant="primary"
                  onClick={() => navigate("/shop")}
                  style={{ width: "auto", marginTop: "12px" }}
                >
                  {t("Start Shopping")}
                </BoutiqueButton>
              </BoutiqueStack>
            </BoutiqueBox>
          ) : orders.length === 0 ? (
            <BoutiqueBox
              align="center"
              justify="center"
              padding={60}
              color={BQ_COLORS.inkMuted}
            >
              <WarningDiamond size={48} weight="bold" />
              <BoutiqueText variant="h3" margin="16px 0 8px">
                {t("No matching orders")}
              </BoutiqueText>
              <BoutiqueText>
                {t("Try a different filter to see your other orders.")}
              </BoutiqueText>
            </BoutiqueBox>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onTrack={handleTrack}
                onReorder={handleReorder}
                onReceipt={handleReceipt}
                onCancelRequest={setCancelOrder}
                cancelling={cancellingOrderId === String(order.id)}
                paying={payingOrderId === String(order.id)}
                reordering={reorderingOrderId === String(order.id)}
                onPayAgain={handlePayAgain}
              />
            ))
          )}
        </BoutiqueStack>
        {pagination.totalPages > 1 ? (
          <nav className="customer-orders-pagination" aria-label={t("Order pages")}>
            <BoutiqueButton variant="outline" disabled={page <= 1 || ordersLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>{t("Previous")}</BoutiqueButton>
            <BoutiqueText aria-live="polite">{t("Page")} {page} {t("of")} {pagination.totalPages}</BoutiqueText>
            <BoutiqueButton variant="outline" disabled={page >= pagination.totalPages || ordersLoading} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}>{t("Next")}</BoutiqueButton>
          </nav>
        ) : null}
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
      {cancelOrder && <CancelOrderDialog order={cancelOrder} onClose={() => setCancelOrder(null)} onConfirm={handleCancelRequest} />}
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
