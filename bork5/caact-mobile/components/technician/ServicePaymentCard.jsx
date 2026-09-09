import React, { useState } from "react";
import { Alert, Text } from "react-native";
import Card from "../ui/Card";
import TechButton from "./TechButton";
import { collectServicePayment } from "../../services/taskStorage";
import { formatPeso } from "../../services/ecommerceService";

export default function ServicePaymentCard({ task, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const payment = task?.servicePayment;
  if (!payment) return null;
  const closed = ["completed", "cancelled"].includes(String(task.status || "").toLowerCase());
  const confirm = () => Alert.alert("Confirm service cash received", `Have you received ${formatPeso(payment.amount)}? Only confirm after collecting the full amount.`, [
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
    {payment.collectedAt ? <Text>Collected: {new Date(payment.collectedAt).toLocaleString()}</Text> : null}
    {payment.status === "due" && !closed ? <TechButton title="Confirm service cash collected" loading={busy} disabled={!task?.checkIn?.checkedInAt || busy} onPress={confirm} /> : null}
    {payment.status === "due" && !closed && !task?.checkIn?.checkedInAt ? <Text>GPS check-in is required before cash collection.</Text> : null}
  </Card>;
}
