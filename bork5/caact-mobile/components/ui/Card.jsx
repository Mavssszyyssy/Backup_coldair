// components/ui/Card.jsx
import React from "react";
import { Pressable, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function Card({ children, style, onPress, accessibilityLabel }) {
  const baseStyle = {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: onPress ? 0.06 : 0.08,
    shadowRadius: onPress ? 10 : 16,
    elevation: onPress ? 2 : 3,
  };

  if (!onPress) return <View style={[baseStyle, style]}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        baseStyle,
        pressed && { backgroundColor: COLORS.surfaceAlt, borderColor: COLORS.primary, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
