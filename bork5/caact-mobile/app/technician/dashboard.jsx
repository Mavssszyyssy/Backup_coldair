import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import Card from "../../components/ui/Card";
import TechButton from "../../components/technician/TechButton";
import TechnicianScreen, {
  TechHero,
  TechStatCard,
} from "../../components/technician/TechnicianScreen";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { getPartsRequestsByTechnician } from "../../services/partsRequestService";
import { getDisplayName } from "../../services/profileService";
import { getTasksByTechnician, getTaskStats } from "../../services/taskStorage";

function QuickAction({ title, subtitle, icon, onPress }) {
  return (
    <Pressable onPress={onPress} activeOpacity={0.78}>
      <Card
        style={{
          marginBottom: SPACING.sm,
          borderLeftWidth: 4,
          borderLeftColor: COLORS.tech,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: RADIUS.md,
              backgroundColor: COLORS.techLight,
              alignItems: "center",
              justifyContent: "center",
              marginRight: SPACING.sm,
            }}
          >
            <Ionicons name={icon} size={22} color={COLORS.tech} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>
              {title}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>
              {subtitle}
            </Text>
          </View>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: RADIUS.md,
              backgroundColor: COLORS.surfaceAlt,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: SPACING.sm,
            }}
          >
            <Ionicons name="chevron-forward-sharp" size={20} color={COLORS.textMuted} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function TechDashboard() {
  const router = useRouter();
  const { current } = useUserContext();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [partsCount, setPartsCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      if (!current?.id) return;
      Promise.all([
        getTasksByTechnician(current.id),
        getPartsRequestsByTechnician(current.id),
      ])
        .then(([tasks, parts]) => {
          setStats(getTaskStats(tasks));
          setPartsCount(parts.length);
        })
        .catch(() => {});
    }, [current]),
  );

  return (
    <TechnicianScreen
      title="Dashboard"
      subtitle={`Technician workspace for ${getDisplayName(current)}`}
      icon="speedometer-sharp"
    >
      <TechHero
        eyebrow="Technician Workspace"
        title={`${stats.inProgress} work order${stats.inProgress === 1 ? "" : "s"} in progress`}
        subtitle="Manage work orders, service notes, QR confirmation, and parts requests from one place."
        icon="hardware-chip-sharp"
      >
        <TechButton
          title="Open Active Work Orders"
          onPress={() => router.push("/technician/home")}
          variant="secondary"
          leftIcon={<Ionicons name="flash-sharp" size={18} color={COLORS.tech} />}
        />
      </TechHero>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: SPACING.sm,
        }}
      >
        <TechStatCard label="Work Orders" value={stats.total} icon="layers-sharp" />
        <TechStatCard
          label="Pending"
          value={stats.pending}
          icon="time-sharp"
          color={COLORS.warning}
        />
        <TechStatCard
          label="In Progress"
          value={stats.inProgress}
          icon="play-sharp"
          color={COLORS.tech}
        />
        <TechStatCard
          label="Parts Requests"
          value={partsCount}
          icon="construct-sharp"
          color={COLORS.success}
        />
      </View>

      <Text
        style={{
          color: COLORS.textPrimary,
          fontWeight: FONT.black,
          fontSize: FONT.lg,
          marginTop: SPACING.lg,
          marginBottom: SPACING.sm,
        }}
      >
        Quick Actions
      </Text>
      <QuickAction
        title="Notifications"
        subtitle="Review task assignments and system alerts from the backend"
        icon="notifications-sharp"
        onPress={() => router.push("/technician/notifications")}
      />
      <QuickAction
        title="My Work Orders"
        subtitle="Filter, start, complete, and document assigned service work"
        icon="clipboard-sharp"
        onPress={() => router.push("/technician/tasks")}
      />
      <QuickAction
        title="Scan AC Unit"
        subtitle="Open AC details, service history, and maintenance status"
        icon="qr-code-sharp"
        onPress={() => router.push("/technician/scan-qr")}
      />
      <QuickAction
        title="Request Parts"
        subtitle="Submit and track parts needed for service work"
        icon="cube-sharp"
        onPress={() => router.push("/technician/parts")}
      />
    </TechnicianScreen>
  );
}
