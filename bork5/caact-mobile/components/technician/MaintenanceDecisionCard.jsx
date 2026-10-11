import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Card from "../ui/Card";
import TechButton from "./TechButton";
import { COLORS, FONT, SPACING } from "../../constants/theme";
import { fetchTaskDecisionSupport, generateTaskDecisionSupport, reviewTaskDecisionSupport } from "../../services/taskStorage";

const Detail = ({ label, value }) => value ? <View style={{ marginTop: SPACING.sm }}>
  <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.bold }}>{label}</Text>
  <Text style={{ color: COLORS.textPrimary, lineHeight: 21, marginTop: 3 }}>{value}</Text>
</View> : null;
const Items = ({ label, values, format = item => item }) => Array.isArray(values) && values.length ? <Detail label={label} value={values.map(item => `• ${format(item)}`).join("\n")} /> : null;

export default function MaintenanceDecisionCard({ taskId, completed, requestId }) {
  const [record, setRecord] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setRecord(null); setError("");
    (async () => {
      const result = await fetchTaskDecisionSupport(taskId);
      if (active) result.success ? setRecord(result) : setError(result.error);
    })().catch(() => { if (active) setError("Unable to load saved AI assessments."); });
    return () => { active = false; };
  }, [taskId, completed]);
  const run = async phase => {
    setBusy(phase); setError("");
    try {
      const result = await generateTaskDecisionSupport(taskId, phase);
      if (!result.success) { setError(result.error); return; }
      setRecord(value => ({ ...value, [phase === "pre" ? "preAssessment" : "futurePrediction"]: phase === "pre" ? result.preAssessment : result.futurePrediction }));
    } catch (failure) { setError(failure?.message || "AI assessment is unavailable. Your report was not changed."); }
    finally { setBusy(""); }
  };
  const review = async (phase, decision) => {
    setBusy(phase); setError("");
    try {
      const result = await reviewTaskDecisionSupport(taskId, phase, decision);
      if (!result.success) { setError(result.error); return; }
      setRecord(value => ({ ...value, [phase === "pre" ? "preAssessment" : "futurePrediction"]: result.assessment }));
    } catch (failure) { setError(failure?.message || "Unable to save review."); }
    finally { setBusy(""); }
  };
  const pre = record?.preAssessment;
  const post = record?.futurePrediction;
  const a = pre?.assessment;
  const p = post?.assessment;
  return <Card>
    <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>AI maintenance assistance</Text>
    <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: 4 }}>Suggestions support your inspection. They do not confirm a fault, replace your findings, or change inventory.</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: COLORS.danger, marginTop: SPACING.sm }}>{error}</Text>}
    {!!requestId && <View style={{ marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderColor: COLORS.border }}>
      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>Before maintenance</Text>
      {pre?.status === "completed" ? <>
        <Detail label="Original reported issue" value={pre?.evidence?.find(entry => entry.id === "reported_issue")?.text} />
        <Detail label="English interpretation" value={a?.english_interpretation} />
        <Detail label="Possible problem" value={a?.possible_problem} />
        <Detail label="Reason" value={a?.reason_for_recommendation} />
        <Detail label="Priority / confidence" value={`${a?.priority} · ${a?.confidence}`} />
        <Items label="Bring for inspection" values={a?.parts_to_bring} format={part => `${part.name}: ${part.reason}`} />
        <Items label="Replace only after diagnosis" values={a?.replace_only_after_diagnosis} format={part => `${part.name}: ${part.only_if}`} />
        <Items label="Tools and materials" values={a?.tools_and_materials} format={tool => `${tool.name}: ${tool.reason}`} />
        <Items label="Diagnostic actions" values={a?.diagnostic_actions} />
        <Items label="Safety flags" values={a?.safety_flags} />
        <Items label="Missing evidence" values={a?.missing_evidence} />
        <Detail label="Technician review" value={pre?.review?.decision || "pending"} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: SPACING.sm }}>
          <TechButton title="Confirm" size="sm" onPress={() => review("pre", "confirmed")} loading={busy === "pre"} style={{ flex: 1 }} />
          <TechButton title="Reject" size="sm" variant="secondary" onPress={() => review("pre", "rejected")} loading={busy === "pre"} style={{ flex: 1 }} />
        </View>
      </> : <Text style={{ color: COLORS.textSecondary, marginVertical: SPACING.sm }}>{pre?.error || "No AI assessment saved yet."}</Text>}
      {!completed && <TechButton title={pre ? "Regenerate AI assessment" : "Generate AI assessment"} onPress={() => run("pre")} loading={busy === "pre"} variant="secondary" style={{ marginTop: SPACING.sm }} />}
    </View>}
    {completed && <View style={{ marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderColor: COLORS.border }}>
      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>After maintenance</Text>
      {post?.status === "completed" ? <>
        <Detail label="Original technician findings" value={post?.evidence?.find(entry => entry.id === "current_findings")?.text} />
        <Detail label="English interpretation" value={p?.english_interpretation} />
        <Detail label="Possible future issue" value={p?.possible_future_issue} />
        <Detail label="Component to monitor" value={p?.component_to_monitor} />
        <Detail label="Risk / confidence" value={`${p?.risk_level} · ${p?.confidence}`} />
        <Items label="Supporting findings" values={p?.supporting_findings} />
        <Items label="Preventive actions" values={p?.preventive_actions} />
        <Detail label="Follow-up" value={p?.follow_up} />
        <Items label="Safety flags" values={p?.safety_flags} />
        <Items label="Missing evidence" values={p?.missing_evidence} />
        <Detail label="Technician review" value={post?.review?.decision || "pending"} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: SPACING.sm }}>
          <TechButton title="Confirm" size="sm" onPress={() => review("post", "confirmed")} loading={busy === "post"} style={{ flex: 1 }} />
          <TechButton title="Reject" size="sm" variant="secondary" onPress={() => review("post", "rejected")} loading={busy === "post"} style={{ flex: 1 }} />
        </View>
      </> : <Text style={{ color: COLORS.textSecondary, marginVertical: SPACING.sm }}>{post?.error || "Generate after the final technician report is saved."}</Text>}
      <TechButton title={post ? "Regenerate future-issue assessment" : "Generate future-issue assessment"} onPress={() => run("post")} loading={busy === "post"} variant="secondary" style={{ marginTop: SPACING.sm }} />
    </View>}
  </Card>;
}
