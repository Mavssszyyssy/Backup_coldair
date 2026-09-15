import React, { useState } from "react";
import { Alert, Text } from "react-native";
import Card from "../ui/Card";
import TechButton from "./TechButton";
import { collectServicePayment } from "../../services/taskStorage";
import { formatPeso } from "../../services/ecommerceService";

export default function ServicePaymentCard({ task, onUpdated, readOnly = false }) {
  const [busy, setBusy] = useState(false);
  const payment = task?.servicePayment;
  if (!payment) return null;
  const closed = ["completed", "cancelled"].includes(String(task.status || "").toLowerCase());
  const serviceNoteSaved = Array.isArray(task?.serviceLogs) && task.serviceLogs.length > 0;
  const checkedIn = Boolean(task?.checkIn?.checkedInAt);
  const confirm = () => Alert.alert("Confirm service cash received", `Payment summary\nBase service: ${formatPeso(payment.baseAmount || 0)}\nLabor: ${formatPeso(payment.laborCost || 0)}\nParts: ${formatPeso(payment.partsCost || 0)}\nFinal service price: ${formatPeso(payment.amount)}\n\nOnly confirm after collecting the full updated amount.`, [
    { text: "Not yet", style: "cancel" },
    { text: "Cash received", onPress: async () => {
      if (busy) return;
      setBusy(true);
      try { onUpdated(await collectServicePayment(task.id, payment)); Alert.alert("Service payment recorded", "The customer and branch team can now see the collection."); }
      catch (error) { Alert.alert("Payment not recorded", error.message); }
      finally { setBusy(false); }
    } },
  ]);
  return <Card>
    <Text style={{ fontWeight: "700", fontSize: 18 }}>Service payment</Text>
    <Text style={{ marginVertical: 8 }}>{payment.status === "warranty_covered" ? "Covered by approved warranty — no cash due" : payment.status === "quote_required" ? closed ? "Payment amount not recorded for this closed visit" : "Awaiting Admin quote — amount not yet set" : `${formatPeso(payment.amount)} · ${payment.status === "paid" ? "Cash collected" : payment.status === "no_charge" ? "No charge" : closed ? "No collection recorded" : "Cash due"}`}</Text>
    {payment.amount != null && payment.status !== "warranty_covered" ? <Text>Base {formatPeso(payment.baseAmount || 0)} · Labor {formatPeso(payment.laborCost || 0)} · Parts {formatPeso(payment.partsCost || 0)}</Text> : null}
    {payment.collectedAt ? <Text>Collected: {new Date(payment.collectedAt).toLocaleString()}</Text> : null}
    {payment.status === "due" && !closed && !readOnly ? <TechButton title="Confirm service cash collected" loading={busy} disabled={!checkedIn || !serviceNoteSaved || busy} onPress={confirm} /> : null}
    {payment.status === "due" && !closed && !readOnly && !checkedIn ? <Text>GPS check-in is required before cash collection.</Text> : null}
    {payment.status === "due" && !closed && !readOnly && checkedIn && !serviceNoteSaved ? <Text>Save the service note and any labor or parts costs before collecting payment.</Text> : null}
  </Card>;
}
