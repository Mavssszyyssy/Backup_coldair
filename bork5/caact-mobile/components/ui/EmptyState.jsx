import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPE } from "../../constants/theme";

export default function EmptyState({
  title = "Nothing here yet",
  message = "",
  action,
  icon = "file-tray-sharp",
  iconColor = COLORS.textMuted,
}) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: COLORS.surface,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: SPACING.md,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Ionicons name={icon} size={32} color={iconColor} />
      </View>

      <Text
        accessibilityRole="header"
        style={[TYPE.section, {
          color: COLORS.textPrimary,
          textAlign: "center",
          marginBottom: message ? SPACING.sm : 0,
        }]}
      >
        {title}
      </Text>

      {!!message && (
        <Text
          style={[TYPE.body, {
            color: COLORS.textSecondary,
            textAlign: "center",
          }]}
        >
          {message}
        </Text>
      )}

      {action ? <View style={{ marginTop: SPACING.md }}>{action}</View> : null}
    </View>
  );
}
