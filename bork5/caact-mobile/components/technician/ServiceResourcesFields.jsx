import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ReportDropdown } from "./ServiceReportQuickChoices";
import TextField from "../ui/TextField";
import { COLORS, SPACING } from "../../constants/theme";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

const HOURS = ["0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "6", "7", "8"];
const PARTS = ["Compressor / motor", "Control board", "Filter", "Refrigerant"];
export function resourceError({ hoursSpent, laborCost, partsCost }) {
  if (hoursSpent !== "" && hoursSpent != null && (!Number.isFinite(Number(hoursSpent)) || Number(hoursSpent) <= 0)) return "Enter the actual hours worked as a positive number.";
  for (const [label, value] of [["Labor cost", laborCost], ["Parts cost", partsCost]]) {
    if (value !== "" && value != null && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1000000 || Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) > 0.000001)) return `${label} must be a non-negative amount with at most two decimal places.`;
  }
  return "";
}

export default function ServiceResourcesFields({ hoursSpent, onHoursChange, partsUsed, onPartsChange, laborCost, onLaborChange, partsCost, onPartsCostChange, onValidationChange }) {
  const { t } = useInterfaceLanguage();
  const [open, setOpen] = useState("");
  const [otherHours, setOtherHours] = useState(false);
  const [missingOther, setMissingOther] = useState(false);
  const customHours = otherHours || Boolean(hoursSpent && !HOURS.includes(String(hoursSpent)));
  const error = missingOther ? "Describe the other parts used, or deselect Other." : customHours && !hoursSpent ? "Enter the actual hours worked, or choose a listed duration." : resourceError({ hoursSpent, laborCost, partsCost });
  useEffect(() => { onValidationChange?.(error); }, [error, onValidationChange]);
  return <View>
    {onHoursChange ? <>
      <Text style={{ color: COLORS.textPrimary, fontWeight: "700", marginBottom: 8 }}>{t("Hours Worked")}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("Select Hours Worked")} accessibilityState={{ expanded: open === "hours" }} onPress={() => setOpen(open === "hours" ? "" : "hours")} style={{ padding: 16, borderWidth: 1, borderColor: COLORS.borderInput, borderRadius: 12 }}><Text>{hoursSpent ? `${hoursSpent} ${t("hours")}` : t("Select hours worked")} ▾</Text></TouchableOpacity>
      {open === "hours" ? <View>{[...HOURS, "Other"].map(option => <TouchableOpacity key={option} accessibilityRole="button" accessibilityLabel={`${t("Hours Worked")}: ${t(option)}`} onPress={() => { setOtherHours(option === "Other"); onHoursChange(option === "Other" ? "" : option); setOpen(""); }} style={{ padding: 12, borderBottomWidth: 1, borderColor: COLORS.border }}><Text>{option === "Other" ? t("Other duration") : `${option} ${t("hours")}`}</Text></TouchableOpacity>)}</View> : null}
      {customHours ? <TextField label={t("Actual hours worked")} value={String(hoursSpent || "")} onChangeText={onHoursChange} keyboardType="decimal-pad" /> : null}
    </> : null}
    <View style={{ marginTop: SPACING.md }}>
      <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={t("No parts used")} accessibilityState={{ checked: partsUsed === "None" }} onPress={() => onPartsChange(partsUsed === "None" ? "" : "None")} style={{ paddingVertical: 12 }}><Text>{partsUsed === "None" ? "☑" : "☐"} {t("No parts used")}</Text></TouchableOpacity>
      <ReportDropdown key={partsUsed === "None" ? "none" : "parts"} label="Parts Used" options={PARTS} value={partsUsed === "None" ? "" : partsUsed} onChange={onPartsChange} open={open === "parts"} onToggle={() => setOpen(open === "parts" ? "" : "parts")} onMissingOther={setMissingOther} />
    </View>
    {onLaborChange ? <>
      <Text style={{ color: COLORS.textSecondary }}>{t("Actual recorded costs, not the customer’s service fee. Leave blank if not recorded; enter 0 only when confirmed zero.")}</Text>
      <TextField label={t("Labor cost (PHP)")} value={laborCost} onChangeText={onLaborChange} keyboardType="decimal-pad" />
      <TextField label={t("Parts cost (PHP)")} value={partsCost} onChangeText={onPartsCostChange} keyboardType="decimal-pad" />
    </> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: COLORS.danger || "#B91C1C" }}>{t(error)}</Text> : null}
  </View>;
}
