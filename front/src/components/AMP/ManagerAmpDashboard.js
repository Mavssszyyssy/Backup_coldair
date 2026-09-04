import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import { BRANCHES } from "../../domain/branches/branches";
import AmpDashboardShell from "./AmpDashboardShell";
import AmpReportCenter from "./AmpReportCenter";
import "./styles.css";

const SERVICE_WINDOWS = [30, 90, 180, 365];
const UNASSIGNED_BRANCH = "Unassigned";

const humanLabel = (value, fallback) => String(value || fallback || "")
  .trim()
  .toLowerCase()
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

function PipelineTable({ units }) {
  return (
    <div className="amp-table-wrap">
      <table className="amp-table">
        <thead>
          <tr>
            <th>Unit</th>
            <th>Customer</th>
            <th>Suggested Servicing Date</th>
            <th>Recommended Service</th>
            <th>Warranty / Branch</th>
            <th>Historical Basis / Room Match</th>
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
                <strong>{new Date(unit.bestServicedBy).toLocaleDateString()}</strong>
                <span>{unit.overdue ? `${Math.abs(unit.daysUntilDue)} days overdue` : `${unit.daysUntilDue} days remaining`}</span>
              </td>
              <td>
                <strong>{humanLabel(unit.recommendedService, "regular_cleaning")}</strong>
                <span>{unit.lastServiceDate ? `Last service ${new Date(unit.lastServiceDate).toLocaleDateString()}` : "First scheduled service"}</span>
              </td>
              <td>
                <strong>{humanLabel(unit.warrantyStatus, "pending_activation")}</strong>
                <span>{unit.serviceBranch || "Branch pending"}</span>
              </td>
              <td>
                <strong>{unit.capacityAssessment?.summary || "Room size is still needed for the HP suitability check."}</strong>
                <span>{unit.recommendationBasis}</span>
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
  const [branchSummary, setBranchSummary] = useState([]);
  const [reportUnits, setReportUnits] = useState([]);
  const [aggregate, setAggregate] = useState({ modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const branchQuery = isCompanyWide && selectedBranch !== "all"
      ? `&branch=${encodeURIComponent(selectedBranch)}`
      : "";
    Promise.all([
      apiRequest(`/amp/manager/pipeline?days=${serviceWindow}${branchQuery}`),
      apiRequest("/amp/report-units"),
    ])
      .then(([pipelineResult, reportUnitResult]) => {
        if (cancelled) return;
        setPipeline(pipelineResult.units || []);
        setBranchSummary(pipelineResult.branchSummary || []);
        setReportUnits(reportUnitResult.units || []);
        setAggregate(pipelineResult.aggregate || { modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Unable to load AMP pipeline.");
        setPipeline([]);
        setBranchSummary([]);
        setReportUnits([]);
        setAggregate({ modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCompanyWide, selectedBranch, serviceWindow]);

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
  const pageTitle = isCompanyWide ? "All-Branch Service Overview" : "Service Pipeline";
  const pageSubtitle = isCompanyWide
    ? "Company-wide oversight of units due or approaching their suggested servicing date. Branch admins remain responsible for service processing."
    : "Units due or approaching their suggested servicing date based on completed records for the same model or brand.";

  return (
    <AmpDashboardShell title={pageTitle} subtitle={pageSubtitle}>
      <div className="amp-metrics">
        <article>
          <span>Units in service window</span>
          <strong>{currentSummary.total}</strong>
        </article>
        <article>
          <span>Due within {serviceWindow} days</span>
          <strong>{currentSummary.upcoming}</strong>
        </article>
        <article>
          <span>Overdue</span>
          <strong>{currentSummary.overdue}</strong>
        </article>
        {isCompanyWide ? (
          <article>
            <span>Unassigned units</span>
            <strong>{unassignedCount}</strong>
          </article>
        ) : null}
      </div>

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
                <select value={serviceWindow} onChange={(event) => setServiceWindow(Number(event.target.value))}>
                  {SERVICE_WINDOWS.map((days) => <option key={days} value={days}>Next {days} days</option>)}
                </select>
              </label>
              <label className="amp-branch-filter">
                Branch
                <select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
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
                onClick={() => setSelectedBranch(item.branch)}
                aria-pressed={selectedBranch === item.branch}
                aria-label={`Show ${item.branch} service workload`}
              >
                <span>{item.branch}</span>
                <strong>{item.total}</strong>
                <small>{item.upcoming} upcoming · {item.overdue} overdue</small>
              </button>
            ))}
          </div>
          {selectedBranch !== "all" ? <button type="button" className="amp-clear-branch" onClick={() => setSelectedBranch("all")}>Show all branches</button> : null}
        </section>
      ) : null}

      <section className="amp-card">
        <div className="amp-card-header">
          <div>
            <h2>{isCompanyWide ? "Units Requiring Branch Attention" : "Upcoming Service Pipeline"}</h2>
            {isCompanyWide ? <p className="amp-muted">Read-only company oversight, grouped by the branch responsible for follow-up.</p> : null}
          </div>
          {loading ? <span>Loading...</span> : null}
        </div>

        {error ? <p className="amp-error">{error}</p> : null}

        {!loading && pipeline.length === 0 ? (
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
                <PipelineTable units={group.units} />
              </section>
            ))}
          </div>
        ) : null}

        {pipeline.length > 0 && !isCompanyWide ? <PipelineTable units={pipeline} /> : null}
      </section>

      <div className="amp-report-grid">
        <section className="amp-card">
          <h2>Model Maintenance Frequency</h2>
          <p className="amp-muted">Ranked only from completed service records {isCompanyWide && selectedBranch === "all" ? "across all branches" : "in the selected branch"}.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Model</th><th>Recorded services</th><th>Services / unit</th></tr></thead><tbody>{aggregate.modelTrends.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}</tbody></table></div>
          {!aggregate.modelTrends.length && !loading ? <p className="amp-empty">No recorded service trend is available yet.</p> : null}
        </section>
        <section className="amp-card">
          <h2>Major-Component Inventory History</h2>
          <p className="amp-muted">Aggregate recorded use of the two service-trip components: compressor/motor and control board. This is inventory planning, not a unit diagnosis.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Component</th><th>Recorded uses</th></tr></thead><tbody>{aggregate.componentReplacements.map((item) => <tr key={item.component}><td>{item.component}</td><td>{item.count}</td></tr>)}</tbody></table></div>
          {!aggregate.componentReplacements.length && !loading ? <p className="amp-empty">No recorded component use is available yet.</p> : null}
        </section>
      </div>
      <AmpReportCenter units={visibleReportUnits} />
    </AmpDashboardShell>
  );
}

export default ManagerAmpDashboard;
