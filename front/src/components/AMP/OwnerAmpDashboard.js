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
    if (!forecast.length) return null;
    return forecast.reduce((peak, item) =>
      item.serviceVolume > peak.serviceVolume ? item : peak,
    forecast[0]);
  }, [forecast]);

  return (
    <AmpDashboardShell
      title="Fleet Service Forecast"
      subtitle="Projected service demand and revenue from AMP service periods."
    >
      <div className="amp-metrics">
        <article>
          <span>Forecasted services</span>
          <strong>{summary.totalForecastedServices}</strong>
        </article>
        <article>
          <span>Projected revenue</span>
          <strong>{peso.format(summary.totalProjectedRevenue)}</strong>
        </article>
        <article>
          <span>Avg service value</span>
          <strong>{peso.format(summary.averageServiceRevenue)}</strong>
        </article>
        <article>
          <span>Peak month</span>
          <strong>{peakMonth ? peakMonth.label : "-"}</strong>
        </article>
      </div>

      <section className="amp-card">
        <div className="amp-card-header">
          <h2>12 Month Service Volume</h2>
          {loading ? <span>Loading...</span> : null}
        </div>

        {error ? <p className="amp-error">{error}</p> : null}
        {forecast.length > 0 ? <ForecastBars forecast={forecast} /> : null}
      </section>

      <div className="amp-report-grid">
        <section className="amp-card">
          <h2>Cleaning Demand</h2>
          <div className="amp-table-wrap">
            <table className="amp-table compact">
              <thead><tr><th>Recommended Service</th><th>Units</th></tr></thead>
              <tbody>{serviceDemand.map((item) => <tr key={item.serviceType}><td>{String(item.serviceType || "regular_cleaning").replaceAll("_", " ")}</td><td>{item.count}</td></tr>)}</tbody>
            </table>
          </div>
          {!serviceDemand.length && !loading ? <p className="amp-empty">No maintenance demand is recorded yet.</p> : null}
        </section>
        <section className="amp-card">
          <h2>Recorded Parts Demand</h2>
          <p className="amp-muted">Inventory guidance from parts actually recorded in completed service history.</p>
          <div className="amp-table-wrap">
            <table className="amp-table compact">
              <thead><tr><th>Component / Part</th><th>Recorded Uses</th></tr></thead>
              <tbody>{partsTrend.map((item) => <tr key={item.component}><td>{item.component}</td><td>{item.count}</td></tr>)}</tbody>
            </table>
          </div>
          {!partsTrend.length && !loading ? <p className="amp-empty">No parts-use history is available for forecasting.</p> : null}
        </section>
      </div>

      <section className="amp-card">
        <h2>Revenue Forecast Detail</h2>
        <div className="amp-table-wrap">
          <table className="amp-table compact">
            <thead>
              <tr>
                <th>Month</th>
                <th>Service Volume</th>
                <th>Projected Revenue</th>
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
      </section>
      <div className="amp-report-grid">
        <section className="amp-card">
          <h2>Branch Maintenance Volume</h2>
          <p className="amp-muted">Upcoming service workload from stored Best Serviced By dates.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Branch</th><th>Upcoming services</th></tr></thead><tbody>{branchDemand.map((item) => <tr key={item.branch}><td>{item.branch}</td><td>{item.upcomingServices}</td></tr>)}</tbody></table></div>
          {!branchDemand.length && !loading ? <p className="amp-empty">No upcoming branch workload is recorded.</p> : null}
        </section>
        <section className="amp-card">
          <h2>Model / Brand Reliability Trends</h2>
          <p className="amp-muted">Frequency is calculated from recorded service history and is not a unit diagnosis.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>Scope</th><th>Recorded services</th><th>Services / unit</th></tr></thead><tbody>{modelTrends.slice(0, 5).map((item) => <tr key={`model-${item.label}`}><td>{item.label}</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}{brandTrends.slice(0, 5).map((item) => <tr key={`brand-${item.label}`}><td>{item.label} (brand)</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}</tbody></table></div>
          {!modelTrends.length && !brandTrends.length && !loading ? <p className="amp-empty">No recorded reliability trend is available yet.</p> : null}
        </section>
      </div>
      <AmpReportCenter units={reportUnits} />
    </AmpDashboardShell>
  );
}

export default OwnerAmpDashboard;
