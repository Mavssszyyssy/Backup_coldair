import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import CustomerMetricPill from "../../components/customer/CustomerMetricPill";
import CustomerScreen from "../../components/customer/CustomerScreen";
import CustomerSectionHeader from "../../components/customer/CustomerSectionHeader";
import CustomerUnitRow from "../../components/customer/CustomerUnitRow";
import AppHero from "../../components/ui/AppHero";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import IconRow from "../../components/ui/IconRow";
import StatusChip from "../../components/ui/StatusChip";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import {
  getCustomerServiceHistory,
} from "../../services/customerHistoryService";
import { getOrdersByUser } from "../../services/orderStorage";
import { getDisplayName } from "../../services/profileService";
import {
  buildNextRecommendedMaintenance,
  buildUnitRecommendationMap,
} from "../../services/maintenanceRecommendationService";
import { getUnitsByUser } from "../../services/unitStorage";

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [units, setUnits] = useState([]);
  const [recommendationMap, setRecommendationMap] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeOrderCount, setActiveOrderCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () => {
        Promise.allSettled([
          getUnitsByUser(current?.id),
          getOrdersByUser(current),
          getCustomerServiceHistory(current?.id),
        ]).then(([unitsResult, ordersResult, historyResult]) => {
          if (!active) return;
          if (unitsResult.status === "fulfilled") {
            const nextUnits = unitsResult.value;
            setUnits(nextUnits);
            const history = historyResult.status === "fulfilled" ? historyResult.value : { requests: [], linkedTasks: [] };
            setRecommendationMap(buildUnitRecommendationMap(nextUnits, history.requests || [], history.linkedTasks || []));
          }
          if (ordersResult.status === "fulfilled") {
            const nextOrders = ordersResult.value;
            setRecentOrders(nextOrders.slice(0, 3));
            setActiveOrderCount(nextOrders.filter((order) => !["complete", "completed", "cancelled"].includes(String(order.workflowStatus || order.status || "").toLowerCase())).length);
          }
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

  return (
    <CustomerScreen
      title="Home"
      subtitle={`Welcome back, ${getDisplayName(current)}`}
      right={
        <Pressable onPress={() => router.push("/customer/notifications")} hitSlop={12} accessibilityRole="button" accessibilityLabel="Notifications">
          <Ionicons name="notifications-sharp" size={24} color={COLORS.primary} />
        </Pressable>
      }
    >
      <AppHero
        eyebrow="Cold Air ACT"
        title="Your AC dashboard"
        subtitle="Manage your AC units and get support in one place."
        icon="snow-sharp"
      >
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button
            title="Shop AC Units"
            onPress={() => router.push("/customer/shop")}
            variant="secondary"
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="bag-handle-sharp" size={18} color={COLORS.primary} />}
            rightIcon={<Ionicons name="chevron-forward-sharp" size={18} color={COLORS.primary} />}
          />
          <Button
            title="Book Service"
            onPress={() => router.push("/customer/services")}
            variant="secondary"
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="calendar-sharp" size={18} color={COLORS.primary} />}
            rightIcon={<Ionicons name="chevron-forward-sharp" size={18} color={COLORS.primary} />}
          />
        </View>
      </AppHero>

      <View
        style={{
          flexDirection: "row",
          marginBottom: SPACING.md,
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          paddingVertical: SPACING.sm,
        }}
      >
        <CustomerMetricPill label="AC Units" value={units.length} icon="snow-sharp" color={COLORS.primary} />
        <View style={{ width: 1, alignSelf: "stretch", backgroundColor: COLORS.border }} />
        <CustomerMetricPill label="Active Orders" value={activeOrderCount} icon="receipt-sharp" color={COLORS.success} />
      </View>

      {units.length === 0 ? (
        <Card>
          <EmptyState
            title="No AC units registered yet"
            message="Buy from coldair-act.online, then come back here to manage your AC units and request service."
            icon="snow-sharp"
            iconColor={COLORS.primary}
            action={
              <Button
                title="Browse AC Units"
                onPress={() => router.push("/customer/shop")}
                rightIcon={<Ionicons name="arrow-forward-sharp" size={18} color={COLORS.surface} />}
              />
            }
          />
        </Card>
      ) : (
        <Card>
          <CustomerSectionHeader
            title="Registered AC Units"
            right={<StatusChip label={`${units.length} active`} color={COLORS.primary} />}
          />
          {units.map((unit) => (
            (() => {
              const recommendation = recommendationMap[String(unit.id)];
              const maintenance = buildNextRecommendedMaintenance(recommendation);

              return (
                <CustomerUnitRow
                  key={unit.id}
                  unit={unit}
                  recommendation={recommendation}
                  maintenance={maintenance}
                  onPress={() => router.push(`/customer/units/${unit.id}`)}
                />
              );
            })()
          ))}
        </Card>
      )}

      <Card>
        <CustomerSectionHeader
          title="Recent Orders"
          actionLabel="View all"
          onAction={() => router.push("/customer/orders")}
        />
        {recentOrders.length === 0 ? (
          <Text style={{ color: COLORS.textSecondary }}>No website orders found yet.</Text>
        ) : (
          recentOrders.map((order) => (
            <IconRow
              key={order.id}
              icon="receipt-sharp"
              title={`Order #${String(order.id).slice(-6).toUpperCase()}`}
              subtitle={`${order.items.length} item(s) • ${order.status}`}
              color={COLORS.success}
              onPress={() => router.push("/customer/orders")}
              accessibilityLabel={`View order ${order.orderCode || order.id}`}
            />
          ))
        )}
      </Card>
    </CustomerScreen>
  );
}
