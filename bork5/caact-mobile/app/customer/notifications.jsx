import { useFocusEffect, useRouter } from "expo-router";
import { startLiveRefresh } from "../../services/liveRefresh";
import { useCallback, useRef, useState } from "react";
import { Alert, ActivityIndicator } from "react-native";

import {
  BoutiqueCard,
  BoutiqueButton,
  BoutiqueHeader,
  BoutiqueScreen,
  BoutiqueText,
  BQ_COLORS,
} from "../../components/boutique";
import NotificationFeed from "../../components/notifications/NotificationFeed";
import { useUserContext } from "../../context/UserContext";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";
import {
  getNotificationsForUser,
  markNotificationsReadForUser,
  markNotificationRead,
} from "../../services/notificationService";

export default function CustomerNotificationsScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const { t } = useInterfaceLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const openingRef = useRef(false);

  const loadNotifications = useCallback(async ({ background, isCurrent }) => {
    if (!background) setLoading(true);
    try {
      const items = await getNotificationsForUser(current, { strict: true });
      if (isCurrent()) setNotifications(items);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [current]);

  useFocusEffect(useCallback(() => {
    openingRef.current = false;
    return startLiveRefresh(loadNotifications);
  }, [loadNotifications]));

  const openNotification = async (item) => {
    if (openingRef.current) return;
    openingRef.current = true;
    try {
      await markNotificationRead(item.id);
      setNotifications((items) => items.map((entry) => entry.id === item.id ? { ...entry, read: true, unread: false } : entry));
      if (item.route) router.push(item.route);
      else openingRef.current = false;
    } catch (error) {
      openingRef.current = false;
      Alert.alert(t("Alert not updated"), t(error?.message || "Please try again."));
    }
  };

  const markAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markNotificationsReadForUser(current);
      setNotifications((items) => items.map((item) => ({ ...item, read: true, unread: false })));
    } catch (error) { Alert.alert(t("Alerts not updated"), t(error?.message || "Please try again.")); }
    finally { setMarkingAll(false); }
  };

  return (
    <>
      <BoutiqueHeader title={t("Alerts")} subtitle={t("Tap an update to continue")} onBack={() => router.back()} />
      <BoutiqueScreen>
        {notifications.some((item) => item.unread && !item.read) ? <BoutiqueButton title={t(markingAll ? "Updating…" : "Mark all as read")} variant="outline" disabled={markingAll} onPress={markAllRead} /> : null}
        {loading ? <ActivityIndicator color={BQ_COLORS.brand} /> : notifications.length === 0 ? (
          <BoutiqueCard><BoutiqueText color={BQ_COLORS.inkMuted}>{t("You are all caught up.")}</BoutiqueText></BoutiqueCard>
        ) : <NotificationFeed notifications={notifications} onOpen={openNotification} t={t} />}
      </BoutiqueScreen>
    </>
  );
}
