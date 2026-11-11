import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

export default function NotificationFeed({ notifications, onOpen, onArchive, t, technician = false }) {
  const accent = technician ? COLORS.tech : COLORS.primary;
  const groups = [
    { label: t("New"), items: notifications.filter((item) => item.unread && !item.read) },
    { label: t("Earlier"), items: notifications.filter((item) => !item.unread || item.read) },
  ];

  return groups.filter((group) => group.items.length).map((group) => (
    <View key={group.label} style={{ marginBottom: SPACING.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.sm }}>
        <Text accessibilityRole="header" style={{ color: COLORS.textPrimary, fontSize: FONT.md, fontWeight: FONT.black }}>
          {group.label}
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>{group.items.length}</Text>
      </View>
      {group.items.map((item) => {
        const unread = item.unread && !item.read;
        const maintenance = ["maintenance_due", "amp_due_soon", "amp_overdue"].includes(item.category);
        const severityColor = item.severity === "critical" ? COLORS.danger : item.severity === "warning" ? COLORS.warning : accent;
        return (
          <View key={item.id} style={{ marginBottom: SPACING.sm, flexDirection: "row", alignItems: "stretch", gap: SPACING.xs }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.title || t("Update")}. ${t("Open alert")}`}
            onPress={() => onOpen(item)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.82 : 1,
              flex: 1,
              minWidth: 0,
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              borderColor: unread ? accent : COLORS.border,
              backgroundColor: COLORS.surface,
              padding: SPACING.md,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: SPACING.sm,
            })}
          >
            <View style={{ width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: technician ? COLORS.techLight : COLORS.primaryLight, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={maintenance ? "construct" : unread ? "notifications" : "notifications-outline"} size={20} color={severityColor} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
                <Text style={{ flex: 1, color: COLORS.textPrimary, fontSize: FONT.md, fontWeight: FONT.black }}>{item.title || t("Update")}</Text>
                {unread ? <View accessibilityLabel={t("Unread")} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} /> : null}
              </View>
              <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 20 }}>{item.message || t("Open to view the update.")}</Text>
              {maintenance ? <Text style={{ color: severityColor, fontSize: FONT.sm, fontWeight: FONT.bold, marginTop: SPACING.xs }}>{t("AC maintenance · Open unit")}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </Pressable>
          {onArchive ? <Pressable accessibilityRole="button" accessibilityLabel={`${t("Archive alert")}: ${item.title || t("Update")}`} onPress={() => onArchive(item)} style={{ width: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface }}><Ionicons name="archive-outline" size={20} color={COLORS.textSecondary} /></Pressable> : null}
          </View>
        );
      })}
    </View>
  ));
}
