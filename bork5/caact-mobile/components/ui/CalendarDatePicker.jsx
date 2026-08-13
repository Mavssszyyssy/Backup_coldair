import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toDateKey(date) === value ? date : null;
};

const formatDate = (value) => {
  const date = parseDateKey(value);
  return date
    ? date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "Select a date";
};

export const getTodayDateKey = () => toDateKey(new Date());

export function isPastCalendarDate(value, minimumDate = getTodayDateKey()) {
  return Boolean(value && String(value) < String(minimumDate));
}

export default function CalendarDatePicker({
  label = "Preferred Date",
  value,
  onChange,
  minimumDate = getTodayDateKey(),
  error,
  required = false,
}) {
  const initial = parseDateKey(value) || parseDateKey(minimumDate) || new Date();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));

  const days = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return Array.from({ length: offset + daysInMonth }, (_unused, index) => {
      if (index < offset) return null;
      const day = index - offset + 1;
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      return { day, key: toDateKey(date), disabled: toDateKey(date) < minimumDate };
    });
  }, [cursor, minimumDate]);

  const openCalendar = () => {
    const selected = parseDateKey(value) || parseDateKey(minimumDate) || new Date();
    setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setOpen(true);
  };
  const previousMonthAllowed = new Date(cursor.getFullYear(), cursor.getMonth(), 1) > new Date(Number(minimumDate.slice(0, 4)), Number(minimumDate.slice(5, 7)) - 1, 1);

  return (
    <View style={{ marginBottom: SPACING.sm + 6 }}>
      <Text style={{ color: COLORS.textPrimary, fontSize: FONT.base, fontWeight: "600", marginBottom: SPACING.xs + 2 }}>
        {label}{required ? " *" : ""}
      </Text>
      <Pressable
        onPress={openCalendar}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value)}`}
        style={({ pressed }) => [{ minHeight: 50, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: error ? COLORS.danger : COLORS.borderInput, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md - 2, backgroundColor: COLORS.surface }, pressed && { backgroundColor: COLORS.surfaceAlt, borderColor: COLORS.primary }]}
      >
        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
        <Text style={{ flex: 1, marginLeft: SPACING.sm, color: value ? COLORS.textPrimary : COLORS.textMuted, fontSize: FONT.base }}>{formatDate(value)}</Text>
        <Ionicons name="chevron-down-sharp" size={18} color={COLORS.textMuted} />
      </Pressable>
      {error ? <Text style={{ color: COLORS.danger, marginTop: SPACING.xs, fontSize: FONT.sm }}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.md, paddingBottom: SPACING.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.md }}>
              <Pressable disabled={!previousMonthAllowed} onPress={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} hitSlop={12} style={{ opacity: previousMonthAllowed ? 1 : 0.3 }}>
                <Ionicons name="chevron-back-sharp" size={24} color={COLORS.primary} />
              </Pressable>
              <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
              <Pressable onPress={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} hitSlop={12}>
                <Ionicons name="chevron-forward-sharp" size={24} color={COLORS.primary} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {WEEKDAYS.map((weekday) => <Text key={weekday} style={{ width: "14.2857%", textAlign: "center", color: COLORS.textMuted, fontWeight: FONT.bold, fontSize: FONT.sm, marginBottom: SPACING.xs }}>{weekday}</Text>)}
              {days.map((entry, index) => entry ? (
                <Pressable key={entry.key} disabled={entry.disabled} onPress={() => { onChange(entry.key); setOpen(false); }} accessibilityRole="button" accessibilityLabel={`${entry.key}${entry.disabled ? ", unavailable" : ""}`} style={({ pressed }) => [{ width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", opacity: entry.disabled ? 0.28 : 1 }, pressed && !entry.disabled && { opacity: 0.72 }]}>
                  <View style={{ width: 36, height: 36, borderRadius: RADIUS.full, alignItems: "center", justifyContent: "center", backgroundColor: entry.key === value ? COLORS.primary : entry.key === minimumDate ? COLORS.primaryLight : "transparent" }}>
                    <Text style={{ color: entry.key === value ? "#FFFFFF" : COLORS.textPrimary, fontWeight: entry.key === value || entry.key === minimumDate ? FONT.bold : "500" }}>{entry.day}</Text>
                  </View>
                </Pressable>
              ) : <View key={`blank-${index}`} style={{ width: "14.2857%", aspectRatio: 1 }} />)}
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: SPACING.sm, textAlign: "center" }}>Past dates are unavailable.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
