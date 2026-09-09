import React, { useCallback, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useUserContext } from "../context/UserContext";
import { getNotificationsForUser } from "../services/notificationService";
import { subscribeNotificationChanges } from "../services/notificationEvents";

export default function NotificationBadge() {
  const { current } = useUserContext();
  const id = current?.id || current?._id;
  const role = current?.role;
  const [snapshot, setSnapshot] = useState({ owner: null, count: 0 });
  useFocusEffect(useCallback(() => {
    let active = true;
    let version = 0;
    const refresh = async () => {
      const request = ++version;
      if (!id) return;
      try {
        const items = await getNotificationsForUser({ id, role }, { strict: true });
        if (active && request === version) setSnapshot({ owner: id, count: items.filter(item => item.unread && !item.read).length });
      } catch { /* Preserve the last confirmed count during an interruption. */ }
    };
    refresh();
    const timer = setInterval(refresh, 20000);
    const unsubscribe = subscribeNotificationChanges(refresh);
    const app = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => { active = false; clearInterval(timer); unsubscribe(); app.remove(); };
  }, [id, role]));
  const count = id && snapshot.owner === id ? snapshot.count : 0;
  if (!count) return null;
  return <View accessibilityLabel={`${count} unread notifications`} pointerEvents="none" style={{ position: "absolute", right: -9, top: -7, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", zIndex: 2 }}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{count > 99 ? "99+" : count}</Text></View>;
}
