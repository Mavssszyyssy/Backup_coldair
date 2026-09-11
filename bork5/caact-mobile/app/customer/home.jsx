import Ionicons from "@expo/vector-icons/Ionicons";
import NotificationBadge from "../../components/NotificationBadge";
import { useFocusEffect, useRouter } from "expo-router";
import { startLiveRefresh } from "../../services/liveRefresh";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import CustomerMetricPill from "../../components/customer/CustomerMetricPill";
import CustomerScreen from "../../components/customer/CustomerScreen";
import CustomerSectionHeader from "../../components/customer/CustomerSectionHeader";
import CustomerUnitRow from "../../components/customer/CustomerUnitRow";
import AppHero from "../../components/ui/AppHero";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import BottomSheetSelect from "../../components/ui/BottomSheetSelect";
import EmptyState from "../../components/ui/EmptyState";
import IconRow from "../../components/ui/IconRow";
import StatusChip from "../../components/ui/StatusChip";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
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
import { filterCustomerUnits, sortCustomerUnits } from "../../services/unitDisplayService";

const UNIT_SORT_OPTIONS = [
  { id: "newest", name: "Newest purchase first" },
  { id: "oldest", name: "Oldest purchase first" },
  { id: "name", name: "Name A–Z" },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [units, setUnits] = useState([]);
  const [recommendationMap, setRecommendationMap] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unitSearch, setUnitSearch] = useState("");
  const [unitSort, setUnitSort] = useState("newest");

  const visibleUnits = useMemo(
    () => sortCustomerUnits(filterCustomerUnits(units, unitSearch), unitSort),
    [unitSearch, unitSort, units],
  );
  const newestUnitId = useMemo(() => sortCustomerUnits(units, "newest")[0]?.id || "", [units]);
  const selectedSort = UNIT_SORT_OPTIONS.find((item) => item.id === unitSort) || UNIT_SORT_OPTIONS[0];

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      const load = () => {
        return Promise.allSettled([
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
        }).finally(() => {
          if (active) setLoading(false);
        });
      };
      const stop = startLiveRefresh(load);

      return () => {
        active = false;
        stop();
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
          <NotificationBadge />
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
        <CustomerMetricPill label="AC Units" value={loading ? "—" : units.length} icon="snow-sharp" color={COLORS.primary} />
        <View style={{ width: 1, alignSelf: "stretch", backgroundColor: COLORS.border }} />
        <CustomerMetricPill label="Active Orders" value={loading ? "—" : activeOrderCount} icon="receipt-sharp" color={COLORS.success} />
      </View>

      {loading ? (
        <Card>
          <View style={{ alignItems: "center", gap: SPACING.sm, paddingVertical: SPACING.lg }}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={{ color: COLORS.textSecondary }}>Loading your latest account activity...</Text>
          </View>
        </Card>
      ) : units.length === 0 ? (
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
            right={<StatusChip label={`${units.length} unit${units.length === 1 ? "" : "s"}`} color={COLORS.primary} />}
          />
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginBottom: SPACING.sm }}>
            Newest purchase appears first. Search by model, serial number, order number, branch, or address.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.borderInput, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.sm, marginBottom: SPACING.sm }}>
            <Ionicons name="search-sharp" size={18} color={COLORS.textMuted} />
            <TextInput
              value={unitSearch}
              onChangeText={setUnitSearch}
              placeholder="Find an AC unit"
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="search"
              style={{ flex: 1, minHeight: 46, paddingHorizontal: SPACING.sm, color: COLORS.textPrimary, fontSize: FONT.base }}
              accessibilityLabel="Search registered AC units"
            />
            {unitSearch ? (
              <Pressable onPress={() => setUnitSearch("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear AC unit search">
                <Ionicons name="close-circle-sharp" size={19} color={COLORS.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <BottomSheetSelect
            label="Arrange units"
            value={selectedSort.name}
            items={UNIT_SORT_OPTIONS}
            itemIcon="funnel-sharp"
            searchPlaceholder="Search arrangement options"
            onSelect={(item) => setUnitSort(item.id)}
          />
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.bold, marginBottom: SPACING.xs }}>
            Showing {visibleUnits.length} of {units.length}
          </Text>
          {visibleUnits.length === 0 ? (
            <EmptyState
              title="No matching AC unit"
              message="Try a different model, serial number, order number, branch, or address."
              icon="search-sharp"
              iconColor={COLORS.primary}
              action={<Button title="Clear Search" variant="secondary" onPress={() => setUnitSearch("")} />}
            />
          ) : visibleUnits.map((unit, index) => (
            (() => {
              const recommendation = recommendationMap[String(unit.id)];
              const maintenance = buildNextRecommendedMaintenance(recommendation);

              return (
                <CustomerUnitRow
                  key={unit.id}
                  unit={unit}
                  position={index + 1}
                  isNewest={unit.id === newestUnitId}
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
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={{ color: COLORS.textSecondary }}>Loading recent orders...</Text>
          </View>
        ) : recentOrders.length === 0 ? (
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
