import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../config/api";
import AmpDashboardShell from "./AmpDashboardShell";
import AmpReportCenter from "./AmpReportCenter";
import "./styles.css";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const serviceLabel = (value) => {
  const normalized = String(value || "regular_cleaning").trim().toLowerCase();
  if (normalized === "deep_cleaning") return "Deep cleaning";
  if (normalized === "regular_cleaning") return "Regular cleaning";
  return normalized.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function ForecastBars({ forecast }) {
  const maxVolume = Math.max(1, ...forecast.map((item) => item.serviceVolume));

  return (
    <div className="amp-forecast-chart" aria-label="12 month service volume forecast">
      {forecast.map((item) => {
        const height = Math.max(6, Math.round((item.serviceVolume / maxVolume) * 100));
        return (
          <div className="amp-bar-column" key={item.month}>
            <div className="amp-bar-track">
              <span style={{ height: `${height}%` }} />
            </div>
            <strong>{item.serviceVolume}</strong>
            <small>{item.label}</small>
          </div>
        );
      })}
    </div>
  );
}

function OwnerAmpDashboard() {
  const [forecast, setForecast] = useState([]);
  const [summary, setSummary] = useState({
    totalForecastedServices: 0,
    totalProjectedRevenue: 0,
    averageServiceRevenue: 0,
    revenueDisclaimer: "",
  });
  const [serviceDemand, setServiceDemand] = useState([]);
  const [partsTrend, setPartsTrend] = useState([]);
  const [reportUnits, setReportUnits] = useState([]);
  const [branchDemand, setBranchDemand] = useState([]);
  const [modelTrends, setModelTrends] = useState([]);
  const [brandTrends, setBrandTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiRequest("/amp/owner/forecast?months=12"),
      apiRequest("/amp/report-units"),
    ])
      .then(([result, reportUnitResult]) => {
        setForecast(result.forecast || []);
        setSummary({
          totalForecastedServices: result.totalForecastedServices || 0,
          totalProjectedRevenue: result.totalProjectedRevenue || 0,
          averageServiceRevenue: result.averageServiceRevenue || 0,
          revenueDisclaimer: result.revenueDisclaimer || "",
        });
        setServiceDemand(result.recommendedServiceDemand || []);
        setPartsTrend(result.recordedPartsTrend || []);
        setReportUnits(reportUnitResult.units || []);
        setBranchDemand(result.branchMaintenanceVolume || []);
        setModelTrends(result.modelTrends || []);
        setBrandTrends(result.brandTrends || []);
        setError("");
      })
      .catch((err) => {
        setError(err.message || "Unable to load AMP forecast.");
        setForecast([]);
        setServiceDemand([]);
        setPartsTrend([]);
        setReportUnits([]);
        setBranchDemand([]);
        setModelTrends([]);
        setBrandTrends([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const peakMonth = useMemo(() => {
    if (!forecast.some(item => item.serviceVolume > 0)) return null;
    return forecast.reduce((peak, item) =>
      item.serviceVolume > peak.serviceVolume ? item : peak,
    forecast[0]);
  }, [forecast]);

  return (
    <AmpDashboardShell
      title="12-month workload plan"
      subtitle="Prepare staff and supplies for upcoming maintenance across all branches. These are not confirmed bookings."
    >
      <section className="amp-card amp-guide"><h2>Use this page to plan ahead</h2><p>Check the busiest months and branches before deciding staffing and stock needs. For customers needing attention now, open the service follow-up page.</p><details className="amp-details"><summary>How are these estimates made?</summary><p>The system groups each AC’s next suggested service date by month. It does not predict repeat visits, confirmed orders, or guaranteed income. Adding an AI key does not turn these charts into AI forecasts.</p></details></section>
      <div className="amp-metrics">
        <article>
          <span>Units due in this period</span>
          <strong>{loading ? "…" : error ? "Unavailable" : summary.totalForecastedServices}</strong>
        </article>
        <article>
          <span>Potential service value</span>
          <strong>{loading ? "…" : error ? "Unavailable" : peso.format(summary.totalProjectedRevenue)}</strong>
          <small>Estimate only, not earned revenue</small>
        </article>
        <article>
          <span>Assumed service value</span>
          <strong>{loading ? "…" : error ? "Unavailable" : peso.format(summary.averageServiceRevenue)}</strong>
        </article>
        <article>
          <span>Busiest expected month</span>
          <strong>{loading ? "…" : error ? "Unavailable" : peakMonth ? peakMonth.label : "No services due"}</strong>
        </article>
      </div>

      <section className="amp-card">
        <div className="amp-card-header">
          <h2>Suggested services by month</h2>
          {loading ? <span>Loading...</span> : null}
        </div>

        {error ? <p className="amp-error">{error}</p> : null}
        {forecast.length > 0 ? <ForecastBars forecast={forecast} /> : null}
      </section>

      <div className="amp-report-grid">
        <section className="amp-card">
          <h2>Current cleaning recommendations</h2>
          <p className="amp-muted">All active eligible units, not just those due in the 12-month chart. These are not service requests.</p>
          <div className="amp-table-wrap">
            <table className="amp-table compact">
              <thead><tr><th>Recommended Service</th><th>Units</th></tr></thead>
              <tbody>{serviceDemand.map((item) => <tr key={item.serviceType}><td>{serviceLabel(item.serviceType)}</td><td>{item.count}</td></tr>)}</tbody>
            </table>
          </div>
          {!serviceDemand.length && !loading && !error ? <p className="amp-empty">No maintenance demand is recorded yet.</p> : null}
        </section>
        <section className="amp-card">
          <h2>Parts used in past services</h2>
          <p className="amp-muted">Aggregate recorded use of compressor/motor and control board for inventory planning. This is not a diagnosis of a specific unit.</p>
          <div className="amp-table-wrap">
            <table className="amp-table compact">
              <thead><tr><th>Major Component</th><th>Recorded Uses</th></tr></thead>
              <tbody>{partsTrend.map((item) => <tr key={item.component}><td>{item.component}</td><td>{item.count}</td></tr>)}</tbody>
            </table>
          </div>
          {!partsTrend.length && !loading && !error ? <p className="amp-empty">No major-component history is available for inventory planning.</p> : null}
        </section>
      </div>

      <details className="amp-card amp-details">
        <summary>How the potential service value is calculated</summary>
        <p className="amp-muted">{summary.revenueDisclaimer || "Scenario revenue equals upcoming recommended services multiplied by the assumed service value; it is not booked revenue."}</p>
        <div className="amp-table-wrap">
          <table className="amp-table compact">
            <thead>
              <tr>
                <th>Month</th>
                <th>Service Volume</th>
                <th>Scenario Revenue</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((item) => (
                <tr key={item.month}>
                  <td><strong>{item.label}</strong></td>
                  <td>{item.serviceVolume}</td>
                  <td>{peso.format(item.projectedRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <div className="amp-report-grid">
        <section className="amp-card">
          <h2>Upcoming workload by branch</h2>
          <p className="amp-muted">Upcoming service workload from stored suggested servicing dates.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Branch</th><th>Upcoming services</th></tr></thead><tbody>{branchDemand.map((item) => <tr key={item.branch}><td>{item.branch}</td><td>{item.upcomingServices}</td></tr>)}</tbody></table></div>
          {!branchDemand.length && !loading && !error ? <p className="amp-empty">No upcoming branch workload is recorded.</p> : null}
        </section>
        <section className="amp-card">
          <h2>Recorded cleaning by model and brand</h2>
          <p className="amp-muted">Frequency is calculated from completed service records. It is not a failure rate, reliability score, or unit diagnosis.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Scope</th><th>Recorded services</th><th>Services / unit</th></tr></thead><tbody>{modelTrends.slice(0, 5).map((item) => <tr key={`model-${item.label}`}><td>{item.label}</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}{brandTrends.slice(0, 5).map((item) => <tr key={`brand-${item.label}`}><td>{item.label} (brand)</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}</tbody></table></div>
          {!modelTrends.length && !brandTrends.length && !loading && !error ? <p className="amp-empty">No recorded service-frequency trend is available yet.</p> : null}
        </section>
      </div>
      <AmpReportCenter units={reportUnits} />
    </AmpDashboardShell>
  );
}

export default OwnerAmpDashboard;
