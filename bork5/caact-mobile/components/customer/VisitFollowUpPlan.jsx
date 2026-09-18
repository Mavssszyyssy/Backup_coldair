import { Text, View } from "react-native";
import DetailRow from "../ui/DetailRow";
import { COLORS, FONT, SPACING } from "../../constants/theme";

const dateLabel = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" }) : "Not recorded";
};
const serviceLabel = (value) => ({ regular_cleaning: "Regular cleaning", deep_cleaning: "Deep cleaning", inspection: "AC inspection", repair: "Repair assessment" })[value] || "Service details needed";
const body = { color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 20, marginTop: SPACING.sm };

export default function VisitFollowUpPlan({ interpretation }) {
  if (!interpretation?.customerSummary) return null;
  const structured = Boolean(interpretation.overallCondition || interpretation.componentConcern || interpretation.recommendedPart || interpretation.recommendedActions?.length);
  if (!structured) return <DetailRow label={interpretation.provider === "openai" ? "AI follow-up recommendation" : "Evidence-based follow-up plan"} value={interpretation.customerSummary} multiline />;
  return <View style={{ backgroundColor: COLORS.primaryLight, borderRadius: 10, padding: 12, marginTop: 10 }}>
    <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>{interpretation.provider === "openai" ? "AI-reviewed follow-up plan" : "Evidence-based follow-up plan"}</Text>
    <DetailRow label="Overall AC performance" value={interpretation.overallCondition || "Not recorded"} multiline />
    <DetailRow label="Recorded component concern" value={interpretation.componentConcern || interpretation.problemsFound || "Not recorded"} multiline />
    <DetailRow label="Recommended part or component" value={interpretation.recommendedPart || "Not recorded"} multiline />
    <DetailRow label="Part and inventory status" value={interpretation.inventoryMessage || "Not recorded"} multiline />
    <DetailRow label="Recommended service" value={serviceLabel(interpretation.recommendedService)} />
    <DetailRow label="Recommended next service date" value={dateLabel(interpretation.recommendedFollowUpDate)} />
    <DetailRow label="Why this date" value={interpretation.whyThisDate || "Not recorded"} multiline />
    {interpretation.recommendedActions?.length ? <View>
      <Text style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>Recommended Actions</Text>
      {interpretation.recommendedActions.map((action, index) => <Text key={`${action}-${index}`} style={body}>{index + 1}. {action}</Text>)}
    </View> : null}
    {interpretation.warning ? <Text style={[body, { color: COLORS.warning || COLORS.danger }]}>{interpretation.warning}</Text> : null}
  </View>;
}
