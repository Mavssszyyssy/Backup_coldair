import { useState } from "react";
import { Text, View } from "react-native";
import Button from "../ui/Button";
import DetailRow from "../ui/DetailRow";
import { COLORS, FONT, SPACING } from "../../constants/theme";

const dateLabel = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" }) : "Not recorded";
};
const methodLabel = (value) => value === "regular_cleaning" ? "Regular cleaning" : value === "deep_cleaning" ? "Deep cleaning" : "Service details needed";
const body = { color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 20, marginTop: SPACING.sm };

export default function CustomerAmpReport({ report, provider }) {
  const summary = ["maintenance_summary", "summary_report"].includes(report?.reportType);
  const [showHistory, setShowHistory] = useState(summary);
  const [showDetails, setShowDetails] = useState(false);
  if (!report) return null;
  const maintenance = report.maintenance || {};
  const explanation = String(maintenance.interpretation || "").trim();
  const aiAssisted = provider === "openai" && Boolean(explanation);
  return <View style={{ marginTop: SPACING.md }}>
    <Text accessibilityRole="header" style={{ color: COLORS.text, fontSize: FONT.lg, fontWeight: FONT.bold }}>{summary ? "Your service history" : "Your next service"}</Text>
    <Text style={body}>{maintenance.predictionSource === "openai" ? "AI-estimated servicing date" : aiAssisted ? "AI-assisted explanation" : "Based on system records"}</Text>
    {report.explanationWarning ? <Text accessibilityRole="alert" style={body}>{report.explanationWarning}</Text> : null}
    {!summary ? <>
      <DetailRow label="Suggested servicing date" value={dateLabel(maintenance.bestServicedBy)} />
      <DetailRow label="Recommended cleaning" value={methodLabel(maintenance.recommendedService)} />
    </> : <DetailRow label="Last verified cleaning" value={dateLabel(maintenance.lastCleaningDate)} />}
    <Text style={body}>{explanation || maintenance.recommendationBasis || "More completed service details are needed to explain this recommendation."}</Text>
    {maintenance.dataQuality?.message ? <Text accessibilityRole="alert" style={[body, { color: COLORS.danger }]}>{maintenance.dataQuality.message}</Text> : null}
    <Button title={showHistory ? "Hide service history" : "Show service history"} variant="secondary" size="sm" onPress={() => setShowHistory(value => !value)} />
    {showHistory ? <View>
      {(report.serviceHistory || []).map((service, index) => <View key={`${service.date}-${index}`}>
        <DetailRow label={`${service.serviceLabel || service.type || "Service"} · ${dateLabel(service.date)}`} value={[service.findings, service.actionTaken].filter(Boolean).join("\n") || "Detailed service report not recorded"} multiline />
        {service.evidence?.eligible === false ? <Text style={[body, { color: COLORS.danger }]}>{service.evidence.reason}</Text> : null}
      </View>)}
      {!report.serviceHistory?.length ? <Text style={body}>No service history has been recorded.</Text> : null}
    </View> : null}
    <Button title={showDetails ? "Hide report details" : "How was this worked out?"} variant="ghost" size="sm" onPress={() => setShowDetails(value => !value)} />
    {showDetails ? <View>
      {summary ? <DetailRow label="Suggested servicing date" value={dateLabel(maintenance.bestServicedBy)} /> : null}
      <DetailRow label="Calculation basis" value={maintenance.recommendationBasis || "Not recorded"} multiline />
      <DetailRow label="Room size and horsepower" value={maintenance.capacityAssessment?.summary || "Add room size and AC horsepower to see this comparison."} multiline />
      <Text style={body}>When enough verified model or brand history is available, a next service plan asks AI to estimate the cleaning interval. Accepted dates are saved for your unit and reminders. Otherwise the system schedule remains. Cleaning methods and warranty rules stay system-controlled; AI does not book visits or approve claims.</Text>
      <DetailRow label="Report reference" value={report.reportId || "Not recorded"} multiline />
    </View> : null}
    <Text style={body}>No visit has been booked by this report. To request one, open Service Visits in this app.</Text>
    <Text style={body}>Need a PDF? Open My AC Units on the Cold Air website and choose Export PDF.</Text>
  </View>;
}
