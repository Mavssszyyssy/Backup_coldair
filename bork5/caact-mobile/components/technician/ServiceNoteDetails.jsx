import React from "react";
import { Text, View } from "react-native";
import Card from "../ui/Card";
import ServiceCostSummary from "./ServiceCostSummary";
import { COLORS } from "../../constants/theme";

function Field({ label, value }) {
  return <View style={{ marginTop: 12 }}>
    <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{label}</Text>
    <Text style={{ color: COLORS.textPrimary, fontSize: 15, lineHeight: 22, marginTop: 3 }}>{value}</Text>
  </View>;
}
function Heading({ children }) {
  return <View style={{ borderLeftWidth: 3, borderLeftColor: COLORS.tech, paddingLeft: 10 }}><Text accessibilityRole="header" style={{ color: COLORS.textPrimary, fontSize: 17, fontWeight: "700" }}>{children}</Text></View>;
}
export default function ServiceNoteDetails({ log, unitName }) {
  return <>
    <Card style={{ padding: 16, shadowOpacity: 0.04 }}>
      <Heading>Visit details</Heading>
      <Field label="AC unit" value={log.unitName || unitName || "Not recorded"} />
      <Field label="Technician" value={log.technicianName || "Not recorded"} />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        {[["Condition", log.condition || "Not recorded"], ["Hours worked", log.hoursSpent == null ? "Not recorded" : `${log.hoursSpent} hours`]].map(([label, value]) => <View key={label} style={{ flex: 1, backgroundColor: COLORS.techLight, padding: 12, borderRadius: 10 }}><Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{label}</Text><Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 5 }}>{value}</Text></View>)}
      </View>
    </Card>
    <Card style={{ padding: 16, shadowOpacity: 0.04 }}>
      <Heading>Work performed</Heading>
      <Field label="Findings" value={log.findings || "No findings recorded"} />
      <Field label="Resolution" value={log.resolution || "No resolution recorded"} />
      <Field label="Parts used" value={log.partsUsed || "Not recorded"} />
      {log.notes ? <Field label="Additional notes" value={log.notes} /> : null}
      <ServiceCostSummary task={log} />
    </Card>
  </>;
}
