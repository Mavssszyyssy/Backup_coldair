import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../config/api";
import AmpDashboardShell from "./AmpDashboardShell";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiRequest("/amp/owner/forecast?months=12")
      .then((result) => {
        setForecast(result.forecast || []);
        setSummary({
          totalForecastedServices: result.totalForecastedServices || 0,
          totalProjectedRevenue: result.totalProjectedRevenue || 0,
          averageServiceRevenue: result.averageServiceRevenue || 0,
        });
        setError("");
      })
      .catch((err) => {
        setError(err.message || "Unable to load AMP forecast.");
        setForecast([]);
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
    </AmpDashboardShell>
  );
}

export default OwnerAmpDashboard;
