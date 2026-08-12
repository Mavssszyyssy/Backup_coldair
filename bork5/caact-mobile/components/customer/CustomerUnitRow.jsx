import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import IconRow from "../ui/IconRow";

export default function CustomerUnitRow({
  unit,
  health,
  maintenance,
  onPress,
}) {
  return (
      <IconRow
        icon="snow-sharp"
        title={unit?.unitName || "Unnamed AC Unit"}
        subtitle={`Next recommended maintenance: ${maintenance?.date || maintenance?.label || "Not scheduled"}`}
        color={COLORS.primary}
        onPress={onPress}
        accessibilityLabel={`View details for ${unit?.unitName || "AC unit"}`}
        right={
          health ? (
            <View
              style={{
                alignItems: "flex-end",
                marginLeft: SPACING.sm,
                minWidth: 92,
              }}
            >
              <Text
                style={{
                  color: maintenance?.color || health.color,
                  fontWeight: FONT.black,
                  fontSize: FONT.sm,
                }}
              >
                {maintenance?.urgency || health.label}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>
                View AC Details
              </Text>
            </View>
          ) : (
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: RADIUS.md,
                backgroundColor: COLORS.surfaceAlt,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="chevron-forward-sharp"
                size={18}
                color={COLORS.textMuted}
              />
            </View>
          )
        }
      />
  );
}
