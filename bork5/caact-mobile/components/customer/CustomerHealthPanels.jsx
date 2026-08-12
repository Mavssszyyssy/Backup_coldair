import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { getHealthColor } from "../../services/acHealthScoreService";
import Card from "../ui/Card";
import DetailRow from "../ui/DetailRow";
import StatusChip from "../ui/StatusChip";

export function CustomerHealthPanel({ health }) {
  if (!health) return null;

  return (
    <Card style={{ overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: SPACING.md,
        }}
      >
        <View
          style={{
            width: 94,
            height: 94,
            borderRadius: RADIUS.full,
            borderWidth: 8,
            borderColor: `${health.color}33`,
            backgroundColor: `${health.color}12`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: health.color,
              fontSize: 30,
              fontWeight: FONT.black,
            }}
          >
            {health.score}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: FONT.bold }}>
            HEALTH
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>
              AC health overview
            </Text>
            <StatusChip label={health.label} color={health.color} />
          </View>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19, marginTop: SPACING.xs }}>
            {health.recommendation}
          </Text>
        </View>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: RADIUS.full,
          backgroundColor: COLORS.border,
          overflow: "hidden",
          marginTop: SPACING.xs,
        }}
      >
        <View
          style={{
            width: `${health.score}%`,
            height: "100%",
            backgroundColor: getHealthColor(health.score),
          }}
        />
      </View>
    </Card>
  );
}

export function CustomerMaintenancePanel({ maintenance }) {
  if (!maintenance) return null;

  return (
    <Card style={{ backgroundColor: `${maintenance.color}0D`, borderColor: `${maintenance.color}33` }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: SPACING.sm,
        }}
      >
        <View style={{ flex: 1, paddingRight: SPACING.sm }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: FONT.sm,
              fontWeight: FONT.bold,
            }}
          >
            Next Recommended Maintenance
          </Text>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: FONT.xl,
              fontWeight: FONT.black,
              marginTop: 2,
            }}
          >
            {maintenance.date || maintenance.label}
          </Text>
        </View>
        <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: `${maintenance.color}1A`, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
          <Ionicons name="calendar-clear-sharp" size={21} color={maintenance.color} />
        </View>
        <StatusChip label={maintenance.urgency} color={maintenance.color} />
      </View>
      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>
        {maintenance.label}
      </Text>
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: FONT.sm,
          marginTop: SPACING.xs,
        }}
      >
        {maintenance.message}
      </Text>
      {maintenance.intervalMonths ? (
        <DetailRow
          label="Recommended Interval"
          value={`Every ${maintenance.intervalMonths} month(s)`}
        />
      ) : null}
    </Card>
  );
}
