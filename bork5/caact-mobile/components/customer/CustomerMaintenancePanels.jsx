import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import Card from "../ui/Card";
import DetailRow from "../ui/DetailRow";
import StatusChip from "../ui/StatusChip";

const dateLabel = (value) => value ? new Date(value).toLocaleDateString() : "Being calculated";
const serviceLabel = (value) => value === "deep_cleaning" ? "Deep cleaning" : "Regular cleaning";

export function CustomerRecommendationPanel({ recommendation }) {
  if (!recommendation) return null;
  return <Card>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.md }}>
      <View style={{ width: 52, height: 52, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}><Ionicons name="calendar-clear-sharp" size={25} color={COLORS.primary} /></View>
      <View style={{ flex: 1 }}><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.bold }}>BEST SERVICED BY</Text><Text style={{ color: COLORS.textPrimary, fontSize: FONT.xl, fontWeight: FONT.black, marginTop: 2 }}>{dateLabel(recommendation.bestServicedBy)}</Text></View>
      <StatusChip label={serviceLabel(recommendation.recommendedService)} color={recommendation.overdue ? COLORS.danger : COLORS.success} />
    </View>
    <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19 }}>{recommendation.recommendationBasis}</Text>
  </Card>;
}

export function CustomerMaintenancePanel({ maintenance }) {
  if (!maintenance) return null;
  return <Card style={{ backgroundColor: `${maintenance.color}0D`, borderColor: `${maintenance.color}33` }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.sm }}>
      <View style={{ flex: 1 }}><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.bold }}>Maintenance plan</Text><Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginTop: 2 }}>{serviceLabel(maintenance.recommendedService)}</Text></View>
      <StatusChip label={maintenance.urgency} color={maintenance.color} />
    </View>
    <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>{maintenance.message}</Text>
    {maintenance.capacityAssessment?.summary ? <DetailRow label="Room size vs HP" value={maintenance.capacityAssessment.summary} multiline /> : null}
  </Card>;
}
