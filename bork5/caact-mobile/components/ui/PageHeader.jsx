import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

import { COLORS, FONT, SPACING } from "../../constants/theme";

export default function PageHeader({
  title,
  subtitle,
  onBack,
  color = COLORS.primary,
}) {
  if (onBack) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.md }}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm }}
        >
          <Ionicons name="arrow-back-sharp" size={21} color={color} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: FONT.xl, fontWeight: FONT.black, color }}>{title}</Text>
          {subtitle ? <Text numberOfLines={2} style={{ fontSize: FONT.sm, lineHeight: 18, color: COLORS.textSecondary, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <View style={{ alignItems: "center", marginTop: SPACING.sm }}>
        <Image
          source={require("../../assets/coldair-app-icon.png")}
          style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            marginBottom: SPACING.md,
          }}
        />
        <Text
          style={{
            fontSize: FONT.xxl,
            fontWeight: FONT.black,
            color,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: FONT.base,
              color: COLORS.textSecondary,
              marginTop: SPACING.xs,
              textAlign: "center",
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
