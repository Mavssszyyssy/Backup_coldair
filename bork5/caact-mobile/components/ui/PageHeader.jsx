import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Image, TouchableOpacity, View } from "react-native";

import { COLORS, SPACING } from "../../constants/theme";
import ScreenHeading from "./ScreenHeading";

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
        <ScreenHeading title={title} subtitle={subtitle} />
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
        <ScreenHeading title={title} subtitle={subtitle} centered />
      </View>
    </View>
  );
}
