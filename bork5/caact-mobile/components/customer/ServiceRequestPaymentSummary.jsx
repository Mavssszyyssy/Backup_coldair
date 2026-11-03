import React from "react";
import { Text, View } from "react-native";
import Card from "../ui/Card";
import CustomerSectionHeader from "./CustomerSectionHeader";
import DetailRow from "../ui/DetailRow";
import { COLORS, SPACING } from "../../constants/theme";
import { formatPeso } from "../../services/ecommerceService";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

const configuredAmount = (service) => {
  const rawAmount = service?.pricing?.basePrice;
  if (rawAmount === null || rawAmount === undefined || rawAmount === "") {
    return null;
  }

  const amount = Number(rawAmount);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export default function ServiceRequestPaymentSummary({ mode = "service", service = null, payment = null }) {
  const { t } = useInterfaceLanguage();
  const isWarranty = mode === "warranty";
  const recordedQuote = configuredAmount({ pricing: { basePrice: payment?.amount } });
  const amount = isWarranty ? 0 : recordedQuote ?? configuredAmount(service);
  const amountLabel = amount === null ? t("Awaiting Admin quote") : formatPeso(amount);

  return <Card>
    <CustomerSectionHeader title={t("Payment Summary")} />
    <View style={{ gap: SPACING.xs }}>
      <DetailRow label={t(isWarranty ? "Claim submission" : recordedQuote !== null ? "Base service price" : "Service amount")} value={isWarranty ? amountLabel : recordedQuote !== null ? formatPeso(payment?.baseAmount ?? recordedQuote) : amountLabel} />
      <DetailRow
        label={t("Labor")}
        value={isWarranty ? t("Coverage review required") : amount === null ? t("Not recorded yet") : formatPeso(payment?.laborCost || 0)}
      />
      <DetailRow label={t("Parts")} value={isWarranty ? t("Coverage review required") : amount === null ? t("Not recorded yet") : formatPeso(payment?.partsCost || 0)} />
      <DetailRow label={t("Final service price")} value={isWarranty ? formatPeso(0) : amountLabel} />
      {!isWarranty && payment?.status ? <DetailRow label={t("Payment status")} value={t(String(payment.status).replace(/_/g, " "))} /> : null}
    </View>
    <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm }}>
      {isWarranty
        ? t("No payment is collected when you submit a warranty claim. Admin reviews the coverage first and will show any payable amount before service.")
        : amount === null
          ? t("Admin must record the final quote before payment. The assigned technician may confirm cash only after GPS check-in.")
          : recordedQuote !== null
            ? t("The final price includes the Admin base quote plus labor and parts saved by the technician. Payment is confirmed only after the updated total is shown.")
            : t("This is the currently recorded service amount. The assigned technician may confirm cash only after GPS check-in.")}
    </Text>
  </Card>;
}
