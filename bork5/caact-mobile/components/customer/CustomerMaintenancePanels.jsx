import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import Card from "../ui/Card";
import DetailRow from "../ui/DetailRow";
import StatusChip from "../ui/StatusChip";

const dateLabel = (value) => value
  ? new Date(value).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" })
  : "Being calculated";
const serviceLabel = (value) => value === "deep_cleaning" ? "Deep cleaning" : "Regular cleaning";
const serviceExplanation = (value) => value === "deep_cleaning"
  ? "A deep cleaning is recommended around this date to restore airflow and cooling performance."
  : "A regular cleaning is recommended around this date to keep your AC cooling efficiently.";

const roomSizeMessage = (assessment = {}) => ({
  room_size_required: "Add your room size to check whether this AC is the right size for your space.",
  capacity_required: "Your AC capacity needs to be confirmed before checking its room-size match.",
  suitable: "This AC is a good match for your room size.",
  insufficient: "This AC may be too small for your room. Contact our service team for advice.",
  higher_than_necessary: "This AC may be larger than needed for your room. Contact our service team for advice.",
}[assessment.status] || assessment.summary || "");

export function CustomerRecommendationPanel({ recommendation }) {
  if (!recommendation) return null;
  return <Card>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.md }}>
      <View style={{ width: 52, height: 52, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}><Ionicons name="calendar-clear-sharp" size={25} color={COLORS.primary} /></View>
      <View style={{ flex: 1 }}><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.bold }}>RECOMMENDED SERVICE DATE</Text><Text style={{ color: COLORS.textPrimary, fontSize: FONT.xl, fontWeight: FONT.black, marginTop: 2 }}>{dateLabel(recommendation.bestServicedBy)}</Text></View>
      <StatusChip label={serviceLabel(recommendation.recommendedService)} color={recommendation.overdue ? COLORS.danger : COLORS.success} />
    </View>
    <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19 }}>{serviceExplanation(recommendation.recommendedService)}</Text>
  </Card>;
}

export function CustomerMaintenancePanel({ maintenance }) {
  if (!maintenance) return null;
  return <Card style={{ backgroundColor: `${maintenance.color}0D`, borderColor: `${maintenance.color}33` }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.sm }}>
      <View style={{ flex: 1 }}><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.bold }}>Maintenance plan</Text><Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginTop: 2 }}>{serviceLabel(maintenance.recommendedService)}</Text></View>
      <StatusChip label={maintenance.urgency} color={maintenance.color} />
    </View>
    <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>{serviceExplanation(maintenance.recommendedService)}</Text>
    {roomSizeMessage(maintenance.capacityAssessment) ? <DetailRow label="Room and AC Size Match" value={roomSizeMessage(maintenance.capacityAssessment)} multiline /> : null}
    {maintenance.environmentRisk ? <DetailRow label="Operating Environment" value={maintenance.environmentRisk.recorded ? `${String(maintenance.environmentRisk.level || "low").replace(/_/g, " ")} risk · ${maintenance.environmentRisk.adjustedIntervalDays || "—"} day interval` : "Not recorded yet · neutral interval used"} multiline /> : null}
    {maintenance.environmentAssessment ? <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: SPACING.xs }}>{maintenance.environmentAssessment}</Text> : null}
  </Card>;
}
