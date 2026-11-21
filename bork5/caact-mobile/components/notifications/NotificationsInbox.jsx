import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPE } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { startLiveRefresh } from "../../services/liveRefresh";
import {
  archiveAllNotificationsForUser,
  archiveNotificationForUser,
  getNotificationsForUser,
  markNotificationRead,
  markNotificationsReadForUser,
  restoreNotificationForUser,
} from "../../services/notificationService";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import NotificationFeed from "./NotificationFeed";

export default function NotificationsInbox({ t, Button, technician = false }) {
  const router = useRouter();
  const { current } = useUserContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [archivePage, setArchivePage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const opening = useRef(false);
  const updating = useRef(false);
  const accent = technician ? COLORS.tech : COLORS.primary;
  const variant = technician ? "secondary" : "outline";
  const archived = archivePage > 0;

  const loadNotifications = useCallback(async ({ background, isCurrent }) => {
    if (!background) setLoading(true);
    try {
      const showCached = (page) => {
        if (!isCurrent()) return;
        setNotifications(Array.isArray(page) ? page : page.items || []); setHasMore(Boolean(page.hasMore)); setLoadError(false); setLoading(false);
      };
      const page = await getNotificationsForUser(current, { strict: true, limit: visibleLimit, withMetadata: true, archivePage, display: true, onCached: showCached });
      if (!isCurrent()) return;
      setNotifications(Array.isArray(page) ? page : page.items || []);
      setHasMore(Boolean(page.hasMore));
      setLoadError(false);
    } catch {
      if (!background && isCurrent()) setLoadError(true);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [archivePage, current, visibleLimit]);

  useFocusEffect(useCallback(() => {
    opening.current = false;
    return startLiveRefresh(loadNotifications);
  }, [loadNotifications, retry]));

  const changePage = (page) => {
    if (updating.current || opening.current || page === archivePage) return;
    setLoading(true);
    setLoadError(false);
    setNotifications([]);
    setHasMore(false);
    setArchivePage(page);
  };

  const openNotification = async (item) => {
    if (opening.current || updating.current) return;
    opening.current = true;
    try {
      if (!archived) {
        await markNotificationRead(item.id);
        setNotifications((items) => items.map((entry) => entry.id === item.id ? { ...entry, read: true, unread: false } : entry));
      }
      if (item.route) router.push(item.route);
      else opening.current = false;
    } catch (error) {
      opening.current = false;
      Alert.alert(t("Alert not updated"), t(error?.message || "Please try again."));
    }
  };

  const update = async (action, apply, message) => {
    if (updating.current || opening.current) return;
    updating.current = true;
    setPending(true);
    try {
      await action();
      setNotifications(apply);
    } catch {
      Alert.alert(t("Alerts not updated"), t(message));
    } finally {
      updating.current = false;
      setPending(false);
    }
  };

  const archiveAll = () => Alert.alert(t("Archive all alerts?"), t("All current alerts will move to Archived."), [
    { text: t("Cancel"), style: "cancel" },
    { text: t("Archive all"), onPress: () => update(async () => {
      await archiveAllNotificationsForUser();
      setHasMore(false);
    }, () => [], "Unable to archive alerts.") },
  ]);

  const moveAlert = (item) => {
    const remove = (items) => items.filter((entry) => entry.id !== item.id);
    if (archived) return update(() => restoreNotificationForUser(item.id), remove, "Unable to restore this alert.");
    Alert.alert(t("Archive alert?"), t("You can remove this alert from your inbox."), [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Archive"), onPress: () => update(() => archiveNotificationForUser(item.id), remove, "Unable to archive this alert.") },
    ]);
  };

  const controlsStyle = { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.sm };
  return (
    <>
      <View style={controlsStyle}>
        {[[0, "Current"], [1, "Archived"]].map(([page, label]) => {
          const selected = archived === Boolean(page);
          return <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected, disabled: pending }}
            disabled={pending} onPress={() => { if (!selected) changePage(page); }}
            style={{ flexGrow: 1, minHeight: 44, padding: SPACING.sm, justifyContent: "center", borderRadius: RADIUS.md,
              borderWidth: 1, borderColor: selected ? accent : COLORS.border, backgroundColor: selected ? (technician ? COLORS.techLight : COLORS.primaryLight) : COLORS.surface }}>
            <Text style={[TYPE.label, { color: selected ? accent : COLORS.textPrimary, textAlign: "center" }]}>{t(label)}</Text>
          </Pressable>;
        })}
      </View>
      {!archived && !loading && notifications.length > 0 && (
        <View style={controlsStyle}>
          {notifications.some((item) => item.unread && !item.read) && <Button title={t("Mark all as read")} variant={variant} disabled={pending}
            onPress={() => update(() => markNotificationsReadForUser(current), (items) => items.map((item) => ({ ...item, read: true, unread: false })), "Unable to mark alerts as read.")} />}
          <Button title={t("Archive all")} variant={variant} disabled={pending} onPress={archiveAll} />
        </View>
      )}
      {loading ? <LoadingSkeleton label={t("Loading…")} /> : loadError ? (
        <View style={controlsStyle}>
          <Text accessibilityRole="alert" style={[TYPE.body, { color: COLORS.textSecondary }]}>{t("Unable to load alerts.")}</Text>
          <Button title={t("Try again")} variant={variant} onPress={() => setRetry((attempt) => attempt + 1)} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md }}>
          <Text style={[TYPE.body, { color: COLORS.textSecondary }]}>{t(archived ? "No archived alerts." : "You are all caught up.")}</Text>
        </View>
      ) : (
        <>
          <Text style={[TYPE.caption, { color: COLORS.textSecondary, marginBottom: SPACING.sm }]}>{t(archived ? "Swipe left on an alert to restore it." : "Swipe left on an alert to archive it.")}</Text>
          <NotificationFeed key={archivePage} notifications={notifications} onOpen={openNotification}
            onMove={moveAlert} archived={archived} disabled={pending} t={t} technician={technician} />
        </>
      )}
      {!loading && archived && (archivePage > 1 || hasMore) && (
        <View style={controlsStyle}>
          <Button title={t("Previous page")} variant={variant} disabled={pending || archivePage === 1} onPress={() => changePage(archivePage - 1)} />
          <Button title={t("Next page")} variant={variant} disabled={pending || !hasMore || loadError} onPress={() => changePage(archivePage + 1)} />
        </View>
      )}
      {!loading && !archived && hasMore && visibleLimit < 200 && <Button title={t("Load more alerts")} variant={variant}
        disabled={pending} onPress={() => setVisibleLimit((limit) => Math.min(200, limit + 30))} />}
    </>
  );
}
