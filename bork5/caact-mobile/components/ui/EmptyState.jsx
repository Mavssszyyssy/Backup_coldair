import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Text, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

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
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.xl,
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
        style={{
          fontSize: FONT.lg,
          fontWeight: FONT.bold,
          color: COLORS.textPrimary,
          textAlign: "center",
          marginBottom: message ? SPACING.sm : 0,
        }}
      >
        {title}
      </Text>

      {!!message && (
        <Text
          style={{
            fontSize: FONT.base,
            color: COLORS.textSecondary,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          {message}
        </Text>
      )}

      {action ? <View style={{ marginTop: SPACING.md }}>{action}</View> : null}
    </View>
  );
}
