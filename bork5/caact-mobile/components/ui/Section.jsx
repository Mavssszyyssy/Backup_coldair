// components/ui/Section.jsx
// Props:
//   title    – string (bold heading rendered above children)
//   children – React nodes
//   style    – optional additional ViewStyle overrides
import React from "react";
import { View, Text } from "react-native";

import { COLORS, FONT, SPACING, RADIUS } from "../../constants/theme";

export default function Section({ title, children, style, right }) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.lg,
          padding: SPACING.md,
          marginTop: 18,
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        style,
      ]}
    >
      {title ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: FONT.lg,
              fontWeight: FONT.black,
              color: COLORS.textPrimary,
            }}
          >
            {title}
          </Text>
          {right ?? null}
        </View>
      ) : null}
      {children}
    </View>
  );
}
