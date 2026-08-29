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
        style={{ paddingVertical: SPACING.sm, minHeight: 104 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
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
          </View>
          <Ionicons name="chevron-forward-sharp" size={19} color={COLORS.textMuted} />
        </View>
        {recommendation ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt }}>
            <Ionicons name="calendar-sharp" size={17} color={maintenance?.color || COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: FONT.bold }}>RECOMMENDED SERVICE</Text>
              <Text style={{ color: COLORS.textPrimary, fontSize: FONT.sm, fontWeight: FONT.bold }} numberOfLines={1}>{maintenance?.date || maintenance?.label || "Not scheduled"}</Text>
            </View>
            <Text style={{ color: maintenance?.color || COLORS.primary, fontWeight: FONT.black, fontSize: FONT.sm }}>{maintenance?.urgency || "Scheduled"}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
  );
}
