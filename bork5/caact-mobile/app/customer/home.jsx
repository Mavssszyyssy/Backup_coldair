import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, Text, View } from "react-native";

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
import { COLD_AIR_WEBSITE } from "../../constants/company";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import {
  getCustomerServiceHistory,
  getCustomerServiceStats,
} from "../../services/customerHistoryService";
import { getOrdersByUser } from "../../services/orderStorage";
import { getDisplayName } from "../../services/profileService";
import {
  buildNextRecommendedMaintenance,
  buildUnitHealthMap,
} from "../../services/acHealthScoreService";
import {
  ensureSeededCustomerUnit,
  getUnitsByUser,
} from "../../services/unitStorage";

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [units, setUnits] = useState([]);
  const [healthMap, setHealthMap] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [requestStats, setRequestStats] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([
        ensureSeededCustomerUnit(current).then(() => getUnitsByUser(current?.id)),
        getOrdersByUser(current),
        getCustomerServiceHistory(current?.id),
      ]).then(([nextUnits, nextOrders, history]) => {
        if (!active) return;
        setUnits(nextUnits);
        setHealthMap(
          buildUnitHealthMap(
            nextUnits,
            history.requests,
            history.linkedTasks,
          ),
        );
        setRecentOrders(nextOrders.slice(0, 3));
        setRequestStats(
          getCustomerServiceStats(history.requests, history.completedServices),
        );
      });

      return () => {
        active = false;
      };
    }, [current]),
  );

  return (
    <CustomerScreen
      title="Home"
      subtitle={`Welcome back, ${getDisplayName(current)}`}
    >
      <AppHero
        eyebrow="Cold Air ACT"
        title="Your AC dashboard"
        subtitle="Manage your AC units, track service requests, and get support in one place."
        icon="snow-sharp"
      >
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button
            title="Book Service"
            onPress={() => router.push("/customer/services")}
            variant="secondary"
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="calendar-sharp" size={18} color={COLORS.primary} />}
          />
          <Button
            title="Website"
            onPress={() => Linking.openURL(COLD_AIR_WEBSITE)}
            variant="secondary"
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="globe-sharp" size={18} color={COLORS.primary} />}
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
        <CustomerMetricPill
          label="Requests"
          value={requestStats?.totalRequests || 0}
          icon="time-sharp"
          color={COLORS.warning}
        />
        <CustomerMetricPill
          label="Completed"
          value={requestStats?.completedServices || 0}
          icon="checkmark-done-sharp"
          color={COLORS.success}
        />
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
                title="Go to Website"
                onPress={() => Linking.openURL(COLD_AIR_WEBSITE)}
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
              const health = healthMap[String(unit.id)];
              const maintenance = buildNextRecommendedMaintenance(health);

              return (
                <CustomerUnitRow
                  key={unit.id}
                  unit={unit}
                  health={health}
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
            />
          ))
        )}
      </Card>
    </CustomerScreen>
  );
}
