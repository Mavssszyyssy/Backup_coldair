import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Card from "../ui/Card";
import TechButton from "./TechButton";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { fetchTaskDecisionSupport, generateTaskDecisionSupport, reviewTaskDecisionSupport } from "../../services/taskStorage";

const hasText = value => typeof value === "string" && value.trim().length > 0;
const hasItems = values => Array.isArray(values) && values.length > 0;

const Detail = ({ label, value }) => hasText(value) ? (
  <View style={styles.detailBlock}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
) : null;

const Items = ({ label, values, format = item => item }) => hasItems(values) ? (
  <View style={styles.detailBlock}>
    <Text style={styles.detailLabel}>{label}</Text>
    <View style={styles.itemList}>
      {values.map((item, index) => (
        <View key={`${label}-${index}`} style={styles.itemRow}>
          <View style={styles.bullet} />
          <Text style={styles.itemText}>{format(item)}</Text>
        </View>
      ))}
    </View>
  </View>
) : null;

function AssessmentPager({ pages, resetKey }) {
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [resetKey]);

  const lastIndex = Math.max(pages.length - 1, 0);
  const safeIndex = Math.min(pageIndex, lastIndex);
  const page = pages[safeIndex];

  if (!page) return null;

  return (
    <View style={styles.pager}>
      <View style={styles.pageHeadingRow}>
        <View style={styles.pageHeadingCopy}>
          <Text style={styles.pageTitle}>{page.title}</Text>
          {!!page.subtitle && <Text style={styles.pageSubtitle}>{page.subtitle}</Text>}
        </View>
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>{safeIndex + 1} / {pages.length}</Text>
        </View>
      </View>

      <View style={styles.pageContent}>{page.content}</View>

      <View style={styles.progressDots} accessibilityLabel={`Assessment page ${safeIndex + 1} of ${pages.length}`}>
        {pages.map((item, index) => (
          <View
            key={item.key}
            style={[styles.progressDot, index === safeIndex && styles.progressDotActive]}
          />
        ))}
      </View>

      <View style={styles.pageActions}>
        <TechButton
          title="Previous"
          size="sm"
          variant="secondary"
          disabled={safeIndex === 0}
          onPress={() => setPageIndex(index => Math.max(index - 1, 0))}
          accessibilityLabel="Previous assessment page"
          style={styles.pageButton}
        />
        <TechButton
          title="Next"
          size="sm"
          variant="secondary"
          disabled={safeIndex === lastIndex}
          onPress={() => setPageIndex(index => Math.min(index + 1, lastIndex))}
          accessibilityLabel="Next assessment page"
          style={styles.pageButton}
        />
      </View>
      <Text style={styles.pageCounter}>Assessment page {safeIndex + 1} of {pages.length}</Text>
    </View>
  );
}

export default function MaintenanceDecisionCard({ taskId, completed, requestId }) {
  const [record, setRecord] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pagerRevision, setPagerRevision] = useState({ pre: 0, post: 0 });
  useEffect(() => {
    let active = true;
    setRecord(null); setError(""); setPagerRevision({ pre: 0, post: 0 });
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
      setPagerRevision(value => ({ ...value, [phase]: value[phase] + 1 }));
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
  const preObservationEvidence = pre?.evidence?.filter(entry => entry.id.startsWith("in_progress_"));
  const reportedIssue = pre?.evidence?.find(entry => entry.id === "reported_issue")?.text;
  const currentFindings = post?.evidence?.find(entry => entry.id === "current_findings")?.text;

  const prePages = [
    {
      key: "overview",
      title: "Assessment summary",
      subtitle: "Start with the likely concern and why it needs attention.",
      visible: hasText(a?.possible_problem) || hasText(a?.priority) || hasText(a?.confidence) || hasText(a?.reason_for_recommendation),
      content: <>
        <Detail label="Possible problem" value={a?.possible_problem} />
        <Detail label="Priority / confidence" value={[a?.priority, a?.confidence].filter(Boolean).join(" · ")} />
        <Detail label="Reason" value={a?.reason_for_recommendation} />
      </>,
    },
    {
      key: "parts",
      title: "Parts and materials",
      subtitle: "Prepare these items, but replace parts only after diagnosis.",
      visible: hasItems(a?.parts_to_bring) || hasItems(a?.replace_only_after_diagnosis) || hasItems(a?.tools_and_materials),
      content: <>
        <Items label="Bring for inspection" values={a?.parts_to_bring} format={part => `${part.name}: ${part.reason}`} />
        <Items label="Use only after confirmed diagnosis" values={a?.replace_only_after_diagnosis} format={part => `${part.name}: ${part.only_if}`} />
        <Items label="Tools and materials" values={a?.tools_and_materials} format={tool => `${tool.name}: ${tool.reason}`} />
      </>,
    },
    {
      key: "evidence",
      title: "Recorded evidence",
      subtitle: "Original wording is kept beside the English interpretation.",
      visible: hasText(reportedIssue) || hasItems(preObservationEvidence) || hasText(a?.english_interpretation) || hasItems(a?.missing_evidence),
      content: <>
        <Detail label="Original reported issue" value={reportedIssue} />
        <Items label="Original technician observations" values={preObservationEvidence} format={entry => `${entry.label}: ${entry.text}`} />
        <Detail label="English interpretation" value={a?.english_interpretation} />
        <Items label="Missing evidence" values={a?.missing_evidence} />
      </>,
    },
    {
      key: "review",
      title: "Checks and technician review",
      subtitle: "Use the assessment as guidance and record your decision.",
      visible: true,
      content: <>
        <Items label="Diagnostic actions" values={a?.diagnostic_actions} />
        <Items label="Safety flags" values={a?.safety_flags} />
        <Detail label="Technician review" value={pre?.review?.decision || "pending"} />
        <View style={styles.reviewActions}>
          <TechButton title="Confirm" size="sm" onPress={() => review("pre", "confirmed")} loading={busy === "pre"} style={styles.reviewButton} />
          <TechButton title="Reject" size="sm" variant="secondary" onPress={() => review("pre", "rejected")} loading={busy === "pre"} style={styles.reviewButton} />
        </View>
      </>,
    },
  ].filter(page => page.visible);

  const postPages = [
    {
      key: "forecast",
      title: "What to monitor next",
      subtitle: "A cautious forecast based on the saved visit evidence.",
      visible: hasText(p?.possible_future_issue) || hasText(p?.component_to_monitor) || hasText(p?.risk_level) || hasText(p?.confidence),
      content: <>
        <Detail label="Possible next issue" value={p?.possible_future_issue} />
        <Detail label="Part to monitor" value={p?.component_to_monitor} />
        <Detail label="Risk / confidence" value={[p?.risk_level, p?.confidence].filter(Boolean).join(" · ")} />
      </>,
    },
    {
      key: "findings",
      title: "Technician findings",
      subtitle: "Review the original notes and their English interpretation.",
      visible: hasText(currentFindings) || hasText(p?.english_interpretation),
      content: <>
        <Detail label="Original technician findings" value={currentFindings} />
        <Detail label="English interpretation" value={p?.english_interpretation} />
      </>,
    },
    {
      key: "support",
      title: "Supporting evidence",
      subtitle: "See what supports the forecast and what information is still missing.",
      visible: hasItems(p?.supporting_findings) || hasItems(p?.missing_evidence),
      content: <>
        <Items label="Supporting findings" values={p?.supporting_findings} />
        <Items label="Missing evidence" values={p?.missing_evidence} />
      </>,
    },
    {
      key: "actions",
      title: "Next actions and review",
      subtitle: "Follow the recommended prevention steps and record your decision.",
      visible: true,
      content: <>
        <Items label="Preventive actions" values={p?.preventive_actions} />
        <Detail label="Follow-up" value={p?.follow_up} />
        <Items label="Safety flags" values={p?.safety_flags} />
        <Detail label="Technician review" value={post?.review?.decision || "pending"} />
        <View style={styles.reviewActions}>
          <TechButton title="Confirm" size="sm" onPress={() => review("post", "confirmed")} loading={busy === "post"} style={styles.reviewButton} />
          <TechButton title="Reject" size="sm" variant="secondary" onPress={() => review("post", "rejected")} loading={busy === "post"} style={styles.reviewButton} />
        </View>
      </>,
    },
  ].filter(page => page.visible);

  return <Card>
    <Pressable accessibilityRole="button" accessibilityLabel="AI parts and future-issue assessment" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}>
      <Text style={styles.cardTitle}>AI parts and future-issue assessment</Text>
      <Text style={styles.cardSummary}>{expanded ? "Hide assessment details" : (completed ? "Check what may need monitoring after this visit" : "Check suggested parts to prepare before this visit")} {expanded ? "▲" : "▼"}</Text>
    </Pressable>
    {expanded && <>
    <View style={styles.guidanceNote}>
      <Text style={styles.guidanceText}>Suggestions can interpret Tagalog and Taglish notes, but your original findings stay unchanged. Confirm faults and part compatibility before replacement.</Text>
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
    {!!requestId && <View style={styles.assessmentSection}>
      <Text style={styles.sectionTitle}>Before maintenance</Text>
      <Text style={styles.sectionDescription}>Parts preparation and diagnostic guidance</Text>
      {pre?.status === "completed" ? (
        <AssessmentPager pages={prePages} resetKey={`${taskId}:pre:${pagerRevision.pre}`} />
      ) : (
        <Text style={styles.emptyText}>{pre?.error || "No AI assessment saved yet."}</Text>
      )}
      {!completed && <TechButton title={pre ? "Regenerate AI assessment" : "Generate AI assessment"} onPress={() => run("pre")} loading={busy === "pre"} variant="secondary" style={styles.generateButton} />}
    </View>}
    {completed && <View style={styles.assessmentSection}>
      <Text style={styles.sectionTitle}>After maintenance</Text>
      <Text style={styles.sectionDescription}>Future-risk monitoring and preventive guidance</Text>
      {post?.status === "completed" ? (
        <AssessmentPager pages={postPages} resetKey={`${taskId}:post:${pagerRevision.post}`} />
      ) : (
        <Text style={styles.emptyText}>{post?.error || "Generate after the final technician report is saved."}</Text>
      )}
      <TechButton title={post ? "Regenerate future-issue assessment" : "Generate future-issue assessment"} onPress={() => run("post")} loading={busy === "post"} variant="secondary" style={styles.generateButton} />
    </View>}
    </>}
  </Card>;
}

const styles = StyleSheet.create({
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.lg,
    fontWeight: FONT.black,
  },
  cardSummary: {
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SPACING.xs,
  },
  guidanceNote: {
    backgroundColor: COLORS.techLight,
    borderColor: "#B9DDF2",
    borderLeftColor: COLORS.tech,
    borderLeftWidth: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  guidanceText: {
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  errorText: {
    color: COLORS.danger,
    marginTop: SPACING.sm,
  },
  assessmentSection: {
    borderColor: COLORS.border,
    borderTopWidth: 1,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.md,
    fontWeight: FONT.black,
  },
  sectionDescription: {
    color: COLORS.textSecondary,
    fontSize: FONT.sm,
    marginTop: 2,
  },
  pager: {
    backgroundColor: COLORS.surfaceAlt,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: SPACING.md,
    overflow: "hidden",
    padding: SPACING.md,
  },
  pageHeadingRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  pageHeadingCopy: {
    flex: 1,
  },
  pageTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.md,
    fontWeight: FONT.black,
  },
  pageSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT.sm,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  pageBadge: {
    backgroundColor: COLORS.techLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
  },
  pageBadgeText: {
    color: COLORS.tech,
    fontSize: FONT.sm,
    fontWeight: FONT.bold,
  },
  pageContent: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  detailBlock: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT.sm,
    fontWeight: FONT.bold,
  },
  detailValue: {
    color: COLORS.textPrimary,
    fontSize: FONT.base,
    lineHeight: 21,
    marginTop: SPACING.xs,
  },
  itemList: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  itemRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  bullet: {
    backgroundColor: COLORS.tech,
    borderRadius: RADIUS.full,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  itemText: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: FONT.base,
    lineHeight: 21,
  },
  progressDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.xs,
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  progressDot: {
    backgroundColor: COLORS.borderInput,
    borderRadius: RADIUS.full,
    height: 7,
    width: 7,
  },
  progressDotActive: {
    backgroundColor: COLORS.tech,
    width: 22,
  },
  pageActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  pageButton: {
    flex: 1,
  },
  pageCounter: {
    color: COLORS.textMuted,
    fontSize: FONT.sm,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  reviewActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  reviewButton: {
    flex: 1,
  },
  emptyText: {
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginVertical: SPACING.md,
  },
  generateButton: {
    marginTop: SPACING.md,
  },
});
