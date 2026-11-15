import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPE } from "../../constants/theme";

const ACTION_WIDTH = 112;

function SwipeRow({ children, revealed, onReveal, onMove, moveLabel, title, archived, disabled }) {
  const offset = useRef(new Animated.Value(0)).current;
  const wasRevealed = useRef(revealed);
  const rest = revealed ? -ACTION_WIDTH : 0;

  const settle = useCallback((open) => {
    Animated.spring(offset, {
      toValue: open ? -ACTION_WIDTH : 0, useNativeDriver: true, speed: 24, bounciness: 0, isInteraction: false,
    }).start();
  }, [offset]);

  useEffect(() => {
    if (wasRevealed.current !== revealed) settle(revealed);
    wasRevealed.current = revealed;
  }, [revealed, settle]);
  useEffect(() => () => offset.stopAnimation(), [offset]);

  const responder = useMemo(() => {
    const position = (dx) => Math.max(-ACTION_WIDTH, Math.min(0, rest + dx));
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, { dx, dy }) => !disabled
        && Math.abs(dx) > Math.max(10, Math.abs(dy) * 1.5) && (revealed || dx < 0),
      onPanResponderGrant: () => offset.stopAnimation(),
      onPanResponderMove: (_event, { dx }) => offset.setValue(position(dx)),
      onPanResponderRelease: (_event, { dx }) => {
        const open = position(dx) < -ACTION_WIDTH / 2;
        if (open === revealed) settle(open);
        else onReveal(open);
      },
      onPanResponderTerminate: () => settle(revealed),
    });
  }, [disabled, offset, onReveal, rest, revealed, settle]);

  return (
    <View {...responder.panHandlers} style={{ marginBottom: SPACING.sm, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: COLORS.surface }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${moveLabel}: ${title}`}
        accessibilityElementsHidden={!revealed} importantForAccessibility={revealed ? "yes" : "no-hide-descendants"}
        disabled={disabled || !revealed} onPress={onMove}
        style={({ pressed }) => ({ position: "absolute", top: 0, bottom: 0, right: 0, width: ACTION_WIDTH,
          alignItems: "center", justifyContent: "center", gap: SPACING.xs, paddingHorizontal: SPACING.xs,
          backgroundColor: COLORS.primaryLight, opacity: pressed ? 0.7 : 1 })}>
        <Ionicons name={archived ? "arrow-undo-outline" : "archive-outline"} size={20} color={COLORS.textPrimary} />
        <Text style={[TYPE.label, { color: COLORS.textPrimary, textAlign: "center" }]}>{moveLabel}</Text>
      </Pressable>
      <Animated.View style={{ transform: [{ translateX: offset }] }}>{children}</Animated.View>
    </View>
  );
}

export default function NotificationFeed({ notifications, onOpen, onMove, archived, disabled, t, technician = false }) {
  const [revealedId, setRevealedId] = useState(null);
  const accent = technician ? COLORS.tech : COLORS.primary;
  const moveLabel = t(archived ? "Restore" : "Archive");
  const groups = archived ? [{ label: t("Archived"), items: notifications }] : [
    { label: t("New"), items: notifications.filter((item) => item.unread && !item.read) },
    { label: t("Earlier"), items: notifications.filter((item) => !item.unread || item.read) },
  ];

  return groups.filter((group) => group.items.length).map((group) => (
    <View key={group.label} style={{ marginBottom: SPACING.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.sm }}>
        <Text accessibilityRole="header" style={[TYPE.section, { color: COLORS.textPrimary, flexShrink: 1 }]}>
          {group.label}
        </Text>
        <Text style={[TYPE.caption, { color: COLORS.textSecondary }]}>{group.items.length}</Text>
      </View>
      {group.items.map((item) => {
        const unread = item.unread && !item.read;
        const maintenance = ["maintenance_due", "amp_due_soon", "amp_overdue"].includes(item.category);
        const severityColor = item.severity === "critical" ? COLORS.danger : item.severity === "warning" ? COLORS.warning : accent;
        const revealed = revealedId === item.id;
        const title = item.title || t("Update");
        const move = () => {
          setRevealedId(null);
          onMove(item);
        };
        return (
          <SwipeRow key={item.id} revealed={revealed} disabled={disabled} onReveal={(open) => setRevealedId(open ? item.id : null)}
            onMove={move} moveLabel={moveLabel} title={title} archived={archived}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${t("Open alert")}`}
            accessibilityActions={disabled ? [] : [{ name: "moveAlert", label: moveLabel }]}
            onAccessibilityAction={({ nativeEvent }) => { if (!disabled && nativeEvent.actionName === "moveAlert") move(); }}
            disabled={disabled}
            onPress={() => { if (revealedId) setRevealedId(null); else onOpen(item); }}
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
                <Text style={[TYPE.card, { flex: 1, color: COLORS.textPrimary }]}>{title}</Text>
                {unread ? <View accessibilityLabel={t("Unread")} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} /> : null}
              </View>
              <Text style={[TYPE.body, { color: COLORS.textSecondary, marginTop: SPACING.xs }]}>{item.message || t("Open to view the update.")}</Text>
              {maintenance ? <Text style={[TYPE.label, { color: severityColor, marginTop: SPACING.xs }]}>{t("AC maintenance · Open unit")}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </Pressable>
          </SwipeRow>
        );
      })}
    </View>
  ));
}
