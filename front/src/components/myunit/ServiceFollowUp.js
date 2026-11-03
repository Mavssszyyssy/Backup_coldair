import { serviceDateLabel, serviceLabel } from '../../domain/myunit/serviceHistoryDisplay';
import AiServicePrescription from './AiServicePrescription';
import { useUser } from '../../context/UserContext';
import { translateText } from '../../utils/customerI18n';

const labelForProvider = (provider) => provider === 'openai'
  ? 'AI-reviewed follow-up plan'
  : 'Follow-up based on your service records';

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
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  if (!interpretation || (!interpretation.customerSummary && !interpretation.currentStatus && !interpretation.technicianRecorded && !interpretation.aiAssessment && !interpretation.possibleCauses?.length)) return null;
  const structured = Boolean(
    interpretation.aiAssessment || interpretation.overallCondition || interpretation.componentConcern || interpretation.recommendedPart
    || interpretation.recommendedActions?.length || interpretation.whyThisDate,
  );
  if (!structured) {
    return <div className="history-ai-follow-up">
      <strong>{t(labelForProvider(interpretation.provider))}</strong>
      <span>{interpretation.customerSummary}</span>
    </div>;
  }
  if (interpretation.aiAssessment || interpretation.possibleCauses?.length || interpretation.diagnosticActions?.length) {
    return <AiServicePrescription interpretation={interpretation} />;
  }
  return <section className="history-ai-follow-up history-follow-up-plan" aria-label={t("Predictive maintenance follow-up plan")}>
    <strong>{t(labelForProvider(interpretation.provider))}</strong>
    <PlanRow label={t("Current Status")}>{interpretation.currentStatus || t("Not recorded")}</PlanRow>
    <PlanRow label={t("Technician Recorded")}>{interpretation.technicianRecorded || interpretation.problemsFound}</PlanRow>
    {interpretation.previousVisitHistory?.length ? <div className="history-follow-up-actions"><strong>{t("Previous Visit History")}</strong><ul>{interpretation.previousVisitHistory.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div> : null}
    <PlanRow label={t("Overall AC performance")}>{interpretation.overallCondition}</PlanRow>
    {interpretation.currentIssues?.length ? <div className="history-follow-up-actions"><strong>{t("Current Issues")}</strong><ul>{interpretation.currentIssues.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div> : <PlanRow label={t("Current Issues")}>{interpretation.componentConcern || t("No unresolved issue is recorded in the latest visit assessment.")}</PlanRow>}
    {interpretation.completedWork?.length ? <div className="history-follow-up-actions"><strong>{t("Completed Work")}</strong><ul>{interpretation.completedWork.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div> : null}
    <PlanRow label={t("Recommended Part")}>{interpretation.recommendedPart}</PlanRow>
    <PlanRow label={t("Part and inventory status")}>{interpretation.inventoryMessage}</PlanRow>
    <PlanRow label={t("Recommended Action")}>{t(recommendationLabel(interpretation.recommendedService))}</PlanRow>
    <PlanRow label={t("Next Possible Visit")}>{serviceDateLabel(interpretation.recommendedFollowUpDate)}</PlanRow>
    <PlanRow label={t("Why This Date")}>{interpretation.whyThisDate}</PlanRow>
    {interpretation.recommendedActions?.length ? <div className="history-follow-up-actions">
      <strong>{t("Recommended actions")}</strong>
      <ul>{interpretation.recommendedActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}</ul>
    </div> : null}
    {interpretation.warning ? <span className="history-follow-up-warning">{interpretation.warning}</span> : null}
  </section>;
}

export default ServiceFollowUp;
