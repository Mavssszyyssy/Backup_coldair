import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../config/api";
import AmpDashboardShell from "./AmpDashboardShell";
import AmpReportCenter from "./AmpReportCenter";
import "./styles.css";

const humanLabel = (value, fallback) => String(value || fallback || "")
  .trim()
  .toLowerCase()
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

function ManagerAmpDashboard() {
  const [pipeline, setPipeline] = useState([]);
  const [reportUnits, setReportUnits] = useState([]);
  const [aggregate, setAggregate] = useState({ modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiRequest("/amp/manager/pipeline?days=30"),
      apiRequest("/amp/report-units"),
    ])
      .then(([pipelineResult, reportUnitResult]) => {
        setPipeline(pipelineResult.units || []);
        setReportUnits(reportUnitResult.units || []);
        setAggregate(pipelineResult.aggregate || { modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
        setError("");
      })
      .catch((err) => {
        setError(err.message || "Unable to load AMP pipeline.");
        setPipeline([]);
        setReportUnits([]);
        setAggregate({ modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  const overdueCount = useMemo(() => pipeline.filter((unit) => unit.overdue).length, [pipeline]);

  return (
    <AmpDashboardShell
      title="Service Pipeline"
      subtitle="Units due or approaching their maintenance date based on recorded history and operating conditions."
    >
      <div className="amp-metrics">
        <article>
          <span>Due in 30 days</span>
          <strong>{pipeline.length}</strong>
        </article>
        <article>
          <span>Overdue</span>
          <strong>{overdueCount}</strong>
        </article>
      </div>

      <section className="amp-card">
        <div className="amp-card-header">
          <h2>Upcoming Service Pipeline</h2>
          {loading ? <span>Loading...</span> : null}
        </div>

        {error ? <p className="amp-error">{error}</p> : null}

        {!loading && pipeline.length === 0 ? (
          <p className="amp-empty">No units are entering service windows in the next 30 days.</p>
        ) : null}

        {pipeline.length > 0 ? (
          <div className="amp-table-wrap">
            <table className="amp-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Customer</th>
                  <th>Best Serviced By</th>
                  <th>Recommended Service</th>
                  <th>Warranty / Branch</th>
                  <th>Environment / Basis</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.map((unit) => (
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
                      <strong>
                        {humanLabel(unit.recommendedService, "regular_cleaning")}
                      </strong>
                      <span>
                        {unit.lastServiceDate ? `Last service ${new Date(unit.lastServiceDate).toLocaleDateString()}` : "First scheduled service"}
                      </span>
                    </td>
                    <td><strong>{humanLabel(unit.warrantyStatus, "pending_activation")}</strong><span>{unit.serviceBranch || "Branch pending"}</span></td>
                    <td>
                      {unit.environmentRisk ? <strong>{unit.environmentRisk.recorded ? `${String(unit.environmentRisk.level || "low").replaceAll("_", " ")} environment risk` : "Environment not recorded"}</strong> : null}
                      <span>{unit.recommendationBasis}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      <div className="amp-report-grid">
        <section className="amp-card">
          <h2>Model Maintenance Frequency</h2>
          <p className="amp-muted">Ranked only from completed service records in your accessible branch.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Model</th><th>Recorded services</th><th>Services / unit</th></tr></thead><tbody>{aggregate.modelTrends.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}</tbody></table></div>
          {!aggregate.modelTrends.length && !loading ? <p className="amp-empty">No recorded service trend is available yet.</p> : null}
        </section>
        <section className="amp-card">
          <h2>Recorded Component Demand</h2>
          <p className="amp-muted">Parts preparation data from components actually recorded during service.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Component</th><th>Recorded uses</th></tr></thead><tbody>{aggregate.componentReplacements.map((item) => <tr key={item.component}><td>{item.component}</td><td>{item.count}</td></tr>)}</tbody></table></div>
          {!aggregate.componentReplacements.length && !loading ? <p className="amp-empty">No recorded component use is available yet.</p> : null}
        </section>
      </div>
      <AmpReportCenter units={reportUnits} />
    </AmpDashboardShell>
  );
}

export default ManagerAmpDashboard;
