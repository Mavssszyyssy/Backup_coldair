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
  if (!interpretation || (!interpretation.customerSummary && !interpretation.currentStatus && !interpretation.technicianRecorded)) return null;
  const structured = Boolean(interpretation.overallCondition || interpretation.componentConcern || interpretation.recommendedPart || interpretation.recommendedActions?.length);
  if (!structured) return <DetailRow label={interpretation.provider === "openai" ? "AI follow-up recommendation" : "Evidence-based follow-up plan"} value={interpretation.customerSummary} multiline />;
  return <View style={{ backgroundColor: COLORS.primaryLight, borderRadius: 10, padding: 12, marginTop: 10 }}>
    <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>{interpretation.provider === "openai" ? "AI-reviewed follow-up plan" : "Evidence-based follow-up plan"}</Text>
    <DetailRow label="Current Status" value={interpretation.currentStatus || "Not recorded"} multiline />
    <DetailRow label="Technician Recorded" value={interpretation.technicianRecorded || interpretation.problemsFound || "Not recorded"} multiline />
    {interpretation.previousVisitHistory?.length ? <View><Text style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>Previous Visit History</Text>{interpretation.previousVisitHistory.map((item, index) => <Text key={`${item}-${index}`} style={body}>{index + 1}. {item}</Text>)}</View> : null}
    <DetailRow label="Overall AC performance" value={interpretation.overallCondition || "Not recorded"} multiline />
    {interpretation.currentIssues?.length ? <View><Text style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>Current Issues</Text>{interpretation.currentIssues.map((item, index) => <Text key={`${item}-${index}`} style={body}>{index + 1}. {item}</Text>)}</View> : <DetailRow label="Current Issues" value={interpretation.componentConcern || "No unresolved issue is recorded in the latest visit assessment."} multiline />}
    {interpretation.completedWork?.length ? <View><Text style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>Completed Work</Text>{interpretation.completedWork.map((item, index) => <Text key={`${item}-${index}`} style={body}>{index + 1}. {item}</Text>)}</View> : null}
    <DetailRow label="Recommended Part" value={interpretation.recommendedPart || "Not recorded"} multiline />
    <DetailRow label="Part and inventory status" value={interpretation.inventoryMessage || "Not recorded"} multiline />
    <DetailRow label="Recommended Action" value={serviceLabel(interpretation.recommendedService)} />
    <DetailRow label="Next Possible Visit" value={dateLabel(interpretation.recommendedFollowUpDate)} />
    <DetailRow label="Why This Date" value={interpretation.whyThisDate || "Not recorded"} multiline />
    {interpretation.recommendedActions?.length ? <View>
      <Text style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>Recommended Actions</Text>
      {interpretation.recommendedActions.map((action, index) => <Text key={`${action}-${index}`} style={body}>{index + 1}. {action}</Text>)}
    </View> : null}
    {interpretation.warning ? <Text style={[body, { color: COLORS.warning || COLORS.danger }]}>{interpretation.warning}</Text> : null}
  </View>;
}
