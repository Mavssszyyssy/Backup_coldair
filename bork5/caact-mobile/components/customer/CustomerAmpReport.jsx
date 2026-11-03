import { useState } from "react";
import { Text, View } from "react-native";
import Button from "../ui/Button";
import DetailRow from "../ui/DetailRow";
import { COLORS, FONT, SPACING } from "../../constants/theme";
import { customerSystemMessage } from "../../services/customerLanguage";
import VisitFollowUpPlan from "./VisitFollowUpPlan";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

const dateLabel = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" }) : "Not recorded";
};
const methodLabel = (value) => ({ regular_cleaning: "Regular cleaning", deep_cleaning: "Deep cleaning", inspection: "AC inspection", repair: "Repair assessment" })[value] || "Service details needed";
const body = { color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 20, marginTop: SPACING.sm };

export default function CustomerAmpReport({ report, provider }) {
  const { language, t } = useInterfaceLanguage();
  const summary = ["maintenance_summary", "summary_report"].includes(report?.reportType);
  const [showHistory, setShowHistory] = useState(summary);
  const [showDetails, setShowDetails] = useState(false);
  if (!report) return null;
  const maintenance = report.maintenance || {};
  const pattern = maintenance.patternAnalysis || {};
  const signals = maintenance.maintenanceSignals || {};
  const visitAnalysis = maintenance.latestVisitAnalysis || {};
  const conditionFollowUp = maintenance.conditionBasedFollowUp || null;
  const routine = maintenance.routineMaintenance || {};
  const assessment = maintenance.predictiveAssessment || {};
  const explanation = customerSystemMessage(String(maintenance.interpretation || "").trim());
  const aiAssessment = maintenance.aiAssessment || visitAnalysis.aiAssessment || explanation || "AEROPULSE needs more completed service details before it can assess this AC.";
  const whyThisDate = maintenance.whyThisDate || visitAnalysis.whyThisDate || customerSystemMessage(maintenance.recommendationBasis) || "A completed cleaning or installation date is needed before a date can be suggested.";
  const hasVisitPrescription = Boolean(visitAnalysis.technicianRecorded || visitAnalysis.aiAssessment || visitAnalysis.possibleCauses?.length || visitAnalysis.diagnosticActions?.length || visitAnalysis.recommendedServiceOrRepair);
  const aiAssisted = provider === "openai" && Boolean(explanation);
  const monthCount = (count) => `${count} ${language === "Filipino" ? "buwan" : "month(s)"}`;
  return <View style={{ marginTop: SPACING.md }}>
    <Text accessibilityRole="header" style={{ color: COLORS.text, fontSize: FONT.lg, fontWeight: FONT.bold }}>{t(summary ? "Your service history" : "Your next service")}</Text>
    <Text style={body}>{t(conditionFollowUp ? "AI-reviewed technician follow-up" : maintenance.predictionSource === "openai" ? "AI-estimated servicing date" : aiAssisted ? "AI-assisted explanation" : "Based on system records")}</Text>
    {report.explanationWarning ? <Text accessibilityRole="alert" style={body}>{customerSystemMessage(report.explanationWarning)}</Text> : null}
    {!summary ? <>
      <DetailRow label={t(conditionFollowUp ? "Condition follow-up date" : "Suggested servicing date")} value={t(dateLabel(maintenance.bestServicedBy))} />
      <DetailRow label={t("Recommended service")} value={t(methodLabel(maintenance.recommendedService))} />
    </> : <DetailRow label={t("Last recorded cleaning")} value={t(dateLabel(maintenance.lastCleaningDate))} />}
    <DetailRow label={t("Priority")} value={t(assessment.priority || (maintenance.overdue ? "Schedule soon" : "Routine"))} />
    {hasVisitPrescription ? <VisitFollowUpPlan interpretation={visitAnalysis} /> : <DetailRow label={t("Assessment Summary")} value={assessment.assessmentSummary || aiAssessment} multiline />}
    {assessment.factorsConsidered?.length ? <View>
      <Text accessibilityRole="header" style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>{t("Factors Considered")}</Text>
      {assessment.factorsConsidered.map((item, index) => <DetailRow key={`${item.label}-${index}`} label={item.label} value={/date/i.test(item.label) ? dateLabel(item.value) : String(item.value)} multiline />)}
    </View> : null}
    {assessment.observationsConsidered?.length ? <View>
      <Text accessibilityRole="header" style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>{t("Technician and Customer Observations Considered")}</Text>
      {assessment.observationsConsidered.map((item, index) => <DetailRow key={`${item.source}-${index}`} label={item.source} value={item.value} multiline />)}
      <Text style={body}>{t("Customer-reported observations remain unverified until a technician confirms them.")}</Text>
    </View> : null}
    {!hasVisitPrescription ? <DetailRow label={t("Why This Date")} value={assessment.reasonForRecommendation || whyThisDate} multiline /> : null}
    {!hasVisitPrescription && assessment.recommendedActions?.length ? <View>
      <Text accessibilityRole="header" style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>{t("Recommended Actions")}</Text>
      {assessment.recommendedActions.map((item, index) => <Text key={`${item}-${index}`} style={body}>{index + 1}. {item}</Text>)}
      <Text style={body}>{assessment.evidenceNotice}</Text>
    </View> : null}
    {conditionFollowUp ? <View>
      <Text accessibilityRole="header" style={[body, { color: COLORS.text, fontWeight: FONT.bold }]}>{t("Routine cleaning plan")}</Text>
      <DetailRow label={t("Routine cleaning date")} value={t(dateLabel(routine.bestServicedBy))} />
      <DetailRow label={t("Routine service")} value={t(methodLabel(routine.recommendedService))} />
      <Text style={body}>{t("The earlier condition follow-up is shown first. It does not erase this separate routine cleaning plan.")}</Text>
    </View> : null}
    {maintenance.dataQuality?.message ? <Text accessibilityRole="alert" style={[body, { color: COLORS.danger }]}>{customerSystemMessage(maintenance.dataQuality.message)}</Text> : null}
    <Button title={t(showHistory ? "Hide service history" : "Show service history")} variant="secondary" size="sm" onPress={() => setShowHistory(value => !value)} />
    {showHistory ? <View>
      {(report.serviceHistory || []).map((service, index) => <View key={`${service.date}-${index}`}>
        <DetailRow label={`${service.serviceLabel || service.type || t("Service")} · ${t(dateLabel(service.date))}`} value={[service.findings, service.actionTaken].filter(Boolean).join("\n") || t("Detailed service report not recorded")} multiline />
        {service.technicianStatus ? <DetailRow label={t("Technician status")} value={t(String(service.technicianStatus).replace(/_/g, " "))} /> : null}
        <VisitFollowUpPlan interpretation={service.aiInterpretation} />
        {service.evidence?.eligible === false ? <Text style={[body, { color: COLORS.danger }]}>{customerSystemMessage(service.evidence.reason)}</Text> : null}
      </View>)}
      {!report.serviceHistory?.length ? <Text style={body}>{t("No service history has been recorded.")}</Text> : null}
    </View> : null}
    <Button title={t(showDetails ? "Hide report details" : "How was this worked out?")} variant="ghost" size="sm" onPress={() => setShowDetails(value => !value)} />
    {showDetails ? <View>
      {summary ? <DetailRow label={t(conditionFollowUp ? "Condition follow-up date" : "Suggested servicing date")} value={t(dateLabel(maintenance.bestServicedBy))} /> : null}
      <DetailRow label={t("Why this date?")} value={whyThisDate} multiline />
      {conditionFollowUp ? <DetailRow label={t("Why the routine date?")} value={customerSystemMessage(routine.recommendationBasis) || t("Not recorded")} multiline /> : null}
      <DetailRow label={t("Pattern used")} value={t(pattern.source === "same_unit" ? "This AC unit's cleaning history" : pattern.source === "system_default" ? "6-month starting schedule" : "Verified similar AC cleaning history")} multiline />
      <DetailRow label={t("Verified cleaning gaps")} value={pattern.intervalsDays?.length ? pattern.intervalsDays.map((days) => monthCount(Math.max(1, Math.round(days / 30)))).join(", ") : t("Not enough history yet")} multiline />
      <DetailRow label={t("Typical gap")} value={pattern.averageIntervalDays ? `${t("About")} ${Math.max(1, Math.round(pattern.averageIntervalDays / 30))} ${t("calendar month(s)")}` : t("6 calendar months")} multiline />
      {signals.serviceRequestCount ? <DetailRow label={t("Service requests reviewed")} value={String(signals.serviceRequestCount)} /> : null}
      {signals.serviceRequestFrequency?.averageGapDays ? <DetailRow label={t("Typical gap between requests")} value={`${signals.serviceRequestFrequency.averageGapDays} ${t("days")}`} /> : null}
      {signals.filterDirtRecordCount || signals.coilDirtRecordCount ? <DetailRow label={t("Cleaning-related issues")} value={`${signals.filterDirtRecordCount || 0} ${t("filter and")} ${signals.coilDirtRecordCount || 0} ${t("coil dirt-related record(s)")}`} multiline /> : null}
      {signals.deepCleaningRecordCount ? <DetailRow label={t("Deep cleanings recorded")} value={String(signals.deepCleaningRecordCount)} /> : null}
      {signals.coilMaintenanceRecordCount ? <DetailRow label={t("Coil cleanings recorded")} value={String(signals.coilMaintenanceRecordCount)} /> : null}
      {signals.refrigerantIssueRecordCount ? <DetailRow label={t("Not counted as cleaning")} value={`${signals.refrigerantIssueRecordCount} ${t("refrigerant-related record(s)")}`} multiline /> : null}
      <DetailRow label={t("Room size and horsepower")} value={maintenance.capacityAssessment?.summary || t("Add room size and AC horsepower to see this comparison.")} multiline />
      <Text style={body}>{t("AEROPULSE uses the technician’s submitted findings to adjust a condition follow-up after each completed detailed report. It only names concerns and components supported by that report and recorded history. Separately, three verified cleanings create two gaps for the routine cleaning pattern. Until then, verified similar-AC history or the 6-month starting schedule is used. This does not book a visit, guarantee a failure, or approve warranty coverage.")}</Text>
      <DetailRow label={t("Report reference")} value={report.reportId || t("Not recorded")} multiline />
    </View> : null}
    <Text style={body}>{t("No visit has been booked by this report. To request one, open Service Visits in this app.")}</Text>
    <Text style={body}>{t("Need a PDF? Open My AC Units on the Cold Air website and choose Export PDF.")}</Text>
  </View>;
}
