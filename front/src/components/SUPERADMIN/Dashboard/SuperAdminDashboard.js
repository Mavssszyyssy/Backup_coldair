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
import { useUser } from "../../../context/UserContext";
import SuperAdminLayout from "../Common/SuperAdminLayout";
import "../superAdminShared.css";
import "./SuperAdminDashboard.css";

const PERIODS = ["daily", "monthly", "quarterly"];

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
  const { user, updateProfile } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState("monthly");
  const [dashboard, setDashboard] = useState({ stats: null, analytics: null });
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", address: user?.address || "" });

  useEffect(() => {
    let mounted = true;
    apiRequest("/dashboard/me")
      .then((result) => {
        if (!mounted) return;
        setDashboard({ stats: result.stats || null, analytics: result.analytics || null });
        setUpdatedAt(new Date());
        setError("");
      })
      .catch((loadError) => mounted && setError(loadError?.message || "Unable to load global commerce analytics."));
    return () => { mounted = false; };
  }, []);

  const openEdit = () => {
    setForm({ name: user?.name || "", phone: user?.phone || "", address: user?.address || "" });
    setIsEditing(true);
  };
  const onSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError?.message || "Unable to update the profile.");
    } finally {
      setSaving(false);
    }
  };

  const stats = dashboard.stats || {};
  const analytics = dashboard.analytics || {};

  return (
    <SuperAdminLayout title="Executive commerce analytics" subtitle="Global paid revenue, branch health, customer mix, and operating output.">
      <div className="commerce-dashboard super-commerce-dashboard">
        <div className="commerce-dashboard-intro">
          <div>
            <p className="commerce-eyebrow">GLOBAL BUSINESS INTELLIGENCE</p>
            <h2>Executive overview</h2>
            <p>Revenue is recognized from paid, non-cancelled orders. Pipeline stages show every order’s current operational state.</p>
          </div>
          <div className="commerce-updated">{updatedAt ? `Updated ${updatedAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : "Loading latest data..."}</div>
        </div>

        {error ? <div className="commerce-error">{error}</div> : null}

        <div className="commerce-kpi-grid">
          <KpiCard label="Paid revenue" value={formatCurrency(stats.totalSales)} detail="Collected across every branch" tone="blue" />
          <KpiCard label="Paid orders" value={Number(stats.paidOrders || 0).toLocaleString()} detail={`${Number(stats.totalOrders || 0).toLocaleString()} active orders`} tone="green" />
          <KpiCard label="Average order value" value={formatCurrency(stats.averageOrderValue)} detail="Paid revenue ÷ paid orders" tone="violet" />
          <KpiCard label="Active customers" value={Number(stats.customers || 0).toLocaleString()} detail={`${Number(stats.recentlyActiveUsers || 0).toLocaleString()} signed in during 24 hours`} tone="amber" />
        </div>

        <div className="commerce-analytics-grid">
          <Panel title="Global paid revenue trend" description="Payment-date revenue across all branches." action={<div className="commerce-tabs">{PERIODS.map((item) => <button key={item} type="button" className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div>}>
            <SalesTrendChart data={analytics.sales?.[period] || []} period={period} />
          </Panel>
          <Panel title="Order pipeline" description="All orders by fulfillment stage."><DonutChart title="Order pipeline" caption="orders" data={analytics.orderStages} /></Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title="Top products by paid revenue" description="Highest earning product lines from paid orders."><ProductPerformance products={analytics.topProducts} /></Panel>
          <Panel title="Payment mix" description="Paid revenue split by payment method."><DonutChart title="Payment mix" caption="paid revenue" data={analytics.paymentMethods} valueKey="revenue" valueFormatter={formatCurrency} /></Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title="Branch performance" description="Revenue and completed payments by stock source branch."><BranchPerformance branches={analytics.branches} /></Panel>
          <Panel title="Customer acquisition" description="Customer accounts grouped by recorded acquisition source."><DonutChart title="Customer acquisition" caption="customers" data={analytics.customerAcquisition} /></Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title="Technician output" description="Completed work orders this month."><TechnicianPerformance technicians={analytics.technicianKPIs} /></Panel>
          <section className="commerce-panel">
            <div className="commerce-panel-header"><div><h2>Executive controls</h2><p>Open a business area for the next decision.</p></div></div>
            <div className="commerce-action-grid">
              <button type="button" onClick={() => navigate("/superadmin/sales")}>Sales operations</button>
              <button type="button" onClick={() => navigate("/superadmin/branches")}>Branch management</button>
              <button type="button" onClick={() => navigate("/superadmin/inventory")}>Inventory risk</button>
              <button type="button" onClick={() => navigate("/superadmin/alerts")}>Customer alerts</button>
            </div>
            <button className="super-profile-button" type="button" onClick={openEdit}>Edit executive profile</button>
          </section>
        </div>
      </div>

      {isEditing ? (
        <div className="app-modal-overlay" onClick={() => setIsEditing(false)}>
          <form className="app-modal-card" onSubmit={onSave} onClick={(event) => event.stopPropagation()}>
            <h3>Edit Super Admin Profile</h3>
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Name" />
            <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" />
            <input value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="Address" />
            <div className="app-modal-actions"><button type="button" onClick={() => setIsEditing(false)}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button></div>
          </form>
        </div>
      ) : null}
    </SuperAdminLayout>
  );
}

export default SuperAdminDashboard;
