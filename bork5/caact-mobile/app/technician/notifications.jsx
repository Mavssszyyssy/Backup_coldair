import { useFocusEffect, useRouter } from "expo-router";
import { startLiveRefresh } from "../../services/liveRefresh";
import { useCallback, useRef, useState } from "react";
import { Alert, ActivityIndicator, Text, View } from "react-native";

import NotificationFeed from "../../components/notifications/NotificationFeed";
import TechButton from "../../components/technician/TechButton";
import TechnicianScreen from "../../components/technician/TechnicianScreen";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";
import {
  getNotificationsForUser,
  archiveNotificationForUser,
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
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [hasMore, setHasMore] = useState(false);
  const openingRef = useRef(false);

  const loadNotifications = useCallback(async ({ background, isCurrent }) => {
    if (!background) setLoading(true);
    try {
      const page = await getNotificationsForUser(current, { strict: true, limit: visibleLimit, withMetadata: true });
      if (isCurrent()) { setNotifications(Array.isArray(page) ? page : page.items || []); setHasMore(Array.isArray(page) ? false : Boolean(page.hasMore)); }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [current, visibleLimit]);

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

  const archiveAlert = (item) => Alert.alert(t('Archive alert?'), t('You can remove this alert from your inbox.'), [
    { text: t('Cancel'), style: 'cancel' },
    { text: t('Archive'), onPress: async () => {
      try {
        await archiveNotificationForUser(item.id);
        setNotifications((items) => items.filter((entry) => entry.id !== item.id));
      } catch (error) { Alert.alert(t('Alert not updated'), t(error?.message || 'Please try again.')); }
    } },
  ]);

  return (
    <TechnicianScreen title={t('Alerts')} subtitle={t('Assignments and service updates')} icon="notifications-sharp">
      {!loading && notifications.some((item) => item.unread && !item.read) ? (
        <TechButton title={t(markingAll ? "Updating…" : "Mark all as read")} variant="secondary"
          disabled={markingAll} onPress={markAllRead} style={{ marginTop: 0, marginBottom: SPACING.md }} />
      ) : null}
      {loading ? <ActivityIndicator color={COLORS.tech} /> : notifications.length === 0 ? (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md }}><Text style={{ color: COLORS.textSecondary }}>{t('You are all caught up.')}</Text></View>
      ) : <NotificationFeed notifications={notifications} onOpen={openNotification} onArchive={archiveAlert} t={t} technician />}
      {!loading && hasMore && visibleLimit < 200 ? (
        <TechButton title={t("Load more alerts")} variant="secondary"
          onPress={() => setVisibleLimit((limit) => Math.min(200, limit + 30))} />
      ) : null}
    </TechnicianScreen>
  );
}
