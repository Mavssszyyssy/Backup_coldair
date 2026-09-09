import React, { useEffect, useState } from "react";
import { Keyboard, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import TextField from "../ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

const FINDINGS = ["Dust buildup on the air filter.", "Dust buildup on the evaporator coil.", "Restricted airflow from the indoor unit.", "Water was leaking from the drain line."];
const CLEANING = ["Cleaned the air filter.", "Cleaned the evaporator coil.", "Flushed the drain line.", "Tested cooling and airflow after cleaning."];
const REPAIR_FINDINGS = ["The control board did not respond during testing.", "The compressor did not start during testing.", "Water was leaking from the drain line."];
const REPAIR_WORK = ["Replaced the control board.", "Replaced the compressor.", "Repaired the drain line.", "Tested cooling after the repair."];

function ReportDropdown({ label, options, value, onChange, open, onToggle, onMissingOther }) {
  const [otherEnabled, setOtherEnabled] = useState(false);
  // Existing/custom prose is preserved as Other; opening a dropdown never writes a finding.
  const lines = String(value || "").split("\n");
  const selected = options.filter(option => lines.some(line => line.trim() === option));
  const other = lines.filter(line => !options.includes(line.trim())).join("\n");
  const showOther = otherEnabled || Boolean(other.trim());
  const missingOther = showOther && !other.trim();
  useEffect(() => { onMissingOther(missingOther); }, [missingOther, onMissingOther]);
  const write = (nextSelected, custom) => onChange([...nextSelected, ...(custom ? [custom] : [])].join("\n"));
  const toggleOption = option => write(selected.includes(option) ? selected.filter(item => item !== option) : [...selected, option], other);
  const count = selected.length + (showOther ? 1 : 0);
  const row = (text, checked, onPress) => <TouchableOpacity key={text} accessibilityRole="checkbox" accessibilityLabel={label + ": " + text} accessibilityState={{ checked }} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", padding: SPACING.sm + 3, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: checked ? COLORS.techLight : COLORS.surface }}>
    <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? COLORS.tech : COLORS.textSecondary} style={{ marginRight: SPACING.sm }} />
    <Text style={{ flex: 1, color: COLORS.textPrimary, fontSize: FONT.base }}>{text}</Text>
  </TouchableOpacity>;
  return <View style={{ marginBottom: SPACING.md }}>
    <Text style={{ fontWeight: FONT.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs }}>{label}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={"Select " + label} accessibilityState={{ expanded: open }} onPress={() => { Keyboard.dismiss(); onToggle(); }} style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.borderInput, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.surface }}>
      <Text style={{ flex: 1, color: count ? COLORS.textPrimary : COLORS.textMuted }}>{count ? count + " selected" : "Select one or more"}</Text>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={COLORS.tech} />
    </TouchableOpacity>
    {open ? <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, overflow: "hidden", marginTop: SPACING.xs }}>
      {options.map(option => row(option, selected.includes(option), () => toggleOption(option)))}
      {row("Other", showOther, () => { setOtherEnabled(!showOther); if (showOther) write(selected, ""); })}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={"Done selecting " + label} onPress={onToggle} style={{ padding: SPACING.sm + 3, alignItems: "center", backgroundColor: COLORS.techLight }}><Text style={{ fontWeight: FONT.bold, color: COLORS.tech }}>Done</Text></TouchableOpacity>
    </View> : null}
    {showOther ? <TextField label={"Other " + label.toLowerCase()} value={other} onChangeText={text => write(selected, text)} placeholder="Describe what you actually observed or performed" multiline numberOfLines={3} error={missingOther ? "Enter details for Other, or deselect it." : ""} style={{ marginTop: SPACING.sm }} /> : null}
    {!open && selected.length ? <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: SPACING.xs }}>{selected.join("\n")}</Text> : null}
  </View>;
}

export default function ServiceReportQuickChoices({ serviceType, findings, resolution, onFindingsChange, onResolutionChange, onValidationChange }) {
  const [openField, setOpenField] = useState("");
  const [missingFindings, setMissingFindings] = useState(false);
  const [missingWork, setMissingWork] = useState(false);
  const error = missingFindings || missingWork ? "Enter details for each selected Other option, or deselect it." : "";
  useEffect(() => { onValidationChange?.(error); }, [error, onValidationChange]);
  const work = serviceType === "repair" ? REPAIR_WORK : serviceType === "inspection" ? ["Inspected the filter, coil, and drain line.", "Tested cooling and airflow."] : serviceType === "deep_cleaning" ? ["Removed and disassembled the indoor unit for deep cleaning.", ...CLEANING] : serviceType === "regular_cleaning" ? CLEANING : [];
  const observed = serviceType === "repair" ? REPAIR_FINDINGS : ["regular_cleaning", "deep_cleaning", "inspection"].includes(serviceType) ? FINDINGS : [];
  return <View>
    <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginBottom: SPACING.sm }}>Select only what you personally observed and performed. Your selections form the written service report.</Text>
    <ReportDropdown key={"findings-" + serviceType} label="Technician Findings" options={observed} value={findings} onChange={onFindingsChange} open={openField === "findings"} onToggle={() => setOpenField(openField === "findings" ? "" : "findings")} onMissingOther={setMissingFindings} />
    <ReportDropdown key={"work-" + serviceType} label="Work Performed" options={work} value={resolution} onChange={onResolutionChange} open={openField === "work"} onToggle={() => setOpenField(openField === "work" ? "" : "work")} onMissingOther={setMissingWork} />
  </View>;
}
