import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import PagedItems from "../ui/PagedItems";
import Card from "../ui/Card";
import { COLORS, SPACING } from "../../constants/theme";
import { groupMaintenancePlans } from "../../services/maintenancePlanHistory";
import { technicianVisitStatusLabel } from "../../services/technicianVisitStatus";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

const formatDate = value => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString();
};
const words = value => String(value || "Not recorded").replace(/_/g, " ");
const hours = value => value == null ? "Not recorded" : `${value} hours`;
const money = value => value == null ? "Not recorded" : `PHP ${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fields = {
  maintenance: [["date", "Service date", formatDate], ["serviceType", "Service", words], ["technicianStatus", "Technician status", technicianVisitStatusLabel], ["technician", "Technician"], ["findings", "Findings"], ["actionTaken", "Work performed"], ["hoursSpent", "Hours worked", hours], ["laborCost", "Labor cost", money], ["partsCost", "Parts cost", money], ["totalServiceCost", "Recorded total", money], ["status", "Status"]],
  repairs: [["date", "Service date", formatDate], ["technicianStatus", "Technician status", technicianVisitStatusLabel], ["issue", "Concern"], ["diagnosis", "Findings"], ["actionTaken", "Work performed"], ["partsUsed", "Parts used"], ["hoursSpent", "Hours worked", hours], ["laborCost", "Labor cost", money], ["partsCost", "Parts cost", money], ["totalServiceCost", "Recorded total", money], ["technician", "Technician"], ["status", "Status"]],
  past: [["bestServicedBy", "Suggested servicing date", formatDate], ["recommendedService", "Service", words], ["recommendationBasis", "Why this date"]],
};
function Field({ label, value }) {
  const { t } = useInterfaceLanguage();
  return <View style={{ marginTop: 12 }}><Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{t(label)}</Text><Text style={{ color: COLORS.textPrimary, fontSize: 15, lineHeight: 22, marginTop: 3 }}>{value == null || value === "Not recorded" ? t("Not recorded") : value}</Text></View>;
}
function HistoryRecords({ rows, section, emptyMessage }) {
  const { t } = useInterfaceLanguage();
  const sorted = section === "past" ? groupMaintenancePlans(rows) : [...rows].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  if (!sorted.length) return <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>{t(emptyMessage)}</Text>;
  return <PagedItems label={`${t(section === "past" ? "Past recommendation" : section === "repairs" ? "Repair visit" : "Maintenance visit")} ${t("records")}`} pageSize={1} items={sorted} renderItem={(row, index) => <View key={row.id || index}>
    {section === "past" ? <View style={{ backgroundColor: COLORS.surfaceAlt, padding: 12, borderRadius: 10, marginTop: 12 }}>
      <Text style={{ color: COLORS.tech, fontWeight: "700" }}>{t("Saved plan")} · {t(formatDate(row.date))}</Text>
      <Text style={{ color: COLORS.textSecondary, marginTop: 4, fontSize: 12 }}>{row.assessmentCount > 1 ? `${t("Unchanged across")} ${row.assessmentCount} ${t("assessments")} · ${t(formatDate(row.firstCalculatedAt))} – ${t(formatDate(row.date))}` : t("1 saved assessment")}</Text>
    </View> : null}
    {fields[section].map(([key, label, format]) => section === "past" && key === "bestServicedBy" ? <View key={key} style={{ backgroundColor: COLORS.techLight, padding: 14, borderRadius: 12, marginTop: 12 }}><Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{t(label)}</Text><Text style={{ color: COLORS.tech, fontSize: 24, fontWeight: "700", marginTop: 5 }}>{t(format(row[key]))}</Text></View> : <Field key={key} label={label} value={format ? (key === "serviceType" || key === "recommendedService" || key === "technicianStatus" ? t(format(row[key])) : format(row[key])) : row[key] || "Not recorded"} />)}
  </View>} />;
}

const sections = [["unit", "AC unit"], ["registration", "Registration"], ["maintenance", "Maintenance"], ["repairs", "Repairs"], ["current", "Current plan"], ["past", "Past plans"]];

export default function UnitHistoryPanel({ history }) {
  const { language, t } = useInterfaceLanguage();
  const [section, setSection] = useState("unit");
  const [choosingSection, setChoosingSection] = useState(false);
  if (!history?.unit) return null;
  const { unit, maintenanceHistory = [], repairHistory = [], ampHistory = [], recommendation } = history;
  return <View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("Choose history section")} accessibilityState={{ expanded: choosingSection }} onPress={() => setChoosingSection(!choosingSection)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 12 }}>
      <View><Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>{t("AC UNIT HISTORY")}</Text><Text style={{ color: COLORS.textPrimary, fontWeight: "600", marginTop: 3 }}>{t(sections.find(([key]) => key === section)?.[1])}</Text></View><Text style={{ color: COLORS.tech }}>{choosingSection ? `${t("Close")} ▴` : `${t("Change")} ▾`}</Text>
    </TouchableOpacity>
    {choosingSection ? <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface, marginBottom: 12 }}>
      {sections.map(([key, label]) => <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={`${t("AC history")}: ${t(label)}`} accessibilityState={{ selected: section === key }} onPress={() => { setSection(key); setChoosingSection(false); }} style={{ padding: 14, borderBottomWidth: key === "past" ? 0 : 1, borderColor: COLORS.border }}><Text style={{ color: section === key ? COLORS.tech : COLORS.textPrimary, fontWeight: "600" }}>{t(label)}{section === key ? "  ✓" : ""}</Text></TouchableOpacity>)}
    </View> : null}
    <Card key={`${unit.id || unit.serialNumber}-${section}`}>
      <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "700", color: COLORS.textPrimary }}>{t(({ unit: "Verified AC Unit", registration: "Unit registration", maintenance: "Maintenance visits", repairs: "Repair visits", current: "Current maintenance plan", past: "Past maintenance plans" })[section])}</Text>
      {section === "unit" ? <>
        <Field label="AC unit" value={unit.unitName || t("Installed AC unit")} />
        <Field label="Brand / model" value={[unit.brand, unit.model].filter(Boolean).join(" / ") || "Not recorded"} />
        <Field label="Serial number" value={unit.serialNumber} />
        <Field label="QR / unit ID" value={unit.qrUnitId || unit.qrCode || "Not recorded"} />
      </> : null}
      {section === "registration" ? <>
        <Field label="Installation date" value={formatDate(unit.installationDate)} />
        <Field label="Current owner" value={unit.currentOwner || t("Not assigned")} />
        <Field label="Branch" value={unit.branch} />
        <Field label="Warranty status" value={t(unit.warrantyStatus)} />
        <Field label="Warranty coverage" value={unit.warrantyCoverage?.coverageSummary || t("Shop offer: 1 year parts, 5 years compressor. Confirm this unit’s coverage with the branch.")} />
      </> : null}
      {section === "maintenance" ? <HistoryRecords section="maintenance" rows={maintenanceHistory} emptyMessage="No completed maintenance visits recorded." /> : null}
      {section === "repairs" ? <HistoryRecords section="repairs" rows={repairHistory} emptyMessage="No repair visits recorded." /> : null}
      {section === "past" ? <>
        <Text style={{ color: COLORS.textSecondary, marginTop: 8, fontSize: 13, lineHeight: 19 }}>{t("Saved visit assessments, grouped when the plan is unchanged. Open Current plan for today's guidance.")}</Text>
        <HistoryRecords section="past" rows={ampHistory} emptyMessage="No saved maintenance assessments." />
      </> : null}
      {section === "current" ? recommendation ? <>
        <Field label="Calculated" value={formatDate(recommendation.generatedAt)} />
        <Field label="Suggested servicing date" value={formatDate(recommendation.bestServicedBy)} />
        <Field label="Recommended service" value={t(words(recommendation.recommendedService))} />
        <Field label="Basis" value={recommendation.recommendationBasis || t("Comparable service history is still limited.")} />
        <Field label="Pattern source" value={t(recommendation.patternAnalysis?.source === "same_unit" ? "This AC unit" : recommendation.patternAnalysis?.source === "system_default" ? "6-month baseline" : "Verified similar AC units")} />
        <Field label="Verified cleaning intervals" value={recommendation.patternAnalysis?.intervalsDays?.length ? recommendation.patternAnalysis.intervalsDays.map((days) => `${Math.max(1, Math.round(days / 30))} ${language === "Filipino" ? "buwan" : "month(s)"}`).join(", ") : t("Not enough history yet")} />
        <Field label="Arithmetic average" value={recommendation.patternAnalysis?.averageIntervalDays ? `${Math.max(1, Math.round(recommendation.patternAnalysis.averageIntervalDays / 30))} ${t("calendar month(s)")}` : t("6 calendar months")} />
        <Field label="Room size and horsepower" value={recommendation.capacityAssessment?.summary || t("Room size is still needed for the horsepower suitability check.")} />
        <Field label="Major-Component Policy" value={t("If major-part work is necessary, coordinate both the compressor/motor and control board. Confirm the actual fault by inspection.")} />
        <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>{t("Scheduling guidance based on recorded evidence, not a unit diagnosis.")}</Text>
      </> : <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>{t("No current maintenance plan available.")}</Text> : null}
    </Card>
  </View>;
}
