import { serviceDateLabel, serviceLabel } from "../../domain/myunit/serviceHistoryDisplay";

function PrescriptionList({ title, items = [], empty = "" }) {
  if (!items.length && !empty) return null;
  return <section className="ai-prescription-block">
    <h5>{title}</h5>
    {items.length ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>{empty}</p>}
  </section>;
}

export default function AiServicePrescription({ interpretation, compact = false }) {
  if (!interpretation) return null;
  const date = interpretation.recommendedFollowUpDate || interpretation.recommendedDate;
  const technicianFinding = interpretation.technicianRecorded || interpretation.problemsFound || "No detailed technician finding was recorded.";
  const possibleCauses = Array.isArray(interpretation.possibleCauses) ? interpretation.possibleCauses.filter(Boolean) : [];
  const diagnosticActions = Array.isArray(interpretation.diagnosticActions) ? interpretation.diagnosticActions.filter(Boolean) : [];
  return <section className={`ai-prescription${compact ? " ai-prescription-compact" : ""}`} aria-label="AI assessment and service prescription">
    <header>
      <span>AI-assisted assessment &amp; prescription</span>
      <small>{interpretation.provider === "openai" ? "AI-reviewed" : "Evidence-based fallback"}</small>
    </header>
    <section className="ai-prescription-block">
      <h5>1. Technician Findings</h5>
      <p>{technicianFinding}</p>
      <small>Confirmed recorded evidence from the completed technician report.</small>
    </section>
    <section className="ai-prescription-block">
      <h5>2. AI Assessment</h5>
      <p>{interpretation.aiAssessment || interpretation.componentConcern || interpretation.customerSummary}</p>
      <small>Possible interpretation, not a confirmed physical diagnosis.</small>
    </section>
    {interpretation.historicalContext ? <section className="ai-prescription-block ai-prescription-history">
      <h5>Historical Evidence Used</h5>
      <p>{interpretation.historicalContext}</p>
    </section> : null}
    <PrescriptionList title="3. Possible Causes" items={possibleCauses} empty="No fault cause is indicated by the completed record." />
    <PrescriptionList title="4. Recommended Diagnostic Actions" items={diagnosticActions} />
    <section className="ai-prescription-block">
      <h5>5. Recommended Service / Repair</h5>
      <p>{interpretation.recommendedServiceOrRepair || serviceLabel(interpretation.recommendedService)}</p>
    </section>
    <section className="ai-prescription-block">
      <h5>6. Parts / Component Recommendation</h5>
      <p>{interpretation.partsRecommendation || interpretation.inventoryMessage || "No part replacement is supported by the completed record."}</p>
    </section>
    <section className="ai-prescription-block">
      <h5>7. Suggested Servicing Date</h5>
      <p><strong>{serviceDateLabel(date)}</strong></p>
      {interpretation.whyThisDate ? <small>{interpretation.whyThisDate}</small> : null}
    </section>
    <footer>A qualified technician must confirm the physical diagnosis before repair or component replacement is finalized.</footer>
  </section>;
}
