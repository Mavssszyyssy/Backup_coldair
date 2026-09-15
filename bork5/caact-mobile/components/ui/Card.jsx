// components/ui/Card.jsx
import React from "react";
import { Pressable, View } from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../constants/theme";

export default function Card({ children, style, onPress, accessibilityLabel }) {
  const baseStyle = {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
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
