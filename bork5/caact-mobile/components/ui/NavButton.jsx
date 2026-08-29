// components/ui/NavButton.jsx
// Props:
//   icon         – image require() or { uri: ... }
//   label        – string
//   href         – expo-router path string (e.g. "/customer/cart")
//   onPress      – function (optional override — skips router.push when provided)
//   active       – boolean (optional; auto-detected from pathname when omitted)
//   color        – string (active tint color, default COLORS.primary)
//   inactiveColor– string (default COLORS.textMuted)
//   size         – number (icon size, default 24)
//   badge        – number (optional badge count overlay, shown when > 0)
//   elevated     – boolean (raised circle button — for Shop centre button)
//   flex         – number (default 1)
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";

import { COLORS, FONT } from "../../constants/theme";

export default function NavButton({
  iconName,
  label,
  href,
  onPress,
  active,
  color = COLORS.primary,
  inactiveColor = COLORS.textMuted,
  size = 24,
  badge,
  flex = 1,
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active state from prop or by matching the current pathname.
  const isActive =
    active !== undefined
      ? active
      : href
        ? pathname === href || pathname.startsWith(href + "/")
        : false;

  const iconTintColor = isActive ? color : inactiveColor;
  const labelColor = isActive ? color : inactiveColor;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (href) {
      router.replace(href);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      style={{
        flex,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 58,
      }}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ position: "relative" }}>
          <Ionicons name={iconName} size={size} color={iconTintColor} />
          {badge > 0 ? (
            <View style={{ position: "absolute", top: -8, right: -12, backgroundColor: COLORS.danger, borderRadius: RADIUS.full, minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 }}>
              <Text style={{ color: COLORS.surface, fontSize: 10, fontWeight: FONT.bold }}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 11, color: labelColor, marginTop: 4, fontWeight: isActive ? FONT.black : FONT.bold }}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
