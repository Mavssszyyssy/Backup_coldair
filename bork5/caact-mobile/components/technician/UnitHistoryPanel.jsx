import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import PagedItems from "../ui/PagedItems";
import Card from "../ui/Card";
import { COLORS, SPACING } from "../../constants/theme";

const formatDate = value => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString();
};
const words = value => String(value || "Not recorded").replace(/_/g, " ");
const fields = {
  maintenance: [["date", "Service date", formatDate], ["serviceType", "Service", words], ["technician", "Technician"], ["findings", "Findings"], ["actionTaken", "Work performed"], ["status", "Status"]],
  repairs: [["date", "Service date", formatDate], ["issue", "Concern"], ["diagnosis", "Findings"], ["actionTaken", "Work performed"], ["partsUsed", "Parts used"], ["technician", "Technician"], ["status", "Status"]],
  past: [["date", "Calculated", formatDate], ["bestServicedBy", "Suggested servicing date", formatDate], ["recommendedService", "Service", words], ["recommendationBasis", "Basis"]],
};
function Field({ label, value }) {
  return <View style={{ marginTop: 12 }}><Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{label}</Text><Text style={{ color: COLORS.textPrimary, fontSize: 15, lineHeight: 22, marginTop: 3 }}>{value ?? "Not recorded"}</Text></View>;
}
function HistoryRecords({ rows, section, emptyMessage }) {
  const sorted = [...rows].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  if (!sorted.length) return <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>{emptyMessage}</Text>;
  return <PagedItems label={`${section === "past" ? "Past recommendation" : section === "repairs" ? "Repair visit" : "Maintenance visit"} records`} pageSize={1} items={sorted} renderItem={(row, index) => <View key={row.id || index}>
    {fields[section].map(([key, label, format]) => <Field key={key} label={label} value={format ? format(row[key]) : row[key] || "Not recorded"} />)}
  </View>} />;
}

const sections = [["unit", "AC unit"], ["registration", "Registration"], ["maintenance", "Maintenance"], ["repairs", "Repairs"], ["current", "Current plan"], ["past", "Past plans"]];

export default function UnitHistoryPanel({ history }) {
  const [section, setSection] = useState("unit");
  if (!history?.unit) return null;
  const { unit, maintenanceHistory = [], repairHistory = [], ampHistory = [], recommendation } = history;
  return <View>
    <View accessibilityRole="tablist" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: SPACING.md }}>
      {sections.map(([key, label]) => <TouchableOpacity key={key} accessibilityRole="tab" accessibilityLabel={`AC history: ${label}`} accessibilityState={{ selected: section === key }} onPress={() => setSection(key)} style={{ paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: section === key ? COLORS.tech : COLORS.surface, borderWidth: 1, borderColor: section === key ? COLORS.tech : COLORS.border }}><Text style={{ color: section === key ? COLORS.surface : COLORS.textPrimary, fontWeight: "600" }}>{label}</Text></TouchableOpacity>)}
    </View>
    <Card key={`${unit.id || unit.serialNumber}-${section}`}>
      <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "700", color: COLORS.textPrimary }}>{({ unit: "Verified AC Unit", registration: "Unit registration", maintenance: "Maintenance visits", repairs: "Repair visits", current: "Current maintenance plan", past: "Past maintenance plans" })[section]}</Text>
      {section === "unit" ? <>
        <Field label="AC unit" value={unit.unitName || "Installed AC unit"} />
        <Field label="Brand / model" value={[unit.brand, unit.model].filter(Boolean).join(" / ") || "Not recorded"} />
        <Field label="Serial number" value={unit.serialNumber} />
        <Field label="QR / unit ID" value={unit.qrUnitId || unit.qrCode || "Not recorded"} />
      </> : null}
      {section === "registration" ? <>
        <Field label="Installation date" value={formatDate(unit.installationDate)} />
        <Field label="Current owner" value={unit.currentOwner || "Not assigned"} />
        <Field label="Branch" value={unit.branch} />
        <Field label="Warranty status" value={unit.warrantyStatus} />
        <Field label="Warranty coverage" value={unit.warrantyCoverage?.coverageSummary || "Shop offer: 1 year parts, 5 years compressor. Confirm this unit’s coverage with the branch."} />
      </> : null}
      {section === "maintenance" ? <HistoryRecords section="maintenance" rows={maintenanceHistory} emptyMessage="No completed maintenance visits recorded." /> : null}
      {section === "repairs" ? <HistoryRecords section="repairs" rows={repairHistory} emptyMessage="No repair visits recorded." /> : null}
      {section === "past" ? <>
        <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>Saved assessments from earlier visits. These are not the current plan.</Text>
        <HistoryRecords section="past" rows={ampHistory} emptyMessage="No saved maintenance assessments." />
      </> : null}
      {section === "current" ? recommendation ? <>
        <Field label="Calculated" value={formatDate(recommendation.generatedAt)} />
        <Field label="Suggested servicing date" value={formatDate(recommendation.bestServicedBy)} />
        <Field label="Recommended service" value={words(recommendation.recommendedService)} />
        <Field label="Basis" value={recommendation.recommendationBasis || "Comparable service history is still limited."} />
        <Field label="Room size and horsepower" value={recommendation.capacityAssessment?.summary || "Room size is still needed for the horsepower suitability check."} />
        <Field label="Major-Component Policy" value="If major-part work is necessary, coordinate both the compressor/motor and control board. Confirm the actual fault by inspection." />
        <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>Scheduling guidance based on recorded evidence, not a unit diagnosis.</Text>
      </> : <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>No current maintenance plan available.</Text> : null}
    </Card>
  </View>;
}
