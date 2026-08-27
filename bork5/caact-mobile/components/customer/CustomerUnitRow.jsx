import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, TouchableOpacity, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { formatUnitHorsepower } from "../../services/unitDisplayService";
import CustomerUnitImage from "./CustomerUnitImage";

export default function CustomerUnitRow({
  unit,
  recommendation,
  maintenance,
  onPress,
}) {
  const modelLabel = [unit?.brand, unit?.productSku || unit?.model]
    .filter(Boolean)
    .join(" · ") || "Model not recorded";

  return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${unit?.unitName || "AC unit"}`}
        style={{ flexDirection: "row", alignItems: "center", paddingVertical: SPACING.sm, minHeight: 104 }}
      >
        <CustomerUnitImage unit={unit} size={68} style={{ marginRight: SPACING.sm }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }} numberOfLines={2}>
            {unit?.unitName || "Unnamed AC Unit"}
          </Text>
          <Text style={{ color: COLORS.primary, fontSize: FONT.sm, fontWeight: FONT.bold, marginTop: 3 }} numberOfLines={1}>
            {modelLabel}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 3 }} numberOfLines={1}>
            Horsepower: {formatUnitHorsepower(unit)}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 3 }} numberOfLines={2}>
            Next maintenance: {maintenance?.date || maintenance?.label || "Not scheduled"}
          </Text>
        </View>
        {recommendation ? (
            <View
              style={{
                alignItems: "flex-end",
                marginLeft: SPACING.sm,
                minWidth: 92,
              }}
            >
              <Text
                style={{
                  color: maintenance?.color || COLORS.primary,
                  fontWeight: FONT.black,
                  fontSize: FONT.sm,
                }}
              >
                {maintenance?.urgency || "Scheduled"}
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
          )}
      </TouchableOpacity>
  );
}
