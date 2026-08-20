import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../config/api";
import AmpDashboardShell from "./AmpDashboardShell";
import AmpReportCenter from "./AmpReportCenter";
import "./styles.css";

const confidenceClass = (confidence) =>
  `amp-confidence ${String(confidence || "Low").toLowerCase()}`;

const warningClass = (level) =>
  `amp-warning ${String(level || "medium").toLowerCase()}`;

function ManagerAmpDashboard() {
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiRequest("/amp/manager/pipeline?days=30")
      .then((result) => {
        setPipeline(result.units || []);
        setError("");
      })
      .catch((err) => {
        setError(err.message || "Unable to load AMP pipeline.");
        setPipeline([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const warningCount = useMemo(
    () => pipeline.reduce((sum, unit) => sum + (unit.chainReactionWarnings?.length || 0), 0),
    [pipeline],
  );

  return (
    <AmpDashboardShell
      title="Service Pipeline"
      subtitle="Units entering their next ideal servicing period in the next 30 days."
    >
      <div className="amp-metrics">
        <article>
          <span>Due in 30 days</span>
          <strong>{pipeline.length}</strong>
        </article>
        <article>
          <span>Chain warnings</span>
          <strong>{warningCount}</strong>
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
                  <th>Service Period</th>
                  <th>Last Visit</th>
                  <th>Confidence</th>
                  <th>Dispatch Warnings</th>
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
                      <strong>{unit.nextIdealServicePeriod}</strong>
                      <span>{unit.daysUntilDue} days out</span>
                    </td>
                    <td>
                      <strong>
                        {unit.lastPhysicalVisitDate
                          ? new Date(unit.lastPhysicalVisitDate).toLocaleDateString()
                          : "No visit"}
                      </strong>
                      <span>
                        {unit.daysSinceLastVisit === null
                          ? "Low evidence"
                          : `${unit.daysSinceLastVisit} days ago`}
                      </span>
                    </td>
                    <td>
                      <span className={confidenceClass(unit.confidence)}>{unit.confidence}</span>
                    </td>
                    <td>
                      <div className="amp-warning-stack">
                        {(unit.chainReactionWarnings || []).length === 0 ? (
                          <span className="amp-muted">No active warnings</span>
                        ) : (
                          unit.chainReactionWarnings.map((warning) => (
                            <div className={warningClass(warning.level)} key={warning.code}>
                              <strong>{warning.dispatchRoute.replaceAll("_", " ")}</strong>
                              <p>{warning.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      <AmpReportCenter units={pipeline} />
    </AmpDashboardShell>
  );
}

export default ManagerAmpDashboard;
