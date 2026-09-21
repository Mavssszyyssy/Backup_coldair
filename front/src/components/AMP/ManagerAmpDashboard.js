import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import { BRANCHES } from "../../domain/branches/branches";
import AmpDashboardShell from "./AmpDashboardShell";
import AmpReportCenter from "./AmpReportCenter";
import AmpPurposeGuide from "./AmpPurposeGuide";
import { serviceDateLabel } from "../../domain/myunit/serviceHistoryDisplay";
import "./styles.css";

const SERVICE_WINDOWS = [30, 90, 180, 365];
const UNASSIGNED_BRANCH = "Unassigned";
const PIPELINE_PAGE_SIZE = 10;

const humanLabel = (value, fallback) => String(value || fallback || "")
  .trim()
  .toLowerCase()
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const SERVICE_ACTIONS = {
  repair: {
    title: "Review repair assessments",
    action: "Verify the recorded technician findings, then arrange a qualified inspection before approving repair or replacement work.",
  },
  inspection: {
    title: "Arrange unit inspections",
    action: "Review the recorded concern and schedule a technician assessment before deciding on repair or replacement.",
  },
  deep_cleaning: {
    title: "Prepare deep-cleaning capacity",
    action: "Confirm customer availability and assign sufficient technician time for the recorded deep-cleaning recommendations.",
  },
  regular_cleaning: {
    title: "Prepare routine-cleaning capacity",
    action: "Contact the affected customers and plan routine-cleaning slots within the selected service window.",
  },
};

const unitWord = (count) => `${count} unit${Number(count) === 1 ? "" : "s"}`;

export const buildManagementActions = ({ summary = {}, actionSummary = {}, serviceWindow = 30 } = {}) => {
  const total = Number(summary.total || 0);
  const overdue = Number(summary.overdue || 0);
  const upcoming = Number(summary.upcoming || 0);
  if (total === 0) return [{
    level: "monitor",
    title: "Continue monitoring",
    sections: [{ label: "Current workload", value: `No units have a saved servicing date inside the selected ${serviceWindow}-day window. No customer follow-up is indicated by the current AMP records.` }],
  }];

  const actions = [overdue > 0 ? {
    level: "urgent",
    title: "Contact overdue customers first",
    sections: [{ label: "Required follow-up", value: `${unitWord(overdue)} passed the saved suggested servicing date. Review each unit's evidence and service plan before contacting the customer to arrange the appropriate follow-up.` }],
  } : {
    level: "upcoming",
    title: "Prepare upcoming customer follow-ups",
    sections: [{ label: "Required follow-up", value: `${unitWord(upcoming)} ${upcoming === 1 ? "is" : "are"} due within the selected ${serviceWindow}-day window, with no overdue unit recorded. Review the saved plans before arranging service.` }],
  }];

  (actionSummary.serviceDemand || []).forEach((demand) => {
    const definition = SERVICE_ACTIONS[demand.serviceType];
    const count = Number(demand.count || 0);
    if (!definition || count < 1) return;
    actions.push({
      level: demand.overdue > 0 ? "urgent" : "service",
      title: definition.title,
      sections: [
        { label: "Saved recommendation", value: `${unitWord(count)} ${count === 1 ? "has" : "have"} a saved ${humanLabel(demand.serviceType)} recommendation${demand.overdue > 0 ? `; ${unitWord(demand.overdue)} ${Number(demand.overdue) === 1 ? "is" : "are"} overdue` : ""}.` },
        { label: "Manager action", value: definition.action },
      ],
    });
  });

  const priorityUnits = actionSummary.priorityUnits?.length
    ? actionSummary.priorityUnits
    : actionSummary.earliestDueUnit ? [actionSummary.earliestDueUnit] : [];
  priorityUnits.slice(0, 3).forEach((unit) => {
    if (!unit?.bestServicedBy) return;
    const sections = [
      { label: "Unit and customer", value: `${unit.customerName || "Recorded customer"} · ${unit.serialNumber || "Serial number not recorded"}` },
      unit.currentStatus ? { label: "Current status", value: humanLabel(unit.currentStatus) } : null,
      unit.assessment ? { label: "Assessment", value: unit.assessment } : null,
      unit.technicianRecorded ? { label: "Technician recorded", value: unit.technicianRecorded } : null,
      unit.previousVisitHistory?.length ? { label: "Previous visit history", value: unit.previousVisitHistory } : null,
      unit.currentIssues?.length ? { label: "Current issues", value: unit.currentIssues } : { label: "Current issues", value: unit.affectedComponent ? `The recorded ${humanLabel(unit.affectedComponent).toLowerCase()} concern requires follow-up.` : "No unresolved issue is recorded in the latest visit assessment." },
      unit.completedWork?.length ? { label: "Completed work", value: unit.completedWork } : unit.workCompleted ? { label: "Completed work", value: unit.workCompleted } : null,
      unit.customerObservation ? { label: "Customer observation", value: unit.customerObservation } : null,
      (unit.affectedComponent || unit.severity) ? { label: "Follow-up priority", value: [unit.affectedComponent ? `Recorded component: ${humanLabel(unit.affectedComponent)}.` : "", unit.severity ? `Priority: ${humanLabel(unit.severity)}.` : ""].filter(Boolean).join(" ") } : null,
      { label: "Recommended action", value: unit.recommendedActions?.length ? unit.recommendedActions : ["Open the service plan to verify the recorded basis and next steps."] },
      unit.recommendedPart ? { label: "Recommended part", value: unit.recommendedPart } : null,
      { label: "Next possible visit", value: `${humanLabel(unit.recommendedService, "inspection")} by ${serviceDateLabel(unit.nextPossibleVisit || unit.bestServicedBy)}.` },
      unit.reason ? { label: "Why this date", value: unit.reason } : null,
    ].filter(Boolean);
    actions.push({
      level: unit.severity && ["urgent", "critical"].includes(unit.severity) ? "urgent" : "next",
      title: `Unit action · ${unit.modelName || "AC Unit"}`,
      sections,
    });
  });
  return actions;
};

function PipelineTable({ units, onSelectPlan }) {
  return (
    <div className="amp-table-wrap">
      <table className="amp-table">
        <thead>
          <tr>
            <th>Unit</th>
            <th>Customer</th>
            <th>Suggested Servicing Date</th>
            <th>Recommended Service</th>
            <th>Reason & next step</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.unitId}>
              <td>
                <strong>{unit.modelName}</strong>
                <span>{unit.serialNumber}</span>
                <span>{unit.zipCode}</span>
              </td>
              <td>
                <strong>{unit.customerName}</strong>
                <span>{unit.addressLine || "Address pending"}</span>
              </td>
              <td>
                <strong>{serviceDateLabel(unit.bestServicedBy)}</strong>
                <span className={unit.overdue ? "amp-due-overdue" : ""}>{unit.daysUntilDue == null ? "Date needs review" : unit.overdue ? `${Math.abs(unit.daysUntilDue)} days overdue` : Number(unit.daysUntilDue) === 0 ? "Due today" : `Due in ${unit.daysUntilDue} days`}</span>
              </td>
              <td>
                <strong>{humanLabel(unit.recommendedService, "not yet assessed")}</strong>
                <span>{unit.lastServiceDate ? `Last service ${serviceDateLabel(unit.lastServiceDate)}` : "No completed service recorded"}</span>
              </td>
              <td>
                <details className="amp-details amp-recommendation-details"><summary>See more</summary><div className="amp-recommendation-sections">
                  <section><h4>Assessment</h4><p>{unit.aiAssessment || "Generate a service plan to review this AC's completed records."}</p></section>
                  <section><h4>Current Status</h4><p>{humanLabel(unit.currentStatus, "Not recorded")}</p></section>
                  <section><h4>Technician Recorded</h4><p>{unit.technicianRecorded || "No technician observation is recorded for the latest visit."}</p></section>
                  {unit.previousVisitHistory?.length ? <section><h4>Previous Visit History</h4><ul>{unit.previousVisitHistory.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section> : null}
                  {(unit.condition || unit.capacityAssessment?.summary) ? <section><h4>Current AC condition</h4>{unit.condition ? <p>{humanLabel(unit.condition)}</p> : null}{unit.capacityAssessment?.summary ? <p>{unit.capacityAssessment.summary}</p> : null}</section> : null}
                  <section><h4>Current Issues</h4>{unit.currentIssues?.length ? <ul>{unit.currentIssues.map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}</ul> : <p>{unit.affectedComponent ? `The recorded ${humanLabel(unit.affectedComponent).toLowerCase()} concern requires follow-up.` : "No unresolved issue is recorded in the latest visit assessment."}</p>}</section>
                  {unit.completedWork?.length ? <section><h4>Completed Work</h4><ul>{unit.completedWork.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section> : null}
                  <section><h4>Recommended Action</h4>{unit.recommendedActions?.length ? <ul>{unit.recommendedActions.map((action) => <li key={action}>{action}</li>)}</ul> : <p>{`Review the records and arrange ${humanLabel(unit.recommendedService, "the recommended service").toLowerCase()} with the customer.`}</p>}</section>
                  <section><h4>Recommended Part</h4><p>{unit.recommendedPart || "No part recommendation is supported by the recorded history."}</p></section>
                  <section><h4>Next Possible Visit</h4><p>{serviceDateLabel(unit.nextPossibleVisit || unit.bestServicedBy)}{unit.daysUntilDue == null ? "" : unit.overdue ? ` · ${Math.abs(unit.daysUntilDue)} days overdue` : Number(unit.daysUntilDue) === 0 ? " · Due today" : ` · Due in ${unit.daysUntilDue} days`}</p></section>
                  <section><h4>Why This Date</h4><p>{unit.whyThisDate || unit.recommendationBasis || "Generate a service plan to review the available records."}</p></section>
                  <section><h4>Operational context</h4><p>Warranty: {humanLabel(unit.warrantyStatus, "pending activation")} · Branch: {unit.serviceBranch || "Not assigned"}</p></section>
                </div></details>
                <a className="amp-plan-link" href="#amp-service-plan" onClick={() => onSelectPlan(String(unit.unitId))}>Review service plan</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManagerAmpDashboard() {
  const { userRole } = useUser();
  const isCompanyWide = userRole === "superadmin" || userRole === "owner";
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [serviceWindow, setServiceWindow] = useState(30);
  const [pipeline, setPipeline] = useState([]);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [pipelinePagination, setPipelinePagination] = useState({ page: 1, pageSize: PIPELINE_PAGE_SIZE, total: 0, totalPages: 1 });
  const [branchSummary, setBranchSummary] = useState([]);
  const [actionSummary, setActionSummary] = useState({ serviceDemand: [], priorityUnits: [], earliestDueUnit: null });
  const [reportUnits, setReportUnits] = useState([]);
  const [aggregate, setAggregate] = useState({ modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planSelection, setPlanSelection] = useState({ unitId: "", revision: 0 });
  const [refreshRevision, setRefreshRevision] = useState(0);
  const selectPlan = (unitId) => setPlanSelection((previous) => ({ unitId, revision: previous.revision + 1 }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const branchQuery = isCompanyWide && selectedBranch !== "all"
      ? `&branch=${encodeURIComponent(selectedBranch)}`
      : "";
    Promise.all([
      apiRequest(`/amp/manager/pipeline?days=${serviceWindow}&page=${pipelinePage}&pageSize=${PIPELINE_PAGE_SIZE}${branchQuery}`),
      apiRequest("/amp/report-units"),
    ])
      .then(([pipelineResult, reportUnitResult]) => {
        if (cancelled) return;
        setPipeline(pipelineResult.units || []);
        setPipelinePagination(pipelineResult.pagination || { page: 1, pageSize: PIPELINE_PAGE_SIZE, total: pipelineResult.units?.length || 0, totalPages: 1 });
        setBranchSummary(pipelineResult.branchSummary || []);
        setActionSummary(pipelineResult.actionSummary || { serviceDemand: [], priorityUnits: [], earliestDueUnit: null });
        setReportUnits(reportUnitResult.units || []);
        setAggregate(pipelineResult.aggregate || { modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Unable to load AMP pipeline.");
        setPipeline([]);
        setPipelinePagination({ page: 1, pageSize: PIPELINE_PAGE_SIZE, total: 0, totalPages: 1 });
        setBranchSummary([]);
        setActionSummary({ serviceDemand: [], priorityUnits: [], earliestDueUnit: null });
        setReportUnits([]);
        setAggregate({ modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCompanyWide, selectedBranch, serviceWindow, pipelinePage, refreshRevision]);

  const currentSummary = useMemo(() => {
    if (!branchSummary.length) {
      return {
        total: pipeline.length,
        upcoming: pipeline.filter((unit) => !unit.overdue).length,
        overdue: pipeline.filter((unit) => unit.overdue).length,
      };
    }
    if (isCompanyWide && selectedBranch !== "all") {
      return branchSummary.find((item) => item.branch === selectedBranch) || { total: 0, upcoming: 0, overdue: 0 };
    }
    return branchSummary.reduce((totals, item) => ({
      total: totals.total + item.total,
      upcoming: totals.upcoming + item.upcoming,
      overdue: totals.overdue + item.overdue,
    }), { total: 0, upcoming: 0, overdue: 0 });
  }, [branchSummary, isCompanyWide, pipeline, selectedBranch]);

  const groupedPipeline = useMemo(() => {
    const groups = new Map();
    pipeline.forEach((unit) => {
      const branch = unit.serviceBranch || UNASSIGNED_BRANCH;
      groups.set(branch, [...(groups.get(branch) || []), unit]);
    });
    const order = [...BRANCHES, UNASSIGNED_BRANCH];
    return Array.from(groups.entries())
      .map(([branch, units]) => ({ branch, units }))
      .sort((a, b) => order.indexOf(a.branch) - order.indexOf(b.branch));
  }, [pipeline]);

  const visibleReportUnits = useMemo(() => {
    if (!isCompanyWide || selectedBranch === "all") return reportUnits;
    return reportUnits.filter((unit) => unit.branch === selectedBranch);
  }, [isCompanyWide, reportUnits, selectedBranch]);

  const unassignedCount = branchSummary.find((item) => item.branch === UNASSIGNED_BRANCH)?.total || 0;
  const effectiveActionSummary = useMemo(() => {
    if (actionSummary.serviceDemand?.length || actionSummary.priorityUnits?.length || actionSummary.earliestDueUnit) return actionSummary;
    const serviceDemand = Array.from(pipeline.reduce((counts, unit) => {
      const serviceType = unit.recommendedService || "inspection";
      const current = counts.get(serviceType) || { serviceType, count: 0, overdue: 0 };
      current.count += 1;
      if (unit.overdue) current.overdue += 1;
      counts.set(serviceType, current);
      return counts;
    }, new Map()).values());
    const first = pipeline[0];
    return {
      serviceDemand,
      priorityUnits: first ? [{
        unitId: first.unitId,
        modelName: first.modelName,
        serialNumber: first.serialNumber,
        customerName: first.customerName,
        bestServicedBy: first.bestServicedBy,
        recommendedService: first.recommendedService,
        assessment: first.aiAssessment,
      }] : [],
      earliestDueUnit: first ? {
        unitId: first.unitId,
        modelName: first.modelName,
        serialNumber: first.serialNumber,
        customerName: first.customerName,
        bestServicedBy: first.bestServicedBy,
        recommendedService: first.recommendedService,
      } : null,
    };
  }, [actionSummary, pipeline]);
  const managementActions = useMemo(() => buildManagementActions({
    summary: currentSummary,
    actionSummary: effectiveActionSummary,
    serviceWindow,
  }), [currentSummary, effectiveActionSummary, serviceWindow]);
  const pageTitle = isCompanyWide ? "AMP · Maintenance across branches" : "AMP · My branch maintenance";
  const pageSubtitle = isCompanyWide
    ? "See which branches need attention. Branch admins remain responsible for service processing."
    : "Review upcoming and overdue AC maintenance for your branch. These are suggestions, not confirmed bookings.";

  return (
    <AmpDashboardShell title={pageTitle} subtitle={pageSubtitle}>
      <AmpPurposeGuide planning={isCompanyWide} />
      <div className="amp-metrics">
        <article>
          <span>Units to follow up</span>
          <strong>{loading ? "…" : error ? "Unavailable" : currentSummary.total}</strong>
          <small>Review these saved unit-level plans.</small>
        </article>
        <article>
          <span>Due within {serviceWindow} days</span>
          <strong>{loading ? "…" : error ? "Unavailable" : currentSummary.upcoming}</strong>
          <small>Prepare customer contact and service capacity.</small>
        </article>
        <article>
          <span>Overdue · follow up first</span>
          <strong>{loading ? "…" : error ? "Unavailable" : currentSummary.overdue}</strong>
          <small>Prioritize verified overdue plans first.</small>
        </article>
        {isCompanyWide ? (
          <article>
            <span>Unassigned units</span>
            <strong>{loading ? "…" : error ? "Unavailable" : unassignedCount}</strong>
          </article>
        ) : null}
      </div>

      {!loading && !error ? (
        <section className="amp-card amp-management-actions" aria-labelledby="amp-management-actions-title">
          <div className="amp-action-heading">
            <div>
              <span className="amp-action-eyebrow">Decision support</span>
              <h2 id="amp-management-actions-title">What the branch should do next</h2>
              <p>These actions come from the saved servicing dates and service recommendations for the selected branch and service window.</p>
            </div>
            {currentSummary.total > 0 ? <a href="#amp-follow-up-units">Review affected units</a> : null}
          </div>
          <div className="amp-action-grid">
            {managementActions.map((action, index) => (
              <article className={`amp-action-item ${action.level}`} key={`${action.title}-${index}`}>
                <span>{index + 1}</span>
                <div>
                  <h3>{action.title}</h3>
                  {action.sections?.[0] ? <p className="amp-action-preview">{Array.isArray(action.sections[0].value) ? action.sections[0].value[0] : action.sections[0].value}</p> : null}
                  <details className="amp-action-more">
                    <summary>See more</summary>
                    <dl className="amp-action-sections">{action.sections?.map((section) => <div key={section.label}><dt>{section.label}</dt>{Array.isArray(section.value) ? <dd><ul>{section.value.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul></dd> : <dd>{section.value}</dd>}</div>)}</dl>
                  </details>
                </div>
              </article>
            ))}
          </div>
          <p className="amp-action-disclaimer">Recommendations guide follow-up and staffing. Confirm each unit’s original technician evidence before scheduling or approving repair work.</p>
        </section>
      ) : null}

      {isCompanyWide ? (
        <section className="amp-card amp-branch-overview">
          <div className="amp-card-header">
            <div>
              <h2>Branch Workload</h2>
              <p className="amp-muted">Select a branch to review its upcoming and overdue units. This overview does not reassign or process branch work.</p>
            </div>
            <div className="amp-overview-filters">
              <label className="amp-branch-filter">
                Service window
                <select value={serviceWindow} onChange={(event) => { setPipelinePage(1); setServiceWindow(Number(event.target.value)); }}>
                  {SERVICE_WINDOWS.map((days) => <option key={days} value={days}>Next {days} days</option>)}
                </select>
              </label>
              <label className="amp-branch-filter">
                Branch
                <select value={selectedBranch} onChange={(event) => { setPipelinePage(1); setSelectedBranch(event.target.value); }}>
                  <option value="all">All branches</option>
                  {[...BRANCHES, UNASSIGNED_BRANCH].map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                </select>
              </label>
            </div>
          </div>
          {unassignedCount > 0 ? <p className="amp-unassigned-notice"><strong>{unassignedCount} unit{unassignedCount === 1 ? " has" : "s have"} no responsible branch.</strong> These records are not included in any branch admin’s service queue.</p> : null}
          <div className="amp-branch-summary-grid">
            {branchSummary.map((item) => (
              <button
                type="button"
                className={selectedBranch === item.branch ? "amp-branch-summary active" : "amp-branch-summary"}
                key={item.branch}
                onClick={() => { setPipelinePage(1); setSelectedBranch(item.branch); }}
                aria-pressed={selectedBranch === item.branch}
                aria-label={`Show ${item.branch} service workload`}
              >
                <span>{item.branch}</span>
                <strong>{item.total}</strong>
                <small>{item.upcoming} upcoming · {item.overdue} overdue</small>
              </button>
            ))}
          </div>
          {selectedBranch !== "all" ? <button type="button" className="amp-clear-branch" onClick={() => { setPipelinePage(1); setSelectedBranch("all"); }}>Show all branches</button> : null}
        </section>
      ) : null}

      <section className="amp-card" id="amp-follow-up-units">
        <div className="amp-card-header">
          <div>
            <h2>{isCompanyWide ? "Units needing branch follow-up" : "Units to follow up"}</h2>
            {isCompanyWide ? <p className="amp-muted">Read-only company oversight, grouped by the branch responsible for follow-up.</p> : null}
          </div>
          {!isCompanyWide ? <label className="amp-branch-filter">Service window<select value={serviceWindow} onChange={(event) => { setPipelinePage(1); setServiceWindow(Number(event.target.value)); }}>{SERVICE_WINDOWS.map((days) => <option key={days} value={days}>Next {days} days</option>)}</select></label> : null}
          {loading ? <span>Loading...</span> : null}
        </div>

        {error ? <p className="amp-error">{error}</p> : null}

        {!loading && !error && pipeline.length === 0 ? (
          <p className="amp-empty">No units are entering the selected {serviceWindow}-day service window.</p>
        ) : null}

        {pipeline.length > 0 && isCompanyWide ? (
          <div className="amp-pipeline-groups">
            {groupedPipeline.map((group) => (
              <section className="amp-pipeline-group" key={group.branch}>
                <header>
                  <div><h3>{group.branch === UNASSIGNED_BRANCH ? "Unassigned Units" : `${group.branch} Branch`}</h3><span>{group.units.length} unit{group.units.length === 1 ? "" : "s"}</span></div>
                  <strong>{group.units.filter((unit) => unit.overdue).length} overdue</strong>
                </header>
                <PipelineTable units={group.units} onSelectPlan={selectPlan} />
              </section>
            ))}
          </div>
        ) : null}

        {pipeline.length > 0 && !isCompanyWide ? <PipelineTable units={pipeline} onSelectPlan={selectPlan} /> : null}
        {!loading && !error && pipelinePagination.total > 0 ? (
          <nav className="amp-pagination" aria-label="Maintenance pipeline pages">
            <button type="button" onClick={() => setPipelinePage((value) => Math.max(1, value - 1))} disabled={pipelinePage <= 1}>Previous</button>
            <span>Page {pipelinePagination.page} of {pipelinePagination.totalPages} · {pipelinePagination.total} units</span>
            <button type="button" onClick={() => setPipelinePage((value) => Math.min(pipelinePagination.totalPages, value + 1))} disabled={pipelinePage >= pipelinePagination.totalPages}>Next</button>
          </nav>
        ) : null}
      </section>

      <div id="amp-service-plan"><AmpReportCenter onPlanGenerated={() => setRefreshRevision(value => value + 1)} key={`${selectedBranch}:${planSelection.revision}`} initialUnitId={planSelection.unitId} units={visibleReportUnits} title="Understand a unit’s next service" subtitle="Choose a unit and generate its plan. Accepted AI servicing dates are saved; the report identifies AI estimates and system fallbacks." /></div>

      <details className="amp-card amp-details"><summary>Past cleaning and parts use</summary>
      <div className="amp-report-grid">
        <section className="amp-card">
          <h2>Recorded cleaning by model</h2>
          <p className="amp-muted">Ranked only from completed service records {isCompanyWide && selectedBranch === "all" ? "across all branches" : "in the selected branch"}.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Model</th><th>Recorded services</th><th>Services / unit</th></tr></thead><tbody>{aggregate.modelTrends.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}</tbody></table></div>
          {!aggregate.modelTrends.length && !loading && !error ? <p className="amp-empty">No recorded service trend is available yet.</p> : null}
        </section>
        <section className="amp-card">
          <h2>Parts used in past services</h2>
          <p className="amp-muted">Aggregate recorded use of the two service-trip components: compressor/motor and control board. This is inventory planning, not a unit diagnosis.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Component</th><th>Recorded uses</th></tr></thead><tbody>{aggregate.componentReplacements.map((item) => <tr key={item.component}><td>{item.component}</td><td>{item.count}</td></tr>)}</tbody></table></div>
          {!aggregate.componentReplacements.length && !loading && !error ? <p className="amp-empty">No recorded component use is available yet.</p> : null}
        </section>
      </div>
      </details>
    </AmpDashboardShell>
  );
}

export default ManagerAmpDashboard;
