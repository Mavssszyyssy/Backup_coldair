import { useFocusEffect, useRouter } from "expo-router";
import { startLiveRefresh } from "../../services/liveRefresh";
import { useCallback, useRef, useState } from "react";
import { Alert, ActivityIndicator, Pressable, Text, View } from "react-native";

import NotificationFeed from "../../components/notifications/NotificationFeed";
import TechnicianScreen from "../../components/technician/TechnicianScreen";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";
import {
  getNotificationsForUser,
  markNotificationsReadForUser,
  markNotificationRead,
} from "../../services/notificationService";

export default function TechnicianNotificationsScreen() {
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
      Alert.alert(t('Alert not updated'), t(error?.message || 'Please try again.'));
    }
  };

  const markAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markNotificationsReadForUser(current);
      setNotifications((items) => items.map((item) => ({ ...item, read: true, unread: false })));
    } catch (error) { Alert.alert(t('Alerts not updated'), t(error?.message || 'Please try again.')); }
    finally { setMarkingAll(false); }
  };

  return (
    <TechnicianScreen title={t('Alerts')} subtitle={t('Assignments and service updates')} icon="notifications-sharp">
      {notifications.some((item) => item.unread && !item.read) ? <Pressable accessibilityRole="button" disabled={markingAll} onPress={markAllRead} style={{ alignSelf: "flex-end", padding: SPACING.sm, marginBottom: SPACING.sm }}><Text style={{ color: COLORS.tech, fontWeight: FONT.bold }}>{t(markingAll ? 'Updating…' : 'Mark all as read')}</Text></Pressable> : null}
      {loading ? <ActivityIndicator color={COLORS.tech} /> : notifications.length === 0 ? (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md }}><Text style={{ color: COLORS.textSecondary }}>{t('You are all caught up.')}</Text></View>
      ) : <NotificationFeed notifications={notifications} onOpen={openNotification} t={t} technician />}
    </TechnicianScreen>
  );
}
