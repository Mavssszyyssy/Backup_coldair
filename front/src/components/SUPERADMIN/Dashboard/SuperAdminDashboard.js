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
import { sanitizeLocalPhMobileInput, validateLocalPhMobile } from "../../../utils/phMobileValidation";
import { formatBusinessDate } from "../../../utils/dateTime";
import { translateText } from "../../../utils/customerI18n";
import SuperAdminLayout from "../Common/SuperAdminLayout";
import "../superAdminShared.css";
import "./SuperAdminDashboard.css";

const PERIODS = ["daily", "monthly", "quarterly", "custom"];

function Panel({ title, description, action, children }) {
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

function KpiCard({ label, value, detail, tone }) {
  return <div className={`commerce-kpi commerce-kpi--${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, updateProfile, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState("monthly");
  const [branch, setBranch] = useState('all');
  const [branches, setBranches] = useState([]);
  const [dateDraft, setDateDraft] = useState({ from: '', to: '' });
  const [dateRange, setDateRange] = useState(null);
  const [dateError, setDateError] = useState('');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [dashboard, setDashboard] = useState({ stats: null, analytics: null });
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", address: user?.address || "" });
  const [formError, setFormError] = useState("");
  const scopeKey = `${branch}|${dateRange?.from || ''}|${dateRange?.to || ''}`;

  useEffect(() => {
    let mounted = true;
    setError("");
    apiRequest(dashboardFilterQuery({ branch, ...(dateRange || {}) }))
      .then((result) => {
        if (!mounted) return;
        setDashboard({ stats: result.stats || null, analytics: result.analytics || null, scopeKey });
        setUpdatedAt(new Date());
        setError("");
      })
      .catch((loadError) => mounted && setError(loadError?.message || "Unable to load global commerce analytics."));
    return () => { mounted = false; };
  }, [branch, dateRange, scopeKey]);

  useEffect(() => {
    let mounted = true;
    apiRequest('/branches').then((result) => { if (mounted) setBranches(Array.isArray(result.branches) ? result.branches : []); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const applyDateRange = (event) => {
    event.preventDefault();
    const validation = validateDashboardDates(dateDraft.from, dateDraft.to, today);
    setDateError(validation);
    if (!validation) setDateRange({ ...dateDraft });
  };

  const openEdit = () => {
    setForm({ name: user?.name || "", phone: user?.phone || "", address: user?.address || "" });
    setFormError("");
    setIsEditing(true);
  };
  const onSave = async (event) => {
    event.preventDefault();
    const phoneError = validateLocalPhMobile(form.phone);
    if (phoneError) {
      setFormError(phoneError);
      return;
    }
    setSaving(true);
    try {
      await updateProfile(form);
      setIsEditing(false);
    } catch (saveError) {
      setFormError(saveError?.message || "Unable to update the profile.");
    } finally {
      setSaving(false);
    }
  };

  const scopedDashboard = dashboard.scopeKey === scopeKey ? dashboard : null;
  const stats = scopedDashboard?.stats || {};
  const analytics = scopedDashboard?.analytics || {};
  const completedOrders = Number(analytics.orderStages?.find((item) => item.key === 'complete')?.count || 0);
  const pipelineCancelled = Number(analytics.orderStages?.find((item) => item.key === 'cancelled')?.count || 0);
  const pipelineTotal = Array.isArray(analytics.orderStages) ? analytics.orderStages.reduce((sum, item) => sum + Number(item.count || 0), 0) : 0;
  const acquisitionChartTotal = Array.isArray(analytics.customerAcquisition) ? analytics.customerAcquisition.reduce((sum, item) => sum + Number(item.count || 0), 0) : 0;
  const cancelledMismatch = scopedDashboard?.stats && Number.isFinite(Number(stats.cancelledOrders)) && pipelineCancelled !== Number(stats.cancelledOrders);
  const pipelineMismatch = scopedDashboard?.stats && Number.isFinite(Number(stats.cancelledOrders)) && pipelineTotal !== Number(stats.totalOrders || 0) + Number(stats.cancelledOrders);
  const acquisitionMismatch = scopedDashboard?.stats && Number.isFinite(Number(stats.customerAcquisitionTotal)) && acquisitionChartTotal !== Number(stats.customerAcquisitionTotal);
  const incompleteApi = scopedDashboard?.stats && (stats.cancelledOrders == null || stats.customerAcquisitionTotal == null);
  const pendingOrders = Math.max(0, Number(stats.totalOrders || 0) - completedOrders);

  return (
    <SuperAdminLayout title={t("Executive commerce analytics")} subtitle={t("Global paid revenue, branch health, customer mix, and operating output.")}>
      <div className="commerce-dashboard super-commerce-dashboard">
        <div className="commerce-dashboard-intro">
          <div>
            <p className="commerce-eyebrow">{branch === 'all' ? t('GLOBAL BUSINESS INTELLIGENCE') : `${branch.toUpperCase()} ${t('BUSINESS INTELLIGENCE')}`}</p>
            <h2>{t('Executive overview')}</h2>
            <p>{t('Revenue is recognized from paid, non-cancelled orders. Pipeline stages show every order’s current operational state.')}</p>
          </div>
          <div className="commerce-updated">{scopedDashboard?.stats && updatedAt ? `${t('Updated')} ${updatedAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : error ? t("Unable to load this scope") : t("Loading latest data...")}</div>
        </div>

        {error ? <div className="commerce-error">{error}</div> : null}
        <form className="commerce-date-filter super-dashboard-filters" onSubmit={applyDateRange} aria-label={t("Dashboard filters")}>
          <label>{t("Branch")}<select value={branch} onChange={(event) => setBranch(event.target.value)}><option value="all">{t("All Branches")}</option>{branches.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
          <div className="super-dashboard-periods" role="group" aria-label={t("Reporting period")}>
            <span>{t("Reporting period")}</span>
            <div className="commerce-tabs">{PERIODS.map((item) => <button key={item} type="button" aria-pressed={period === item} className={period === item ? "active" : ""} onClick={() => { setPeriod(item); if (item !== 'custom') { setDateRange(null); setDateError(''); } }}>{t(item === 'custom' ? 'Custom range' : item)}</button>)}</div>
          </div>
          {period === 'custom' ? <div className="super-dashboard-custom-dates"><label>{t("From Date")}<input type="date" max={today} value={dateDraft.from} onChange={(event) => setDateDraft((current) => ({ ...current, from: event.target.value }))} /></label><label>{t("To Date")}<input type="date" max={today} value={dateDraft.to} onChange={(event) => setDateDraft((current) => ({ ...current, to: event.target.value }))} /></label><button type="submit">{t("Apply range")}</button><button type="button" className="super-dashboard-clear" onClick={() => { setDateDraft({ from: '', to: '' }); setDateRange(null); setDateError(''); }}>{t("Clear range")}</button></div> : null}
          {period === 'custom' && dateError ? <span role="alert">{t(dateError)}</span> : null}
          <small className="super-dashboard-range-label">{dateRange ? `${formatBusinessDate(dateRange.from)} ${t('to')} ${formatBusinessDate(dateRange.to)}` : t('All recorded dates')}</small>
        </form>

        <section className="commerce-panel commerce-actions-panel">
          <div className="commerce-panel-header"><div><h2>{t('Executive controls')}</h2><p>{t('Open a business area for the next decision.')}</p></div></div>
          <div className="commerce-action-grid">
            <button type="button" onClick={() => navigate("/superadmin/branches")}>{t('Branch management')}</button>
            <button type="button" onClick={() => navigate("/superadmin/inventory")}>{t('Inventory risk')}</button>
            <button type="button" onClick={() => navigate("/superadmin/alerts")}>{t('Operations alerts')}</button>
          </div>
          <button className="super-profile-button" type="button" onClick={openEdit}>{t('Edit executive profile')}</button>
        </section>

        {scopedDashboard?.stats ? <>
        {incompleteApi ? <div className="commerce-error" role="alert">{t('The dashboard API response is missing reconciliation fields. Check that the web app is connected to the current backend before using these figures.')}</div> : null}
        {!incompleteApi && (cancelledMismatch || pipelineMismatch || acquisitionMismatch) ? <div className="commerce-error" role="alert">{t('Analytics totals do not match the breakdown for this branch and date range. Refresh or contact support before using these figures for a decision.')}</div> : null}
        <div className="commerce-kpi-grid">
          <KpiCard label={t("Paid revenue")} value={formatCurrency(stats.totalSales)} detail={`${t("Collected for")} ${branch === 'all' ? t('all branches') : branch}`} tone="blue" />
          <KpiCard label={t("Non-cancelled orders")} value={Number(stats.totalOrders || 0).toLocaleString()} detail={t("Includes completed and pending orders")} tone="green" />
          <KpiCard label={t("Completed orders")} value={completedOrders.toLocaleString()} detail={t("Fulfillment complete")} tone="green" />
          <KpiCard label={t("Pending orders")} value={pendingOrders.toLocaleString()} detail={t("Not completed or cancelled")} tone="amber" />
          <KpiCard label={t("Cancelled orders")} value={Number(stats.cancelledOrders || 0).toLocaleString()} detail={t("Excluded from paid revenue")} tone="red" />
          <KpiCard label={t("Paid orders")} value={Number(stats.paidOrders || 0).toLocaleString()} detail={t("Successfully paid, not cancelled")} tone="green" />
          <KpiCard label={t("Average order value")} value={formatCurrency(stats.averageOrderValue)} detail={t("Paid revenue ÷ paid orders")} tone="violet" />
          <KpiCard label={t("Customers")} value={Number(stats.customers || 0).toLocaleString()} detail={`${t("Current branch snapshot")} · ${Number(stats.recentlyActiveUsers || 0).toLocaleString()} ${t("signed in during 24 hours")}`} tone="amber" />
        </div>

        <div className="commerce-analytics-grid">
          <Panel title={t("Paid revenue trend")} description={`${t("Payment-date revenue for")} ${branch === 'all' ? t('all branches') : branch}.`}>
            <SalesTrendChart data={analytics.sales?.[period === 'custom' ? 'daily' : period] || []} period={period === 'custom' ? 'daily' : period} t={t} />
          </Panel>
          <Panel title={t("Order pipeline")} description={t("All orders in the selected branch and date range, including cancelled orders, by current fulfillment stage.")}><DonutChart title={t("Order pipeline")} canonicalTitle="Order pipeline" caption={t("orders")} data={analytics.orderStages} t={t} /></Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title={t("Top products by paid revenue")} description={t("Highest earning product lines from paid orders.")}><ProductPerformance products={analytics.topProducts} t={t} /></Panel>
          <Panel title={t("Payment mix")} description={t("Paid revenue split by payment method.")}><DonutChart title={t("Payment mix")} caption={t("paid revenue")} data={analytics.paymentMethods} valueKey="revenue" valueFormatter={formatCurrency} t={t} /></Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title={t("Branch performance")} description={t("Revenue and completed payments by stock source branch.")}><BranchPerformance branches={analytics.branches} t={t} /></Panel>
          <Panel title={t("Customer acquisition")} description={`${t("New customer accounts in")} ${dateRange ? `${formatBusinessDate(dateRange.from)} ${t('to')} ${formatBusinessDate(dateRange.to)}` : t('all recorded dates')} · ${acquisitionChartTotal.toLocaleString()} ${t("customers in the chart. Link tags are recorded, not independently verified; untracked signups are not attributed to marketing.")}`}><DonutChart title={t("Customer acquisition")} canonicalTitle="Customer acquisition" caption={t("customers")} data={analytics.customerAcquisition} emptyText={t("No customer registrations match this branch and date range.")} t={t} /></Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title={t("Technician output")} description={t("Completed work orders this month.")}><TechnicianPerformance technicians={analytics.technicianKPIs} t={t} /></Panel>
        </div>
        </> : !error ? <div className="commerce-empty" role="status">{t("Loading analytics for the selected scope…")}</div> : null}
      </div>

      {isEditing ? (
        <div className="app-modal-overlay" onClick={() => setIsEditing(false)}>
          <form className="app-modal-card" onSubmit={onSave} onClick={(event) => event.stopPropagation()}>
            <h3>{t("Edit Super Admin Profile")}</h3>
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder={t("Name")} />
            <input
              aria-label={t("Phone number")}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={11}
              value={form.phone}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, phone: sanitizeLocalPhMobileInput(event.target.value) }));
                setFormError("");
              }}
              placeholder="09XXXXXXXXX"
            />
            {formError ? <p className="app-modal-error" role="alert">{t(formError)}</p> : <small className="app-modal-help">{t("Use exactly 11 digits (09XXXXXXXXX).")}</small>}
            <input value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} placeholder={t("Address")} />
            <div className="app-modal-actions"><button type="button" onClick={() => setIsEditing(false)}>{t("Cancel")}</button><button type="submit" disabled={saving}>{t(saving ? "Saving..." : "Save Changes")}</button></div>
          </form>
        </div>
      ) : null}
    </SuperAdminLayout>
  );
}

export default SuperAdminDashboard;
