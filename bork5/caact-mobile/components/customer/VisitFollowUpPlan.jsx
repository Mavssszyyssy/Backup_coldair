import { Text, View } from "react-native";
import DetailRow from "../ui/DetailRow";
import { COLORS, FONT, SPACING } from "../../constants/theme";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

const dateLabel = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" }) : "Not recorded";
};
const serviceLabel = (value) => ({ regular_cleaning: "Regular cleaning", deep_cleaning: "Deep cleaning", inspection: "AC inspection", repair: "Repair assessment" })[value] || "Service details needed";
const body = { color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 20, marginTop: SPACING.sm };

export default function VisitFollowUpPlan({ interpretation }) {
  const { t } = useInterfaceLanguage();
  if (!interpretation || (!interpretation.customerSummary && !interpretation.currentStatus && !interpretation.technicianRecorded && !interpretation.aiAssessment && !interpretation.possibleCauses?.length)) return null;
  const structured = Boolean(interpretation.aiAssessment || interpretation.overallCondition || interpretation.componentConcern || interpretation.recommendedPart || interpretation.recommendedActions?.length);
  if (!structured) return <DetailRow label={t(interpretation.provider === "openai" ? "AI follow-up recommendation" : "Follow-up based on your service records")} value={interpretation.customerSummary} multiline />;
  return <View style={{ backgroundColor: COLORS.primaryLight, borderRadius: 10, padding: 12, marginTop: 10 }}>
    <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>{t("AI-assisted assessment & prescription")}</Text>
    <Text style={[body, { marginTop: 3 }]}>{t(interpretation.provider === "openai" ? "AI-reviewed" : "Based on your service records")}</Text>
    <DetailRow label={t("1. Technician Findings")} value={interpretation.technicianRecorded || interpretation.problemsFound || t("No detailed technician finding was recorded.")} multiline />
    <Text style={[body, { marginTop: 0 }]}>{t("Confirmed recorded evidence from the completed technician report.")}</Text>
    <DetailRow label={t("2. AI Assessment")} value={interpretation.aiAssessment || interpretation.componentConcern || interpretation.customerSummary || t("Not recorded")} multiline />
    <Text style={[body, { marginTop: 0 }]}>{t("Possible interpretation, not a confirmed physical diagnosis.")}</Text>
    {interpretation.historicalContext ? <DetailRow label={t("Historical Evidence Used")} value={interpretation.historicalContext} multiline /> : null}
    <View>
      <Text style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>{t("3. Possible Causes")}</Text>
      {interpretation.possibleCauses?.length
        ? interpretation.possibleCauses.map((item, index) => <Text key={`${item}-${index}`} style={body}>• {item}</Text>)
        : <Text style={body}>{t("No fault cause is indicated by the completed record.")}</Text>}
    </View>
    {interpretation.diagnosticActions?.length ? <View>
      <Text style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>{t("4. Recommended Diagnostic Actions")}</Text>
      {interpretation.diagnosticActions.map((action, index) => <Text key={`${action}-${index}`} style={body}>{index + 1}. {action}</Text>)}
    </View> : null}
    <DetailRow label={t("5. Recommended Service / Repair")} value={interpretation.recommendedServiceOrRepair || t(serviceLabel(interpretation.recommendedService))} multiline />
    <DetailRow label={t("6. Parts / Component Recommendation")} value={interpretation.partsRecommendation || interpretation.inventoryMessage || t("No part replacement is supported by the completed record.")} multiline />
    <DetailRow label={t("7. Suggested Servicing Date")} value={t(dateLabel(interpretation.recommendedFollowUpDate || interpretation.recommendedDate))} />
    <DetailRow label={t("Why This Date")} value={interpretation.whyThisDate || t("Not recorded")} multiline />
    <Text style={body}>{t("A qualified technician must confirm the physical diagnosis before repair or component replacement is finalized.")}</Text>
    {interpretation.warning ? <Text style={[body, { color: COLORS.warning || COLORS.danger }]}>{interpretation.warning}</Text> : null}
  </View>;
}
