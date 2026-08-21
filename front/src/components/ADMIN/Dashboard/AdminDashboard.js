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
import AdminLayout from "../Common/AdminLayout";
import "./styles.css";

const PERIODS = ["daily", "monthly", "quarterly"];

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
  const { user } = useUser();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({ stats: null, analytics: null });
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await apiRequest("/dashboard/me");
        if (!mounted) return;
        setDashboard({ stats: result.stats || null, analytics: result.analytics || null });
        setUpdatedAt(new Date());
        setError("");
      } catch (loadError) {
        if (mounted) setError(loadError?.message || "Unable to load live analytics.");
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const stats = dashboard.stats || {};
  const analytics = dashboard.analytics || {};
  const sales = analytics.sales?.[period] || [];
  const stageData = analytics.orderStages || [];
  const paymentData = analytics.paymentMethods || [];

  return (
    <AdminLayout title="Commerce analytics" subtitle="Paid revenue, sales performance, and branch operations for your active scope.">
      <div className="admin-dashboard commerce-dashboard">
        <div className="commerce-dashboard-intro">
          <div>
            <p className="commerce-eyebrow">LIVE E-COMMERCE REPORTING</p>
            <h2>Good day, {user?.name || "Admin"}</h2>
            <p>Revenue charts include paid, non-cancelled orders only. Operational order stages include the full order pipeline.</p>
          </div>
          <div className="commerce-updated">{updatedAt ? `Updated ${updatedAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : "Loading latest data..."}</div>
        </div>

        {error ? <div className="commerce-error">{error}</div> : null}

        <div className="commerce-kpi-grid">
          <KpiCard label="Paid revenue" value={formatCurrency(stats.totalSales)} detail="Collected from paid orders" tone="blue" />
          <KpiCard label="Paid orders" value={Number(stats.paidOrders || 0).toLocaleString()} detail={`${Number(stats.totalOrders || 0).toLocaleString()} active orders in pipeline`} tone="green" />
          <KpiCard label="Average order value" value={formatCurrency(stats.averageOrderValue)} detail="Paid revenue ÷ paid orders" tone="violet" />
          <KpiCard label="Open work" value={Number(stats.pendingTasks || 0).toLocaleString()} detail="Work orders awaiting technician action" tone="amber" />
        </div>

        <div className="commerce-analytics-grid">
          <Panel
            title="Paid revenue trend"
            description="Revenue is grouped by the order payment date when available."
            action={<div className="commerce-tabs">{PERIODS.map((item) => <button key={item} type="button" className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div>}
          >
            <SalesTrendChart data={sales} period={period} />
          </Panel>
          <Panel title="Order pipeline" description="All orders by current fulfillment stage.">
            <DonutChart title="Order pipeline" caption="orders" data={stageData} />
          </Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title="Top products by paid revenue" description="Ranked from completed payment line items."><ProductPerformance products={analytics.topProducts} /></Panel>
          <Panel title="Payment mix" description="Paid order revenue by payment method."><DonutChart title="Payment mix" caption="paid revenue" data={paymentData} valueKey="revenue" valueFormatter={formatCurrency} /></Panel>
        </div>

        <div className="commerce-analytics-grid">
          <Panel title="Branch performance" description="Orders and paid revenue by stock source branch."><BranchPerformance branches={analytics.branches} /></Panel>
          <Panel title="Technician output" description="Completed work orders for the current month."><TechnicianPerformance technicians={analytics.technicianKPIs} /></Panel>
        </div>

        <section className="commerce-panel commerce-actions-panel">
          <div className="commerce-panel-header"><div><h2>Operations</h2><p>Open the workflow that needs action.</p></div></div>
          <div className="commerce-action-grid">
            <button type="button" onClick={() => navigate("/admin/services/orders")}>Process orders</button>
            <button type="button" onClick={() => navigate("/admin/inventory")}>Review inventory</button>
            <button type="button" onClick={() => navigate("/admin/services/technicians")}>Manage technicians</button>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
