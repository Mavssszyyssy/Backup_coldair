import { serviceDateLabel, serviceLabel } from '../../domain/myunit/serviceHistoryDisplay';

const labelForProvider = (provider) => provider === 'openai'
  ? 'AI-reviewed follow-up plan'
  : 'Evidence-based follow-up plan';

const recommendationLabel = (value) => serviceLabel(value || 'inspection');

function PlanRow({ label, children }) {
  if (!children) return null;
  return <div className="history-follow-up-row">
    <strong>{label}</strong>
    <span>{children}</span>
  </div>;
}

// This keeps the original technician record readable while presenting the
// interpretation as separate, decision-ready fields rather than one paragraph.
function ServiceFollowUp({ interpretation }) {
  if (!interpretation || (!interpretation.customerSummary && !interpretation.currentStatus && !interpretation.technicianRecorded)) return null;
  const structured = Boolean(
    interpretation.overallCondition || interpretation.componentConcern || interpretation.recommendedPart
    || interpretation.recommendedActions?.length || interpretation.whyThisDate,
  );
  if (!structured) {
    return <div className="history-ai-follow-up">
      <strong>{labelForProvider(interpretation.provider)}</strong>
      <span>{interpretation.customerSummary}</span>
    </div>;
  }
  return <section className="history-ai-follow-up history-follow-up-plan" aria-label="Predictive maintenance follow-up plan">
    <strong>{labelForProvider(interpretation.provider)}</strong>
    <PlanRow label="Current Status">{interpretation.currentStatus || "Not recorded"}</PlanRow>
    <PlanRow label="Technician Recorded">{interpretation.technicianRecorded || interpretation.problemsFound}</PlanRow>
    {interpretation.previousVisitHistory?.length ? <div className="history-follow-up-actions"><strong>Previous Visit History</strong><ul>{interpretation.previousVisitHistory.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div> : null}
    <PlanRow label="Overall AC performance">{interpretation.overallCondition}</PlanRow>
    {interpretation.currentIssues?.length ? <div className="history-follow-up-actions"><strong>Current Issues</strong><ul>{interpretation.currentIssues.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div> : <PlanRow label="Current Issues">{interpretation.componentConcern || "No unresolved issue is recorded in the latest visit assessment."}</PlanRow>}
    {interpretation.completedWork?.length ? <div className="history-follow-up-actions"><strong>Completed Work</strong><ul>{interpretation.completedWork.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div> : null}
    <PlanRow label="Recommended Part">{interpretation.recommendedPart}</PlanRow>
    <PlanRow label="Part and inventory status">{interpretation.inventoryMessage}</PlanRow>
    <PlanRow label="Recommended Action">{recommendationLabel(interpretation.recommendedService)}</PlanRow>
    <PlanRow label="Next Possible Visit">{serviceDateLabel(interpretation.recommendedFollowUpDate)}</PlanRow>
    <PlanRow label="Why This Date">{interpretation.whyThisDate}</PlanRow>
    {interpretation.recommendedActions?.length ? <div className="history-follow-up-actions">
      <strong>Recommended actions</strong>
      <ul>{interpretation.recommendedActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}</ul>
    </div> : null}
    {interpretation.warning ? <span className="history-follow-up-warning">{interpretation.warning}</span> : null}
  </section>;
}

export default ServiceFollowUp;
