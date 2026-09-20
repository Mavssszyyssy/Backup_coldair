import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { TECHNICIAN_VISIT_STATUSES } from "../../services/technicianVisitStatus";

export default function TechnicianStatusSelector({ value, onChange }) {
  return <View>
    <Text style={{ color: COLORS.textPrimary, fontSize: FONT.base, fontWeight: FONT.bold }}>Technician status</Text>
    <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19, marginTop: 3, marginBottom: SPACING.sm }}>
      Record the latest status of the issue or work. Explain the actual condition in the findings below.
    </Text>
    <View style={{ gap: SPACING.xs }}>
      {TECHNICIAN_VISIT_STATUSES.map((status) => {
        const selected = value === status.id;
        return <TouchableOpacity
          key={status.id}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          onPress={() => onChange(status.id)}
          style={{ borderWidth: 1, borderColor: selected ? COLORS.tech : COLORS.border, backgroundColor: selected ? COLORS.techLight : COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.sm + 2 }}
        >
          <Text style={{ color: selected ? COLORS.tech : COLORS.textPrimary, fontWeight: FONT.bold }}>{status.label}</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 18, marginTop: 3 }}>{status.help}</Text>
        </TouchableOpacity>;
      })}
    </View>
  </View>;
}
