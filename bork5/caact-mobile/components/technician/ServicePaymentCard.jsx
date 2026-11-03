import React, { useState } from "react";
import { Alert, Text } from "react-native";
import Card from "../ui/Card";
import TechButton from "./TechButton";
import { collectServicePayment } from "../../services/taskStorage";
import { formatPeso } from "../../services/ecommerceService";
import { confirmAction } from "../../utils/confirmAction";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

export default function ServicePaymentCard({ task, onUpdated, readOnly = false }) {
  const { t } = useInterfaceLanguage();
  const [busy, setBusy] = useState(false);
  const payment = task?.servicePayment;
  if (!payment) return null;
  const closed = ["completed", "cancelled"].includes(String(task.status || "").toLowerCase());
  const serviceNoteSaved = Array.isArray(task?.serviceLogs) && task.serviceLogs.length > 0;
  const checkedIn = Boolean(task?.checkIn?.checkedInAt);
  const confirm = () => confirmAction({
    title: t("Confirm Service Cash Received"),
    message: `${t("Payment summary")}\n${t("Base service")}: ${formatPeso(payment.baseAmount || 0)}\n${t("Labor")}: ${formatPeso(payment.laborCost || 0)}\n${t("Parts")}: ${formatPeso(payment.partsCost || 0)}\n${t("Final service price")}: ${formatPeso(payment.amount)}\n\n${t("Only confirm after collecting the full updated amount.")}`,
    cancelText: t("Not yet"),
    confirmText: t("Cash received"),
    pendingText: t("Recording..."),
    onConfirm: async () => {
      if (busy) return;
      setBusy(true);
      try { onUpdated(await collectServicePayment(task.id, payment)); Alert.alert(t("Service payment recorded"), t("The customer and branch team can now see the collection.")); }
      catch (error) { Alert.alert(t("Payment not recorded"), t(error.message)); }
      finally { setBusy(false); }
    },
  });
  return <Card>
    <Text style={{ fontWeight: "700", fontSize: 18 }}>{t("Service payment")}</Text>
    <Text style={{ marginVertical: 8 }}>{payment.status === "warranty_covered" ? t("Covered by approved warranty — no cash due") : payment.status === "quote_required" ? t(closed ? "Payment amount not recorded for this closed visit" : "Awaiting Admin quote — amount not yet set") : `${formatPeso(payment.amount)} · ${t(payment.status === "paid" ? "Cash collected" : payment.status === "no_charge" ? "No charge" : closed ? "No collection recorded" : "Cash due")}`}</Text>
    {payment.amount != null && payment.status !== "warranty_covered" ? <Text>{t("Base")} {formatPeso(payment.baseAmount || 0)} · {t("Labor")} {formatPeso(payment.laborCost || 0)} · {t("Parts")} {formatPeso(payment.partsCost || 0)}</Text> : null}
    {payment.collectedAt ? <Text>{t("Collected")}: {new Date(payment.collectedAt).toLocaleString()}</Text> : null}
    {payment.status === "due" && !closed && !readOnly ? <TechButton title={t("Confirm service cash collected")} loading={busy} disabled={!checkedIn || !serviceNoteSaved || busy} onPress={confirm} /> : null}
    {payment.status === "due" && !closed && !readOnly && !checkedIn ? <Text>{t("GPS check-in is required before cash collection.")}</Text> : null}
    {payment.status === "due" && !closed && !readOnly && checkedIn && !serviceNoteSaved ? <Text>{t("Save the service note and any labor or parts costs before collecting payment.")}</Text> : null}
  </Card>;
}
