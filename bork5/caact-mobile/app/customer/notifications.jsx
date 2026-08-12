import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import {
  BoutiqueCard,
  BoutiqueHeader,
  BoutiqueScreen,
  BoutiqueText,
  BQ_COLORS,
  BQ_SPACING,
} from "../../components/boutique";
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
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      <BoutiqueCard
        style={{
          gap: BQ_SPACING.xs,
          borderColor: unread ? "#93c5fd" : BQ_COLORS.border,
          backgroundColor: unread ? "#f8fbff" : BQ_COLORS.surface,
        }}
      >
        <View style={{ flexDirection: "row", gap: BQ_SPACING.sm, alignItems: "flex-start" }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: unread ? "#dbeafe" : "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={unread ? "notifications" : "notifications-outline"} size={19} color={BQ_COLORS.brand} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: BQ_SPACING.xs }}>
              <BoutiqueText variant="h3" style={{ flex: 1 }}>{item.title || "Update"}</BoutiqueText>
              {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BQ_COLORS.brand }} /> : null}
            </View>
            <BoutiqueText color={BQ_COLORS.inkMuted}>{item.message || "Open to view the update."}</BoutiqueText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={BQ_COLORS.inkFaint} />
        </View>
      </BoutiqueCard>
    </Pressable>
  );
}

export default function CustomerNotificationsScreen() {
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
    <>
      <BoutiqueHeader title="Notifications" subtitle="Tap an update to continue" onBack={() => router.back()} />
      <BoutiqueScreen>
        {loading ? <ActivityIndicator color={BQ_COLORS.brand} /> : notifications.length === 0 ? (
          <BoutiqueCard><BoutiqueText color={BQ_COLORS.inkMuted}>You are all caught up.</BoutiqueText></BoutiqueCard>
        ) : notifications.map((item) => <NotificationRow key={item.id} item={item} onPress={() => openNotification(item)} />)}
      </BoutiqueScreen>
    </>
  );
}
