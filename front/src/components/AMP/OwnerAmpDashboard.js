import { useEffect, useMemo, useRef, useState } from "react";
import {
  Buildings,
  CalendarCheck,
  ChartBar,
  ClockCounterClockwise,
  Coins,
  Package,
  TrendUp,
  Wrench,
} from "@phosphor-icons/react";
import { apiRequest } from "../../config/api";
import AmpDashboardShell from "./AmpDashboardShell";
import AmpReportCenter from "./AmpReportCenter";
import AmpPurposeGuide from "./AmpPurposeGuide";
import { useUser } from "../../context/UserContext";
import { translateText } from "../../utils/customerI18n";
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

function ForecastBars({ forecast, t }) {
  const maxVolume = Math.max(1, ...forecast.map((item) => item.serviceVolume));

  return (
    <div className="amp-forecast-chart" role="list" aria-label={t("12 month suggested service volume and estimated value")}>
      {forecast.map((item) => {
        const height = Math.max(6, Math.round((item.serviceVolume / maxVolume) * 100));
        return (
          <div className="amp-bar-column" role="listitem" aria-label={`${item.label}: ${item.serviceVolume} ${t("suggested services")}; ${t("estimated value")} ${peso.format(item.projectedRevenue)}`} key={item.month}>
            <div className="amp-bar-track" title={`${item.label}: ${item.serviceVolume} ${t("suggested services")}; ${t("estimated value")} ${peso.format(item.projectedRevenue)}`}>
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
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
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
  const [reportUnitsLoading, setReportUnitsLoading] = useState(true);
  const [branchDemand, setBranchDemand] = useState([]);
  const [modelTrends, setModelTrends] = useState([]);
  const [brandTrends, setBrandTrends] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const historyRequestRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshRevision, setRefreshRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest("/amp/owner/forecast?months=12&includeHistory=false")
      .then((result) => {
        if (cancelled) return;
        setForecast(result.forecast || []);
        setSummary({
          totalForecastedServices: result.totalForecastedServices || 0,
          totalProjectedRevenue: result.totalProjectedRevenue || 0,
          averageServiceRevenue: result.averageServiceRevenue || 0,
          revenueDisclaimer: result.revenueDisclaimer || "",
        });
        setServiceDemand(result.recommendedServiceDemand || []);
        setBranchDemand(result.branchMaintenanceVolume || []);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Unable to load AMP forecast.");
        setForecast([]);
        setServiceDemand([]);
        setBranchDemand([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshRevision]);

  useEffect(() => {
    let cancelled = false;
    setReportUnitsLoading(true);
    apiRequest("/amp/report-units")
      .then((result) => {
        if (!cancelled) setReportUnits(result.units || []);
      })
      .catch(() => {
        if (!cancelled) setReportUnits([]);
      })
      .finally(() => {
        if (!cancelled) setReportUnitsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const loadHistoricalInsights = () => {
    if (historyLoaded || historyRequestRef.current) return historyRequestRef.current;
    setHistoryLoading(true);
    setHistoryError("");
    const request = apiRequest("/amp/owner/forecast?months=12&includeHistory=true")
      .then((result) => {
        setPartsTrend(result.recordedPartsTrend || []);
        setModelTrends(result.modelTrends || []);
        setBrandTrends(result.brandTrends || []);
        setHistoryLoaded(true);
      })
      .catch((requestError) => {
        setHistoryError(requestError.message || "Unable to load recorded maintenance history.");
      })
      .finally(() => {
        if (historyRequestRef.current === request) historyRequestRef.current = null;
        setHistoryLoading(false);
      });
    historyRequestRef.current = request;
    return request;
  };

  const peakMonth = useMemo(() => {
    if (!forecast.some(item => item.serviceVolume > 0)) return null;
    return forecast.reduce((peak, item) =>
      item.serviceVolume > peak.serviceVolume ? item : peak,
    forecast[0]);
  }, [forecast]);
  const monthsWithSuggestedServices = forecast.filter((item) => item.serviceVolume > 0);

  return (
    <AmpDashboardShell
      title={t("12-month service outlook")}
      subtitle={t("Prepare staff and supplies for upcoming maintenance across all branches. These are not confirmed bookings.")}
    >
      <AmpPurposeGuide planning />
      <div className="amp-metrics amp-owner-metrics">
        <article className="amp-owner-metric services">
          <span className="amp-owner-metric-icon"><CalendarCheck size={24} weight="duotone" aria-hidden="true" /></span>
          <div><span>{t("Units due in this period")}</span><strong>{loading ? "…" : error ? t("Unavailable") : summary.totalForecastedServices}</strong><small>{t("Suggested services in the next 12 months")}</small></div>
        </article>
        <article className="amp-owner-metric peak">
          <span className="amp-owner-metric-icon"><TrendUp size={24} weight="duotone" aria-hidden="true" /></span>
          <div><span>{t("Busiest month")}</span><strong>{loading ? "…" : error ? t("Unavailable") : peakMonth ? peakMonth.label : t("No services due")}</strong><small>{peakMonth ? `${peakMonth.serviceVolume} ${t(peakMonth.serviceVolume === 1 ? "suggested service" : "suggested services")}` : t("No busy month yet")}</small></div>
        </article>
      </div>

      <section className="amp-card amp-owner-section">
        <div className="amp-card-header amp-owner-section-heading">
          <div className="amp-section-title"><span className="amp-section-icon"><ChartBar size={23} weight="duotone" aria-hidden="true" /></span><div><h2>{t("Suggested services by month")}</h2></div></div>
          {loading ? <span>{t("Loading...")}</span> : null}
        </div>

        {error ? <p className="amp-error">{t(error)}</p> : null}
        <p className="amp-muted">{t("Each unit appears in the month of its next suggested service date. These are not booked appointments.")}</p>
        {forecast.length > 0 ? <ForecastBars forecast={forecast} t={t} /> : null}
      </section>

      <section className="amp-card amp-owner-section amp-owner-branch-workload">
        <div className="amp-section-title"><span className="amp-section-icon"><Buildings size={23} weight="duotone" aria-hidden="true" /></span><div><h2>{t("Upcoming services by branch")}</h2><p className="amp-muted">{t("Open Branch maintenance to review overdue units and contact customers.")}</p></div></div>
        <div className="amp-owner-branch-grid">{branchDemand.map((item) => <article key={item.branch}><span><Buildings size={19} weight="duotone" aria-hidden="true" />{item.branch}</span><strong>{item.upcomingServices}</strong><small>{t(item.upcomingServices === 1 ? "upcoming service" : "upcoming services")}</small><i aria-hidden="true"><i style={{ width: `${summary.totalForecastedServices ? Math.min(100, Math.round((item.upcomingServices / summary.totalForecastedServices) * 100)) : 0}%` }} /></i></article>)}</div>
        {!branchDemand.length && !loading && !error ? <p className="amp-empty">{t("No upcoming branch services are recorded.")}</p> : null}
      </section>
      <section className="amp-card amp-owner-section">
          <div className="amp-section-title compact"><span className="amp-section-icon"><Wrench size={20} weight="duotone" aria-hidden="true" /></span><div><h2>{t("Current service needs")}</h2></div></div>
          <p className="amp-muted">{t("Includes all active units. These are suggestions, not customer requests.")}</p>
          <div className="amp-table-wrap">
            <table className="amp-table compact">
              <thead><tr><th>{t("Recommended Service")}</th><th>{t("Units")}</th></tr></thead>
              <tbody>{serviceDemand.map((item) => <tr key={item.serviceType}><td>{t(serviceLabel(item.serviceType))}</td><td>{item.count}</td></tr>)}</tbody>
            </table>
          </div>
          {!serviceDemand.length && !loading && !error ? <p className="amp-empty">{t("No maintenance demand is recorded yet.")}</p> : null}
      </section>

      <details className="amp-card amp-details amp-insight-details" onToggle={(event) => { if (event.currentTarget.open) loadHistoricalInsights(); }}><summary><span className="amp-details-summary-icon"><Package size={19} weight="duotone" aria-hidden="true" /></span><span><strong>{t("Recorded parts history")}</strong><small>{t("Optional completed-service breakdown")}</small></span></summary>
      {historyLoading ? <p className="amp-muted" role="status">{t("Loading recorded maintenance history…")}</p> : null}
      {historyError ? <p className="amp-error" role="alert">{t(historyError)} <button type="button" onClick={loadHistoricalInsights}>{t("Retry")}</button></p> : null}
        <section className="amp-insight-card">
          <div className="amp-section-title compact"><span className="amp-section-icon"><Package size={20} weight="duotone" aria-hidden="true" /></span><div><h2>{t("Parts used in past services")}</h2></div></div>
          <p className="amp-muted">{t("Shows how often compressor, motor, and control-board parts were recorded in completed services.")}</p>
          <div className="amp-table-wrap">
            <table className="amp-table compact">
              <thead><tr><th>{t("Major Component")}</th><th>{t("Recorded Uses")}</th></tr></thead>
              <tbody>{partsTrend.map((item) => <tr key={item.component}><td>{item.component}</td><td>{item.count}</td></tr>)}</tbody>
            </table>
          </div>
          {!partsTrend.length && historyLoaded && !historyLoading && !historyError ? <p className="amp-empty">{t("No past part use is recorded.")}</p> : null}
        </section>
      </details>
      <details className="amp-card amp-details amp-insight-details" open>
        <summary><span className="amp-details-summary-icon"><Coins size={19} weight="duotone" aria-hidden="true" /></span><span><strong>{t("Estimated service value")}</strong><small>{t("Estimated amounts by month")}</small></span></summary>
        <div className="amp-estimate-summary"><div><span>{t("Projected 12-month value")}</span><strong>{loading ? "…" : error ? t("Unavailable") : peso.format(summary.totalProjectedRevenue)}</strong></div><div><span>{t("Planning amount per suggested service")}</span><strong>{loading ? "…" : error ? t("Unavailable") : peso.format(summary.averageServiceRevenue)}</strong></div></div>
        <p className="amp-muted">{t("This is an estimate, not earned revenue.")}</p>
        <p className="amp-muted">{summary.revenueDisclaimer || t("The amount is the number of suggested services multiplied by the estimated value of each service.")}</p>
        {monthsWithSuggestedServices.length ? <div className="amp-table-wrap">
          <table className="amp-table compact">
            <caption>{t("Months with suggested services; amounts are estimates, not collected revenue")}</caption>
            <thead>
              <tr>
                <th>{t("Month")}</th>
                <th>{t("Suggested Services")}</th>
                <th>{t("Estimated Value")}</th>
              </tr>
            </thead>
            <tbody>
              {monthsWithSuggestedServices.map((item) => (
                <tr key={item.month}>
                  <td><strong>{item.label}</strong></td>
                  <td>{item.serviceVolume}</td>
                  <td>{peso.format(item.projectedRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div> : !loading && !error ? <p className="amp-empty">{t("No suggested services have an estimated value in this period.")}</p> : null}
      </details>
      <div id="amp-service-plan"><AmpReportCenter unitsLoading={reportUnitsLoading} onPlanGenerated={() => setRefreshRevision(value => value + 1)} units={reportUnits} title={t("Service planner")} subtitle={t("Choose a unit to review its suggested date, service history, and next steps.")} /></div>
        <details className="amp-card amp-details amp-insight-details" onToggle={(event) => { if (event.currentTarget.open) loadHistoricalInsights(); }}>
          <summary><span className="amp-details-summary-icon"><ClockCounterClockwise size={19} weight="duotone" aria-hidden="true" /></span><span><strong>{t("Service records by model and brand")}</strong><small>{t("Completed services by unit type")}</small></span></summary>
          {historyLoading ? <p className="amp-muted" role="status">{t("Loading recorded maintenance history…")}</p> : null}
          {historyError ? <p className="amp-error" role="alert">{t(historyError)} <button type="button" onClick={loadHistoricalInsights}>{t("Retry")}</button></p> : null}
          <p className="amp-muted">{t("This shows completed service visits only. It does not rate a model or predict a breakdown.")}</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>{t("AC model or brand")}</th><th>{t("Completed services")}</th><th>{t("Average services per unit")}</th></tr></thead><tbody>{modelTrends.slice(0, 5).map((item) => <tr key={`model-${item.label}`}><td>{item.label}</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}{brandTrends.slice(0, 5).map((item) => <tr key={`brand-${item.label}`}><td>{item.label} ({t("brand")})</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}</tbody></table></div>
          {!modelTrends.length && !brandTrends.length && historyLoaded && !historyLoading && !historyError ? <p className="amp-empty">{t("No completed service records are available for comparison yet.")}</p> : null}
        </details>
    </AmpDashboardShell>
  );
}

export default OwnerAmpDashboard;
