import {
  ChatCircleText,
  Clock,
  Package,
  Question,
  Receipt,
  Truck,
  Wrench,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
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
  paymentMethod: String(order.paymentMethod || ""),
  receipt: order.receipt || null,
  items: Array.isArray(order.items) ? order.items : [],
});

const orderCategoryConfig = {
  to_pay: {
    label: "To Pay",
    icon: Receipt,
    description: "Unpaid orders",
  },
  to_deliver: {
    label: "To Deliver",
    icon: Truck,
    description: "Pending delivery",
  },
  to_install: {
    label: "To Install",
    icon: Wrench,
    description: "Awaiting installation",
  },
  complete: {
    label: "Completed",
    icon: Package,
    description: "Finished orders",
  },
};

const getOrderCategory = (order) => {
  const status = order.workflowStatus;
  if (status === "to_deliver") return "to_deliver";
  if (status === "to_install") return "to_install";
  if (status === "complete") return "complete";
  return "to_pay";
};

const getCategoryCount = (orders, category) =>
  orders.filter((order) => getOrderCategory(order) === category).length;

function ProfileCenter() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadOrders = async () => {
      setOrdersLoading(true);
      try {
        const response = await apiRequest("/orders/me");
        if (!mounted) return;
        setOrders((response.orders || []).map(normalizeOrder));
      } catch (_error) {
        if (!mounted) return;
        setOrders([]);
      } finally {
        if (mounted) setOrdersLoading(false);
      }
    };

    loadOrders();

    const pollId = window.setInterval(loadOrders, 25000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadOrders();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const orderStats = useMemo(
    () => [
      {
        key: "to_pay",
        ...orderCategoryConfig.to_pay,
        count: getCategoryCount(orders, "to_pay"),
      },
      {
        key: "to_deliver",
        ...orderCategoryConfig.to_deliver,
        count: getCategoryCount(orders, "to_deliver"),
      },
      {
        key: "to_install",
        ...orderCategoryConfig.to_install,
        count: getCategoryCount(orders, "to_install"),
      },
      {
        key: "complete",
        ...orderCategoryConfig.complete,
        count: getCategoryCount(orders, "complete"),
      },
    ],
    [orders],
  );

  const displayName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title="Profile Center"
        leftAction="back"
        onLeftAction={() => navigate("/home")}
      />

      <BoutiqueBox
        direction="column"
        flex={1}
        width="100%"
        padding="40px 24px"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        <BoutiqueStack gap={40}>
          {/* HERO SECTION */}
          <BoutiqueCard padding={40}>
            <BoutiqueBox
              direction="row"
              align="center"
              gap={32}
              className="profile-hero"
            >
              <BoutiqueBox
                width={100}
                height={100}
                background={BQ_COLORS.bg}
                align="center"
                justify="center"
                style={{
                  borderRadius: "30px",
                  boxShadow: BQ_SHADOWS.soft,
                  color: BQ_COLORS.brand,
                }}
              >
                <BoutiqueText size="40px" weight={900}>
                  {displayName.charAt(0).toUpperCase()}
                </BoutiqueText>
              </BoutiqueBox>
              <BoutiqueBox flex={1}>
                <BoutiqueText variant="label" color={BQ_COLORS.accent}>
                  Boutique Account
                </BoutiqueText>
                <BoutiqueText variant="h1" margin="4px 0 8px">
                  {displayName}
                </BoutiqueText>
                <BoutiqueText color={BQ_COLORS.inkMuted} weight={500}>
                  Manage your orders, installations, and support requests.
                </BoutiqueText>
                <BoutiqueBox direction="row" gap={12} margin="24px 0 0">
                  <BoutiqueButton
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/contact")}
                  >
                    <Question size={18} weight="bold" /> Help Center
                  </BoutiqueButton>
                  <BoutiqueButton
                    variant="primary"
                    size="sm"
                    onClick={() => navigate("/contact")}
                  >
                    <ChatCircleText size={18} weight="bold" /> Chat Support
                  </BoutiqueButton>
                </BoutiqueBox>
              </BoutiqueBox>
            </BoutiqueBox>
          </BoutiqueCard>

          {/* PURCHASES SECTION */}
          <BoutiqueStack gap={24}>
            <BoutiqueBox direction="row" align="center" justify="space-between">
              <BoutiqueStack gap={4}>
                <BoutiqueText variant="h2">My Purchases</BoutiqueText>
                <BoutiqueText color={BQ_COLORS.inkMuted} size="14px">
                  Real-time status of your boutique orders
                </BoutiqueText>
              </BoutiqueStack>
              <BoutiqueButton
                variant="ghost"
                size="sm"
                onClick={() => navigate("/my-orders")}
              >
                View all orders
              </BoutiqueButton>
            </BoutiqueBox>

            <BoutiqueGrid
              columns="repeat(auto-fit, minmax(240px, 1fr))"
              gap={20}
            >
              {orderStats.map((stat) => (
                <BoutiqueCard
                  key={stat.key}
                  padding={24}
                  style={{ cursor: "pointer", transition: "all 0.3s ease" }}
                  className="order-stat-card"
                  onClick={() => navigate(`/my-orders?status=${stat.key}`)}
                >
                  <BoutiqueBox direction="row" align="center" gap={16}>
                    <BoutiqueBox
                      width={48}
                      height={48}
                      background={BQ_COLORS.bg}
                      align="center"
                      justify="center"
                      style={{ borderRadius: "14px", color: BQ_COLORS.brand }}
                    >
                      <stat.icon size={24} weight="bold" />
                    </BoutiqueBox>
                    <BoutiqueBox flex={1}>
                      <BoutiqueText
                        size="13px"
                        weight={700}
                        color={BQ_COLORS.inkMuted}
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {stat.label}
                      </BoutiqueText>
                      <BoutiqueText variant="h2">{stat.count}</BoutiqueText>
                    </BoutiqueBox>
                  </BoutiqueBox>
                </BoutiqueCard>
              ))}
            </BoutiqueGrid>

            {ordersLoading && (
              <BoutiqueBox
                direction="row"
                align="center"
                justify="center"
                padding={40}
                gap={12}
                color={BQ_COLORS.inkMuted}
              >
                <Clock size={20} weight="bold" />
                <BoutiqueText weight={600}>
                  Syncing order status...
                </BoutiqueText>
              </BoutiqueBox>
            )}
          </BoutiqueStack>
        </BoutiqueStack>
      </BoutiqueBox>

      <BoutiqueFooter />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .order-stat-card:hover { transform: translateY(-4px); border-color: ${BQ_COLORS.brand}; box-shadow: ${BQ_SHADOWS.hover}; }

        @media (max-width: 768px) {
          .profile-hero { flex-direction: column !important; align-items: flex-start !important; }
        }
      `,
        }}
      />
    </BoutiqueScreen>
  );
}

export default ProfileCenter;
