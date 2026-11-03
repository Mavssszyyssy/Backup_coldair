import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { startLiveRefresh } from "../../services/liveRefresh";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import TechButton from "../../components/technician/TechButton";
import TechnicianScreen, { TechHero } from "../../components/technician/TechnicianScreen";
import Card from "../../components/ui/Card";
import StatusChip from "../../components/ui/StatusChip";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { getDisplayName } from "../../services/profileService";
import { getTasksByTechnician, getTaskStats } from "../../services/taskStorage";
import { sortTechnicianWorkOrders } from "../../services/technicianWorkOrderSort";
import { workOrderStatusPresentation } from "../../services/technicianWorkOrderPresentation";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

function MetricCard({ label, value, icon, color, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, minHeight: 128, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, justifyContent: "space-between" }}>
      <View style={{ width: 34, height: 34, borderRadius: RADIUS.md, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={{ color, fontSize: FONT.xxl, fontWeight: FONT.black }}>{value}</Text>
        <Text numberOfLines={2} style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 16, marginTop: 2 }}>{label}</Text>
      </View>
    </Pressable>
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
  const { t } = useInterfaceLanguage();
  const { current } = useUserContext();
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [workOrders, setWorkOrders] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      if (!current?.id) return;
      let active = true;
      const applyTasks = (tasks) => {
        if (!active) return;
        const orderedTasks = sortTechnicianWorkOrders(tasks);
        setStats(getTaskStats(orderedTasks));
        setWorkOrders(orderedTasks.slice(0, 3));
      };
      getTasksByTechnician(current.id, { sync: false }).then(applyTasks).catch(() => {});
      const stop = startLiveRefresh(({ isCurrent }) => getTasksByTechnician(current.id)
        .then((tasks) => {
          if (!isCurrent()) return;
          applyTasks(tasks);
        })
        .catch(() => {}));
      return () => {
        active = false;
        stop();
      };
    }, [current]),
  );

  const focusMessage = stats.inProgress
    ? `${stats.inProgress} ${t(stats.inProgress === 1 ? "active work order needs your attention." : "active work orders need your attention.")}`
    : stats.pending
      ? `${stats.pending} ${t(stats.pending === 1 ? "assigned work order awaits Admin dispatch." : "assigned work orders await Admin dispatch.")}`
      : t("You have no active work orders right now.");
  const openWorkOrders = (status) => router.push({ pathname: "/technician/tasks", params: { status, schedule: "all" } });

  return (
    <TechnicianScreen
      title={t("Dashboard")}
      subtitle={`${t("Welcome back,")} ${getDisplayName(current)}`}
      icon="speedometer-sharp"
    >
      <TechHero
        eyebrow={t("WORK ORDER STATUS")}
        title={stats.inProgress ? `${stats.inProgress} ${t(stats.inProgress === 1 ? "job in progress" : "jobs in progress")}` : t("Ready for your next job")}
        subtitle={focusMessage}
        icon="flash-sharp"
      >
        <TechButton
          title={t("View work orders")}
          onPress={() => router.push("/technician/tasks")}
          variant="secondary"
          leftIcon={<Ionicons name="clipboard-sharp" size={18} color={COLORS.tech} />}
        />
      </TechHero>

      <View style={{ marginBottom: SPACING.md }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>{t("Notifications")}</Text>
        <DashboardLink title={t("Alerts")} subtitle={t("Review new assignments and service updates.")} icon="notifications-sharp" accent={COLORS.warning} onPress={() => router.push("/technician/notifications")} />
      </View>

      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>{t("Work order summary")}</Text>
      <View style={{ flexDirection: "row", marginBottom: SPACING.sm }}>
        <View style={{ flex: 1, marginRight: SPACING.xs }}><MetricCard label={t("In progress")} value={stats.inProgress} icon="play-sharp" color={COLORS.tech} onPress={() => openWorkOrders("in-progress")} /></View>
        <View style={{ flex: 1, marginLeft: SPACING.xs }}><MetricCard label={t("Pending")} value={stats.pending} icon="time-sharp" color={COLORS.warning} onPress={() => openWorkOrders("pending")} /></View>
      </View>
      <View style={{ flexDirection: "row", marginBottom: SPACING.md }}>
        <View style={{ flex: 1, marginRight: SPACING.xs }}><MetricCard label={t("Completed")} value={stats.completed} icon="checkmark-done-sharp" color={COLORS.success} onPress={() => openWorkOrders("completed")} /></View>
        <View style={{ flex: 1, marginLeft: SPACING.xs }}><MetricCard label={t("All work orders")} value={stats.total} icon="layers-sharp" color={COLORS.primary} onPress={() => openWorkOrders("all")} /></View>
      </View>

      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>{t("Recent work orders")}</Text>
      {workOrders.length ? workOrders.map((workOrder) => (
        <Card key={workOrder.id} onPress={() => router.push(`/technician/task/${workOrder.id}/information`)} style={{ padding: SPACING.md - 2, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: workOrderStatusPresentation(workOrder.status).color }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}><Ionicons name="clipboard-sharp" size={21} color={COLORS.tech} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>{workOrder.title || workOrder.issueType || t("Work Order")}</Text>
              <Text numberOfLines={2} style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{workOrderStatusPresentation(workOrder.status).label === "Pending" ? t("Awaiting Admin dispatch") : workOrder.customerName || t("Customer")}</Text>
              <StatusChip label={t(workOrderStatusPresentation(workOrder.status).label)} color={workOrderStatusPresentation(workOrder.status).color} style={{ marginTop: SPACING.xs }} />
            </View>
            <Ionicons name="chevron-forward-sharp" size={18} color={COLORS.textMuted} />
          </View>
        </Card>
      )) : <Card><Text style={{ color: COLORS.textSecondary }}>{t("No work orders have been assigned to you yet.")}</Text></Card>}
    </TechnicianScreen>
  );
}
