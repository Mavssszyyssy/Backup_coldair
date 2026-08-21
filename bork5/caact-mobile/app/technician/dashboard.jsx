import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, View } from "react-native";

import TechButton from "../../components/technician/TechButton";
import TechnicianScreen, { TechHero } from "../../components/technician/TechnicianScreen";
import Card from "../../components/ui/Card";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { getDisplayName } from "../../services/profileService";
import { getTasksByTechnician, getTaskStats } from "../../services/taskStorage";

function MetricCard({ label, value, icon, color }) {
  return (
    <View style={{ flex: 1, minHeight: 104, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, justifyContent: "space-between" }}>
      <View style={{ width: 34, height: 34, borderRadius: RADIUS.md, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={{ color, fontSize: FONT.xxl, fontWeight: FONT.black }}>{value}</Text>
        <Text numberOfLines={1} style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{label}</Text>
      </View>
    </View>
  );
}

function DashboardLink({ title, subtitle, icon, onPress, accent = COLORS.tech }) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={title}
      style={{ padding: SPACING.md - 2, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: accent }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: `${accent}16`, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
          <Ionicons name={icon} size={21} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>{title}</Text>
          <Text numberOfLines={2} style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2, lineHeight: 17 }}>{subtitle}</Text>
        </View>
        <View style={{ width: 30, height: 30, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt, alignItems: "center", justifyContent: "center", marginLeft: SPACING.sm }}>
          <Ionicons name="chevron-forward-sharp" size={18} color={COLORS.textMuted} />
        </View>
      </View>
    </Card>
  );
}

export default function TechDashboard() {
  const router = useRouter();
  const { current } = useUserContext();
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [workOrders, setWorkOrders] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      if (!current?.id) return;
      getTasksByTechnician(current.id)
        .then((tasks) => {
          setStats(getTaskStats(tasks));
          setWorkOrders(tasks.slice(0, 3));
        })
        .catch(() => {});
    }, [current]),
  );

  const focusMessage = stats.inProgress
    ? `${stats.inProgress} active work order${stats.inProgress === 1 ? "" : "s"} need your attention.`
    : stats.pending
      ? `${stats.pending} assigned work order${stats.pending === 1 ? "" : "s"} are awaiting Admin dispatch.`
      : "You have no active work orders right now.";

  return (
    <TechnicianScreen
      title="Dashboard"
      subtitle={`Welcome back, ${getDisplayName(current)}`}
      icon="speedometer-sharp"
    >
      <TechHero
        eyebrow="TODAY'S WORK ORDERS"
        title={stats.inProgress ? `${stats.inProgress} job${stats.inProgress === 1 ? "" : "s"} in progress` : "Ready for your next job"}
        subtitle={focusMessage}
        icon="flash-sharp"
      >
        <TechButton
          title="View work orders"
          onPress={() => router.push("/technician/tasks")}
          variant="secondary"
          leftIcon={<Ionicons name="clipboard-sharp" size={18} color={COLORS.tech} />}
        />
      </TechHero>

      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>At a glance</Text>
      <View style={{ flexDirection: "row", marginBottom: SPACING.sm }}>
        <View style={{ flex: 1, marginRight: SPACING.xs }}><MetricCard label="In progress" value={stats.inProgress} icon="play-sharp" color={COLORS.tech} /></View>
        <View style={{ flex: 1, marginLeft: SPACING.xs }}><MetricCard label="Pending" value={stats.pending} icon="time-sharp" color={COLORS.warning} /></View>
      </View>
      <View style={{ flexDirection: "row", marginBottom: SPACING.md }}>
        <View style={{ flex: 1 }}><MetricCard label="All work orders" value={stats.total} icon="layers-sharp" color={COLORS.primary} /></View>
      </View>

      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>Work Orders</Text>
      {workOrders.length ? workOrders.map((workOrder) => (
        <Card key={workOrder.id} onPress={() => router.push(`/technician/task/${workOrder.id}/information`)} style={{ padding: SPACING.md - 2, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: workOrder.status === "in-progress" ? COLORS.tech : COLORS.warning }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}><Ionicons name="clipboard-sharp" size={21} color={COLORS.tech} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>{workOrder.title || workOrder.issueType || "Work Order"}</Text>
              <Text numberOfLines={1} style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{workOrder.status === "pending" ? "Awaiting Admin dispatch" : `${workOrder.status || "assigned"} · ${workOrder.customerName || "Customer"}`}</Text>
            </View>
            <Ionicons name="chevron-forward-sharp" size={18} color={COLORS.textMuted} />
          </View>
        </Card>
      )) : <Card><Text style={{ color: COLORS.textSecondary }}>No work orders have been assigned to you yet.</Text></Card>}
      <DashboardLink title="Notifications" subtitle="Review new assignments and service alerts." icon="notifications-sharp" accent={COLORS.warning} onPress={() => router.push("/technician/notifications")} />
    </TechnicianScreen>
  );
}
