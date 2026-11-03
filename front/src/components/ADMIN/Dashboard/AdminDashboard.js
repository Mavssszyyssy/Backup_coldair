import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  BranchPerformance,
  DonutChart,
  formatCurrency,
  ProductPerformance,
  SalesTrendChart,
  TechnicianPerformance,
} from "../../common/CommerceAnalytics";
import { apiRequest } from "../../../config/api";
import { dashboardFilterQuery, validateDashboardDates } from "../../../domain/dashboardFilters";
import { useUser } from "../../../context/UserContext";
import { translateText } from "../../../utils/customerI18n";
import AdminLayout from "../Common/AdminLayout";
import "./styles.css";

const PERIODS = ["daily", "monthly", "quarterly", "custom"];

function KpiCard({ label, value, detail, tone = "blue" }) {
  return (
    <div className={`commerce-kpi commerce-kpi--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Panel({ title, description, children, action }) {
  return (
    <section className="commerce-panel">
      <div className="commerce-panel-header">
        <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

const AdminDashboard = () => {
  const { user, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({ stats: null, analytics: null });
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [dateDraft, setDateDraft] = useState({ from: '', to: '' });
  const [dateRange, setDateRange] = useState(null);
  const [dateError, setDateError] = useState('');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const scopeKey = `${dateRange?.from || ''}|${dateRange?.to || ''}`;

  useEffect(() => {
    let mounted = true;
    setError("");
    const load = async () => {
      try {
        const result = await apiRequest(dashboardFilterQuery(dateRange || {}));
        if (!mounted) return;
        setDashboard({ stats: result.stats || null, analytics: result.analytics || null, scopeKey });
        setUpdatedAt(new Date());
        setError("");
      } catch (loadError) {
        if (mounted) setError(loadError?.message || "Unable to load live analytics.");
      }
    };
    load();
    return () => { mounted = false; };
  }, [dateRange, scopeKey]);

  const applyDateRange = (event) => {
    event.preventDefault();
    const validation = validateDashboardDates(dateDraft.from, dateDraft.to, today);
    setDateError(validation);
    if (!validation) setDateRange({ ...dateDraft });
  };

  const scopedDashboard = dashboard.scopeKey === scopeKey ? dashboard : null;
  const stats = scopedDashboard?.stats || {};
  const analytics = scopedDashboard?.analytics || {};
  const sales = analytics.sales?.[period === 'custom' ? 'daily' : period] || [];
  const stageData = analytics.orderStages || [];
  const paymentData = analytics.paymentMethods || [];

  return (
    <AdminLayout title={t("Commerce analytics")} subtitle={t("Paid revenue, sales performance, and branch operations for your active scope.")}>
      <div className="admin-dashboard commerce-dashboard">
        <div className="commerce-dashboard-intro">
          <div>
            <p className="commerce-eyebrow">{t("LIVE E-COMMERCE REPORTING")}</p>
            <h2>{t("Good day,")} {user?.name || "Admin"}</h2>
            <p>{t("Revenue charts include paid, non-cancelled orders only. Operational order stages include the full order pipeline.")}</p>
          </div>
          <div className="commerce-updated">{scopedDashboard?.stats && updatedAt ? `${t("Updated")} ${updatedAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : error ? t("Unable to load this scope") : t("Loading latest data...")}</div>
        </div>

        {error ? <div className="commerce-error">{error}</div> : null}
        {period === 'custom' ? <form className="commerce-date-filter" onSubmit={applyDateRange}><label>{t("From Date")}<input type="date" max={today} value={dateDraft.from} onChange={(event) => setDateDraft((current) => ({ ...current, from: event.target.value }))} /></label><label>{t("To Date")}<input type="date" max={today} value={dateDraft.to} onChange={(event) => setDateDraft((current) => ({ ...current, to: event.target.value }))} /></label><button type="submit">{t("Apply range")}</button>{dateError ? <span role="alert">{t(dateError)}</span> : null}</form> : null}

        <section className="commerce-panel commerce-actions-panel">
          <div className="commerce-panel-header"><div><h2>{t("Operations")}</h2><p>{t("Open the workflow that needs action.")}</p></div></div>
          <div className="commerce-action-grid">
            <button type="button" onClick={() => navigate("/admin/services/orders")}>{t("Process orders")}</button>
            <button type="button" onClick={() => navigate("/admin/inventory")}>{t("Review inventory")}</button>
            <button type="button" onClick={() => navigate("/admin/services/technicians")}>{t("Manage technicians")}</button>
          </div>
        </section>

        {scopedDashboard?.stats ? <>
        <div className="commerce-kpi-grid">
          <KpiCard label={t("Paid revenue")} value={formatCurrency(stats.totalSales)} detail={t("Collected from paid orders")} tone="blue" />
          <KpiCard label={t("Paid orders")} value={Number(stats.paidOrders || 0).toLocaleString()} detail={`${Number(stats.totalOrders || 0).toLocaleString()} ${t("active orders in pipeline")}`} tone="green" />
          <KpiCard label={t("Average order value")} value={formatCurrency(stats.averageOrderValue)} detail={t("Paid revenue ÷ paid orders")} tone="violet" />
          <KpiCard label={t("Open work")} value={Number(stats.pendingTasks || 0).toLocaleString()} detail={t("Work orders awaiting technician action")} tone="amber" />
        </div>

        <div className="commerce-analytics-grid">
          <Panel
            title={t("Paid revenue trend")}
            description={t("Revenue is grouped by the order payment date when available.")}
            action={<div className="commerce-tabs">{PERIODS.map((item) => <button key={item} type="button" className={period === item ? "active" : ""} onClick={() => { setPeriod(item); if (item !== 'custom') { setDateRange(null); setDateError(''); } }}>{t(item === 'custom' ? 'Custom range' : item)}</button>)}</div>}
          >
            <SalesTrendChart data={sales} period={period === 'custom' ? 'daily' : period} t={t} />
          </Panel>
          <Panel title={t("Order pipeline")} description={t("All orders by current fulfillment stage.")}>
            <DonutChart title={t("Order pipeline")} canonicalTitle="Order pipeline" caption={t("orders")} data={stageData} t={t} />
          </Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title={t("Top products by paid revenue")} description={t("Ranked from completed payment line items.")}><ProductPerformance products={analytics.topProducts} t={t} /></Panel>
          <Panel title={t("Payment mix")} description={t("Paid order revenue by payment method.")}><DonutChart title={t("Payment mix")} caption={t("paid revenue")} data={paymentData} valueKey="revenue" valueFormatter={formatCurrency} t={t} /></Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title={t("Branch performance")} description={t("Orders and paid revenue by stock source branch.")}><BranchPerformance branches={analytics.branches} t={t} /></Panel>
          <Panel title={t("Technician output")} description={t("Completed work orders for the current month.")}><TechnicianPerformance technicians={analytics.technicianKPIs} t={t} /></Panel>
        </div>
        </> : !error ? <div className="commerce-empty" role="status">{t("Loading analytics for the selected scope…")}</div> : null}

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
