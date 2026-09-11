import React from "react";
import { Text, View } from "react-native";
import Card from "../ui/Card";
import CustomerSectionHeader from "./CustomerSectionHeader";
import DetailRow from "../ui/DetailRow";
import { COLORS, SPACING } from "../../constants/theme";
import { formatPeso } from "../../services/ecommerceService";

const configuredAmount = (service) => {
  const rawAmount = service?.pricing?.basePrice;
  if (rawAmount === null || rawAmount === undefined || rawAmount === "") {
    return null;
  }

  const amount = Number(rawAmount);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export default function ServiceRequestPaymentSummary({ mode = "service", service = null, payment = null }) {
  const isWarranty = mode === "warranty";
  const recordedQuote = configuredAmount({ pricing: { basePrice: payment?.amount } });
  const amount = isWarranty ? 0 : recordedQuote ?? configuredAmount(service);
  const amountLabel = amount === null ? "Awaiting Admin quote" : formatPeso(amount);

  return <Card>
    <CustomerSectionHeader title="Payment Summary" />
    <View style={{ gap: SPACING.xs }}>
      <DetailRow label={isWarranty ? "Claim submission" : recordedQuote !== null ? "Final Admin quote" : "Service amount"} value={amountLabel} />
      <DetailRow
        label="Additional charges"
        value={isWarranty ? "Coverage review required" : amount === null ? "Included in Admin's final quote" : "None separately recorded"}
      />
      <DetailRow label="Amount due before service" value={isWarranty ? formatPeso(0) : amountLabel} />
      {!isWarranty && payment?.status ? <DetailRow label="Payment status" value={String(payment.status).replace(/_/g, " ")} /> : null}
    </View>
    <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm }}>
      {isWarranty
        ? "No payment is collected when you submit a warranty claim. Admin reviews the coverage first and will show any payable amount before service."
        : amount === null
          ? "Admin must record the final quote before payment. The assigned technician may confirm cash only after GPS check-in."
          : recordedQuote !== null
            ? "This is Admin's final recorded quote. The assigned technician may confirm cash only after GPS check-in."
            : "This is the currently recorded service amount. The assigned technician may confirm cash only after GPS check-in."}
    </Text>
  </Card>;
}
