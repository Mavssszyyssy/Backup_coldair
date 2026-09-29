import { useEffect, useRef, useState } from "react";
import { serviceDateLabel, serviceLabel } from "../../domain/myunit/serviceHistoryDisplay";
import HistoryPagination from "./HistoryPagination";

const SECTIONS_PER_PAGE = 2;

function PrescriptionList({ title, items = [], empty = "" }) {
  if (!items.length && !empty) return null;
  return <section className="ai-prescription-block">
    <h5>{title}</h5>
    {items.length ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>{empty}</p>}
  </section>;
}

function AiServicePrescriptionContent({ interpretation, compact = false }) {
  const [assessmentPage, setAssessmentPage] = useState(1);
  const assessmentRef = useRef(null);
  const date = interpretation.recommendedFollowUpDate || interpretation.recommendedDate;
  const technicianFinding = interpretation.technicianRecorded || interpretation.problemsFound || "No detailed technician finding was recorded.";
  const possibleCauses = Array.isArray(interpretation.possibleCauses) ? interpretation.possibleCauses.filter(Boolean) : [];
  const diagnosticActions = Array.isArray(interpretation.diagnosticActions) ? interpretation.diagnosticActions.filter(Boolean) : [];
  const sections = [
    <section key="technician-findings" className="ai-prescription-block">
      <h5>1. Technician Findings</h5>
      <p>{technicianFinding}</p>
      <small>Confirmed recorded evidence from the completed technician report.</small>
    </section>,
    <section key="ai-assessment" className="ai-prescription-block">
      <h5>2. AI Assessment</h5>
      <p>{interpretation.aiAssessment || interpretation.componentConcern || interpretation.customerSummary}</p>
      <small>Possible interpretation, not a confirmed physical diagnosis.</small>
    </section>,
    interpretation.historicalContext ? <section key="history" className="ai-prescription-block ai-prescription-history">
      <h5>Historical Evidence Used</h5>
      <p>{interpretation.historicalContext}</p>
    </section> : null,
    <PrescriptionList key="possible-causes" title="3. Possible Causes" items={possibleCauses} empty="No fault cause is indicated by the completed record." />,
    diagnosticActions.length ? <PrescriptionList key="diagnostic-actions" title="4. Recommended Diagnostic Actions" items={diagnosticActions} /> : null,
    <section key="service-repair" className="ai-prescription-block">
      <h5>5. Recommended Service / Repair</h5>
      <p>{interpretation.recommendedServiceOrRepair || serviceLabel(interpretation.recommendedService)}</p>
    </section>,
    <section key="parts" className="ai-prescription-block">
      <h5>6. Parts / Component Recommendation</h5>
      <p>{interpretation.partsRecommendation || interpretation.inventoryMessage || "No part replacement is supported by the completed record."}</p>
    </section>,
    <section key="date" className="ai-prescription-block">
      <h5>7. Suggested Servicing Date</h5>
      <p><strong>{serviceDateLabel(date)}</strong></p>
      {interpretation.whyThisDate ? <small>{interpretation.whyThisDate}</small> : null}
    </section>,
  ].filter(Boolean);
  const assessmentPages = Math.ceil(sections.length / SECTIONS_PER_PAGE);
  const visibleSections = sections.slice(
    (assessmentPage - 1) * SECTIONS_PER_PAGE,
    assessmentPage * SECTIONS_PER_PAGE,
  );

  useEffect(() => {
    setAssessmentPage(1);
  }, [interpretation]);

  useEffect(() => {
    setAssessmentPage((page) => Math.min(Math.max(page, 1), Math.max(assessmentPages, 1)));
  }, [assessmentPages]);

  const changeAssessmentPage = (page) => {
    setAssessmentPage(page);
    assessmentRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  return <section ref={assessmentRef} className={`ai-prescription${compact ? " ai-prescription-compact" : ""}`} aria-label="AI assessment and service prescription">
    <header>
      <span>AI-assisted assessment &amp; prescription</span>
      <small>{interpretation.provider === "openai" ? "AI-reviewed" : "Evidence-based fallback"}</small>
    </header>
    {visibleSections}
    <HistoryPagination
      currentPage={assessmentPage}
      totalPages={assessmentPages}
      onPageChange={changeAssessmentPage}
      label="Assessment page"
    />
    <footer>A qualified technician must confirm the physical diagnosis before repair or component replacement is finalized.</footer>
  </section>;
}

export default function AiServicePrescription({ interpretation, compact = false }) {
  if (!interpretation) return null;
  return <AiServicePrescriptionContent interpretation={interpretation} compact={compact} />;
}
