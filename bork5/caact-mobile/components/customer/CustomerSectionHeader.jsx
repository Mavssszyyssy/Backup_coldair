import { Text, TouchableOpacity, View } from "react-native";

import { COLORS, SPACING, TYPE } from "../../constants/theme";

export default function CustomerSectionHeader({ title, actionLabel, onAction, right }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
      }}
    >
      <Text accessibilityRole="header" style={[TYPE.section, { color: COLORS.textPrimary, flexShrink: 1 }]}>
        {title}
      </Text>
      {right ??
        (actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction} accessibilityRole="button" activeOpacity={0.72}>
            <Text style={[TYPE.label, { color: COLORS.primary }]}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null)}
    </View>
  );
}
