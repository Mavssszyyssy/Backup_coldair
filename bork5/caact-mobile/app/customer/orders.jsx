import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
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
  BQ_SPACING,
} from "../../components/boutique";
import { useUserContext } from "../../context/UserContext";
import { formatPeso } from "../../services/ecommerceService";
import { getOrdersByUser } from "../../services/orderStorage";

function statusVariant(status = "") {
  const value = status.toLowerCase();
  if (value.includes("approved") || value.includes("released") || value.includes("delivered")) return "success";
  if (value.includes("rejected") || value.includes("cancelled") || value.includes("failed")) return "danger";
  return "warning";
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

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [orders, setOrders] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getOrdersByUser(current).then((items) => {
        if (active) setOrders(items);
      });
      return () => {
        active = false;
      };
    }, [current]),
  );

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

            return (
              <BoutiqueCard key={order.id} style={{ gap: BQ_SPACING.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: BQ_SPACING.md }}>
                  <View style={{ flex: 1 }}>
                    <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                      Order #{String(order.id).slice(-8).toUpperCase()}
                    </BoutiqueText>
                    <BoutiqueText variant="h2">{formatPeso(order.total)}</BoutiqueText>
                  </View>
                  <BoutiqueChip label={order.status} variant={variant} />
                </View>

                <BoutiqueText color={BQ_COLORS.inkMuted}>
                  {itemCount} item{itemCount === 1 ? "" : "s"} submitted{" "}
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                </BoutiqueText>

                <View style={{ gap: BQ_SPACING.md }}>
                  <OrderProgressRow icon="bicycle-sharp" title="Delivery" subtitle={order.deliveryStatus} />
                  <OrderProgressRow icon="card-sharp" title="Payment" subtitle={order.paymentStatus} color={BQ_COLORS.success} />
                  {order.trackingNumber ? (
                    <OrderProgressRow icon="navigate-sharp" title="Tracking" subtitle={order.trackingNumber} color={BQ_COLORS.warning} />
                  ) : null}
                </View>
              </BoutiqueCard>
            );
          })
        )}
      </BoutiqueScreen>
    </>
  );
}
