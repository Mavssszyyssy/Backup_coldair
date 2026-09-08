import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

const FINDINGS = ["Dust buildup on the air filter.", "Dust buildup on the evaporator coil.", "Restricted airflow from the indoor unit.", "Water was leaking from the drain line."];
const CLEANING = ["Cleaned the air filter.", "Cleaned the evaporator coil.", "Flushed the drain line.", "Tested cooling and airflow after cleaning."];
const REPAIR_FINDINGS = ["The control board did not respond during testing.", "The compressor did not start during testing.", "Water was leaking from the drain line."];
const REPAIR_WORK = ["Replaced the control board.", "Replaced the compressor.", "Repaired the drain line.", "Tested cooling after the repair."];

export default function ServiceReportQuickChoices({ serviceType, findings, resolution, onFindingsChange, onResolutionChange }) {
  const [expanded, setExpanded] = useState(false);
  const repair = serviceType === "repair";
  const inspection = serviceType === "inspection";
  const options = repair ? REPAIR_WORK : inspection ? ["Inspected the filter, coil, and drain line.", "Tested cooling and airflow."] : serviceType === "deep_cleaning" ? ["Removed and disassembled the indoor unit for deep cleaning.", ...CLEANING] : CLEANING;
  const append = (value, sentence, onChange) => {
    if (!String(value || "").includes(sentence)) onChange([String(value || "").trim(), sentence].filter(Boolean).join("\n"));
  };
  const choices = (label, values, value, onChange) => <View style={{ marginTop: SPACING.sm }}>
    <Text style={{ fontWeight: FONT.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs }}>{label}</Text>
    {values.map((sentence) => {
      const selected = String(value || "").includes(sentence);
      return <TouchableOpacity key={sentence} accessibilityRole="button" accessibilityLabel={`Add: ${sentence}`} accessibilityState={{ disabled: selected }} disabled={selected} onPress={() => append(value, sentence, onChange)} style={{ padding: SPACING.sm, marginBottom: SPACING.xs, borderRadius: RADIUS.md, backgroundColor: selected ? COLORS.techLight : COLORS.surfaceAlt }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: FONT.sm }}>{selected ? "Added · " : "+ "}{sentence}</Text>
      </TouchableOpacity>;
    })}
  </View>;
  return <View style={{ marginBottom: SPACING.md }}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ paddingVertical: SPACING.sm }}>
      <Text style={{ color: COLORS.tech, fontWeight: FONT.bold }}>{expanded ? "Hide quick choices" : "Use quick choices (optional)"}</Text>
    </TouchableOpacity>
    {expanded ? <>
      <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>Tap only what you personally observed or performed. Review and edit the report below before submitting.</Text>
      {choices("What did you find?", repair ? REPAIR_FINDINGS : FINDINGS, findings, onFindingsChange)}
      {choices("What did you do?", options, resolution, onResolutionChange)}
    </> : null}
  </View>;
}
