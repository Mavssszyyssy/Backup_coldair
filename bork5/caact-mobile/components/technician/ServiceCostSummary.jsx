import React from "react";
import { Text, View } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";
import { formatPeso } from "../../utils/currency";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

export default function ServiceCostSummary({ task }) {
  const { t } = useInterfaceLanguage();
  const costs = [["Labor", task?.laborCost], ["Parts", task?.partsCost], ["Additional", task?.additionalCost]];
  const recorded = costs.filter(([, value]) => value != null);
  const payment = task?.servicePayment;
  return <View style={{ marginTop: SPACING.md, borderTopWidth: 1, borderColor: COLORS.border, paddingTop: SPACING.md }}>
    {payment ? <View style={{ marginBottom: SPACING.md }}>
      <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>{t("Customer service payment")}</Text>
      <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{payment.status === "warranty_covered" ? t("Covered by warranty") : payment.amount == null ? t("Amount not recorded") : `${formatPeso(payment.amount)} · ${t(payment.status === "paid" ? "Collected" : payment.status === "no_charge" ? "No charge" : "Not collected")}`}</Text>
    </View> : null}
    <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>{t("Internal service costs")}</Text>
    {!recorded.length ? <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{t("No labor or parts expenses were entered for this visit. Completing maintenance does not fill these amounts automatically.")}</Text> : <>
      {recorded.map(([label, value]) => <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 8 }}><Text style={{ color: COLORS.textSecondary }}>{t(label)}</Text><Text>{formatPeso(value)}</Text></View>)}
      {recorded.length > 1 ? <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}><Text style={{ fontWeight: "700" }}>{t("Recorded subtotal")}</Text><Text style={{ fontWeight: "700" }}>{formatPeso(recorded.reduce((sum, [, value]) => sum + Number(value), 0))}</Text></View> : null}
      <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>{t("Internal expenses only, separate from the customer service payment. Unentered amounts are excluded.")}</Text>
    </>}
  </View>;
}
