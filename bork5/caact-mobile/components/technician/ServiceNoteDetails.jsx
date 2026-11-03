import React from "react";
import { Text, View } from "react-native";
import Card from "../ui/Card";
import ServiceCostSummary from "./ServiceCostSummary";
import { COLORS } from "../../constants/theme";
import { technicianVisitStatusLabel } from "../../services/technicianVisitStatus";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

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
  const { t } = useInterfaceLanguage();
  return <>
    <Card style={{ padding: 16, shadowOpacity: 0.04 }}>
      <Heading>{t("Visit details")}</Heading>
      <Field label={t("AC unit")} value={log.unitName || unitName || t("Not recorded")} />
      <Field label={t("Technician")} value={log.technicianName || t("Not recorded")} />
      <Field label={t("Technician status")} value={t(technicianVisitStatusLabel(log.technicianStatus))} />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        {[["Condition", log.condition ? t(log.condition) : t("Not recorded")], ["Hours worked", log.hoursSpent == null ? t("Not recorded") : `${log.hoursSpent} ${t("hours")}`]].map(([label, value]) => <View key={label} style={{ flex: 1, backgroundColor: COLORS.techLight, padding: 12, borderRadius: 10 }}><Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{t(label)}</Text><Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 5 }}>{value}</Text></View>)}
      </View>
    </Card>
    <Card style={{ padding: 16, shadowOpacity: 0.04 }}>
      <Heading>{t("Work performed")}</Heading>
      <Field label={t("Findings")} value={log.findings || t("No findings recorded")} />
      <Field label={t("Resolution")} value={log.resolution || t("No resolution recorded")} />
      <Field label={t("Parts used")} value={log.partsUsed || t("Not recorded")} />
      {log.notes ? <Field label={t("Additional notes")} value={log.notes} /> : null}
      <ServiceCostSummary task={log} />
    </Card>
  </>;
}
