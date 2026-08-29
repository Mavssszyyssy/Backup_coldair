import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import TechnicianScreen from "../../components/technician/TechnicianScreen";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import {
  getNotificationsForUser,
  markNotificationRead,
} from "../../services/notificationService";

function NotificationRow({ item, onPress }) {
  const unread = item.unread && !item.read;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. Open notification`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: SPACING.sm })}
    >
      <View style={{ backgroundColor: unread ? "#f0f9ff" : COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: unread ? "#7dd3fc" : COLORS.border, padding: SPACING.md, flexDirection: "row", gap: SPACING.sm }}>
        <View style={{ width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={unread ? "notifications-sharp" : "notifications-outline"} size={20} color={COLORS.tech} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", gap: SPACING.xs, alignItems: "center" }}>
            <Text style={{ flex: 1, color: COLORS.textPrimary, fontSize: FONT.md, fontWeight: FONT.black }}>{item.title || "Update"}</Text>
            {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.tech }} /> : null}
          </View>
          <Text style={{ color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 }}>{item.message || "Open to review this update."}</Text>
        </View>
        <Ionicons name="chevron-forward-sharp" size={20} color={COLORS.textMuted} />
      </View>
    </Pressable>
  );
}

export default function TechnicianNotificationsScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      setNotifications(await getNotificationsForUser(current));
    } finally {
      setLoading(false);
    }
  }, [current]);

  useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

  const openNotification = async (item) => {
    await markNotificationRead(item.id);
    setNotifications((items) => items.map((entry) => entry.id === item.id ? { ...entry, read: true, unread: false } : entry));
    if (item.route) router.push(item.route);
  };

  return (
    <TechnicianScreen title="Alerts" subtitle="Assignments and service updates" icon="notifications-sharp">
      {loading ? <ActivityIndicator color={COLORS.tech} /> : notifications.length === 0 ? (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md }}><Text style={{ color: COLORS.textSecondary }}>You are all caught up.</Text></View>
      ) : notifications.map((item) => <NotificationRow key={item.id} item={item} onPress={() => openNotification(item)} />)}
    </TechnicianScreen>
  );
}
