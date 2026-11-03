import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Card from "../ui/Card";
import PagedItems from "../ui/PagedItems";
import { COLORS } from "../../constants/theme";
import VisitFollowUpPlan from "./VisitFollowUpPlan";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

export default function CompletedServiceReports({ records = [], serviceName, formatDate }) {
  const { t } = useInterfaceLanguage();
  const [expanded, setExpanded] = useState(false);
  if (!records.length) return null;
  return <Card>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("Completed service reports")} accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <View style={{ flex: 1 }}><Text style={{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 17 }}>{t("Completed service reports")}</Text><Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 }}>{records.length} {t(records.length === 1 ? "record" : "records")} · {t("Technician findings and work performed")}</Text></View>
      <Text style={{ color: COLORS.primary, fontWeight: "600" }}>{expanded ? `${t("Hide")} ▴` : `${t("View")} ▾`}</Text>
    </TouchableOpacity>
    {expanded ? <PagedItems label={t("Completed reports")} items={records} controlsPosition="top" renderItem={(service, index) => <View key={service.id || `${service.date}-${index}`} style={{ borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 12, marginTop: 12 }}>
      <Text style={{ color: COLORS.textPrimary, fontWeight: "600", fontSize: 14 }}>{t(serviceName(service.serviceType))}</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 3 }}>{formatDate(service.date)}</Text>
      <Text style={{ color: COLORS.textPrimary, lineHeight: 21, fontSize: 14, marginTop: 8 }}>{[service.findings || service.details, service.actionTaken].filter(Boolean).join("\n") || t("Findings and actions not recorded")}</Text>
      <VisitFollowUpPlan interpretation={service.aiInterpretation} />
      {service.evidence?.eligible === false ? <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 6 }}>{service.evidence.reason}</Text> : null}
    </View>} /> : null}
  </Card>;
}
