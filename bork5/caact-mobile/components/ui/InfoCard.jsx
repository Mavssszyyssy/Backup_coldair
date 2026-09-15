// components/ui/InfoCard.jsx
// Props:
//   label – string  (grey descriptor rendered above the value)
//   value – string  (bold primary-colour value)
//
// Used in profile screens to display a single labelled field.
// Wrap multiple InfoCards in a parent View; each card adds its own bottom margin.
import React from "react";
import { View, Text } from "react-native";

import { COLORS, FONT, SPACING, RADIUS } from "../../constants/theme";

export default function InfoCard({ label, value }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <Text
        style={{
          fontSize: FONT.sm,
          color: COLORS.textSecondary,
          marginBottom: SPACING.xs,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: FONT.md,
          fontWeight: FONT.bold,
          color: COLORS.textPrimary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
