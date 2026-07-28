import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { BoutiqueCard, BoutiqueHeader, BoutiqueScreen, BoutiqueText, BQ_COLORS, BQ_SPACING } from "../../components/boutique";
import { useUserContext } from "../../context/UserContext";
import { fetchNotifications, markNotificationRead } from "../../services/api";

export default function CustomerNotificationsScreen() {
  const router = useRouter();
  const { token } = useUserContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const result = await fetchNotifications(token);
    setNotifications(result.success ? result.notifications : []);
    setLoading(false);
  }, [token]);

  useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

  return <><BoutiqueHeader title="Notifications" subtitle="Your order and service updates" onBack={() => router.back()} /><BoutiqueScreen>{loading ? <ActivityIndicator color={BQ_COLORS.brand} /> : notifications.length === 0 ? <BoutiqueCard><BoutiqueText color={BQ_COLORS.inkMuted}>You are all caught up.</BoutiqueText></BoutiqueCard> : notifications.map((item) => <Pressable key={item.id || item._id} onPress={async () => { if (!item.read && !item.isRead) await markNotificationRead(token, item.id || item._id); loadNotifications(); }}><BoutiqueCard style={{ gap: BQ_SPACING.xs, opacity: item.read || item.isRead ? 0.7 : 1 }}><BoutiqueText variant="h3">{item.title || "Update"}</BoutiqueText><BoutiqueText color={BQ_COLORS.inkMuted}>{item.message || item.body || ""}</BoutiqueText></BoutiqueCard></Pressable>)}</BoutiqueScreen></>;
}
