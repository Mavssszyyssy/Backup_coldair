import { useMemo, useState } from "react";
import { apiRequest } from "../../../config/api";
import { useUser } from "../../../context/UserContext";
import { BRANCHES } from "../../../domain/branches/branches";
import { exportHtmlToPdfViaPrint, exportToExcel, formatReportValue } from "../../../utils/exporters";
import { getSessionActiveBranch } from "../../../utils/authSession";
import AdminLayout from "../Common/AdminLayout";
import SuperAdminLayout from "../../SUPERADMIN/Common/SuperAdminLayout";
import "./AdminReports.css";

const COMPANY = {
  name: "Cold Air Airconditioning Trading",
  address: "Block 2 Lot 1, Amaresa Subd., Brgy. Guijo, Francisco Homes, San Jose del Monte City, 3023 Bulacan",
  proprietor: "Percival III M. Balmores – Proprietor",
  contact: "(0969) 336 1590",
  taxRegistration: "TIN 451 318 429",
};

const TABS = [
  { id: "sales", label: "Sales Report" },
  { id: "inventory", label: "Inventory Report" },
  { id: "tech", label: "Technician Performance" },
];

const SALES_STATUS_OPTIONS = [
  ["paid", "Paid sales"],
  ["complete", "Completed paid orders"],
  ["all", "All non-cancelled orders"],
  ["to_pay", "Awaiting payment"],
  ["to_deliver", "To deliver"],
  ["to_dispatch", "To dispatch"],
  ["to_install", "To install"],
  ["for_rescheduling", "For rescheduling"],
  ["cancelled", "Cancelled"],
];

const INVENTORY_STATUS_OPTIONS = [
  ["all", "All stock states"],
  ["available", "In stock"],
  ["low", "Low stock"],
  ["out", "Out of stock"],
];

const SUMMARY_LABELS = {
  transactionCount: "Transactions",
  unitsSold: "Units",
  merchandiseSubtotal: "Merchandise subtotal",
  vatAmount: "VAT",
  deliveryFees: "Delivery fees",
  discounts: "Discounts",
  totalOrderValue: "Order value",
  amountCollected: "Amount collected",
  productLines: "Product / branch lines",
  currentStockUnits: "Current stock units",
  inventoryValue: "Inventory value",
  outOfStockItems: "Out-of-stock lines",
  lowStockItems: "Low-stock lines",
  inventoryVarianceItems: "Serial variances",
  technicianCount: "Technicians",
  completedToday: "Completed today",
  completedThisWeek: "Completed this week",
  completedThisMonth: "Completed this month",
};

const COLUMN_LABELS = {
  transactionDate: "Transaction date",
  orderCode: "Order number",
  paymentMethod: "Payment method",
  paymentStatus: "Payment status",
  orderStatus: "Order status",
  subtotal: "Subtotal",
  vat: "VAT",
  deliveryFee: "Delivery fee",
  discount: "Discount",
  total: "Total",
  amountCollected: "Collected",
  unitPrice: "Unit price",
  currentStock: "Stock",
  reorderLevel: "Reorder level",
  availableSerials: "Available QR units",
  assignedUnits: "Assigned",
  soldUnits: "Sold",
  serviceUnits: "In service",
  retiredUnits: "Retired",
  trackedUnits: "Tracked units",
  inventoryVariance: "Stock / QR variance",
  stockValue: "Stock value",
  stockStatus: "Stock status",
  merchandiseSales: "Merchandise sales",
};

const toIsoDate = (date) => date.toISOString().split("T")[0];
const defaultRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toIsoDate(from), to: toIsoDate(to) };
};
const humanize = (value) => COLUMN_LABELS[value] || SUMMARY_LABELS[value] || String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
const displayValue = (value, key) => {
  if (key === "transactionDate" && value) return new Date(value).toLocaleString("en-PH");
  return formatReportValue(value, key);
};
const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const reportTableHtml = (rows, { title = "Report details" } = {}) => {
  if (!rows.length) return '<div class="meta">No matching records.</div>';
  const headers = Object.keys(rows[0]);
  return `<h2 class="table-title">${escapeHtml(title)}</h2><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(humanize(header))}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(displayValue(row[header], header))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
};

function ReportTable({ title, rows, inventory = false }) {
  if (!rows.length) return null;
  const headers = Object.keys(rows[0]);
  return <section className="company-report-table-section">
    <h3>{title}</h3>
    <div className="company-report-table-wrap">
      <table className="company-report-table">
        <thead><tr>{headers.map((header) => <th key={header}>{humanize(header)}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${row.orderCode || row.sku || index}-${row.branch || ""}`}>
          {headers.map((header) => <td key={header} className={inventory && header === "currentStock" ? `stock-cell stock-cell--${row.stockStatus === "Out of stock" ? "out" : row.stockStatus === "Low stock" ? "low" : "ok"}` : ""}>{displayValue(row[header], header)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function AdminReports() {
  const { user } = useUser();
  const isSuperAdmin = user?.role === "superadmin";
  const Layout = isSuperAdmin ? SuperAdminLayout : AdminLayout;
  const assignedBranch = user?.activeBranch || user?.assignedBranch || getSessionActiveBranch() || "";
  const [activeTab, setActiveTab] = useState("sales");
  const [range, setRange] = useState(defaultRange);
  const [branch, setBranch] = useState(isSuperAdmin ? "all" : assignedBranch);
  const [salesStatus, setSalesStatus] = useState("paid");
  const [stockStatus, setStockStatus] = useState("all");
  const [inventorySearch, setInventorySearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ summary: null, rows: [], secondaryRows: [], basis: "", updatedAt: "" });

  const setTab = (tab) => {
    setActiveTab(tab);
    setError("");
    setData({ summary: null, rows: [], secondaryRows: [], basis: "", updatedAt: "" });
  };
  const rangeError = range.from && range.to && range.from > range.to ? "The report start date must be on or before the end date." : "";
  const canExport = data.rows.length > 0;
  const title = useMemo(() => {
    const label = TABS.find((tab) => tab.id === activeTab)?.label || "Report";
    return activeTab === "inventory" ? `${label} · ${branch === "all" ? "All Branches" : branch}` : `${label} · ${range.from} to ${range.to}`;
  }, [activeTab, branch, range]);

  const generate = async () => {
    if (rangeError && activeTab !== "inventory") return setError(rangeError);
    setBusy(true);
    setError("");
    try {
      if (activeTab === "sales") {
        const query = new URLSearchParams({ interval: "daily", from: range.from, to: range.to, status: salesStatus, topN: "50", branch });
        const result = await apiRequest(`/reports/sales?${query}`);
        setData({ summary: result.summary || {}, rows: result.transactions || [], secondaryRows: result.products || [], basis: result.basis || "", updatedAt: result.updatedAt || "" });
      } else if (activeTab === "inventory") {
        const query = new URLSearchParams({ branch, stock: stockStatus, search: inventorySearch.trim() });
        const result = await apiRequest(`/reports/inventory?${query}`);
        setData({ summary: result.summary || {}, rows: result.rows || [], secondaryRows: [], basis: result.basis || "", updatedAt: result.updatedAt || "" });
      } else {
        const dashboard = await apiRequest("/dashboard/me");
        const rows = (dashboard?.analytics?.technicianKPIs || []).map((item) => ({
          technician: item.name || "Technician", branch: item.branch || dashboard?.stats?.branchLabel || "",
          completedToday: Number(item.completedToday || 0), completedWeek: Number(item.completedWeek || 0), completedMonth: Number(item.completedMonth || 0),
        }));
        setData({
          summary: { technicianCount: rows.length, completedToday: rows.reduce((sum, row) => sum + row.completedToday, 0), completedThisWeek: rows.reduce((sum, row) => sum + row.completedWeek, 0), completedThisMonth: rows.reduce((sum, row) => sum + row.completedMonth, 0) },
          rows, secondaryRows: [], basis: "Completed technician work recorded by the operational dashboard.", updatedAt: new Date().toISOString(),
        });
      }
    } catch (requestError) {
      setError(requestError?.message || "Failed to generate report.");
      setData({ summary: null, rows: [], secondaryRows: [], basis: "", updatedAt: "" });
    } finally { setBusy(false); }
  };

  const metadata = () => ({
    ...COMPANY,
    logoUrl: "/Cold%20Air%20Logo.jpg",
    branch: isSuperAdmin && branch === "all" ? "Head Office · All Branches" : branch || assignedBranch || "Unassigned Branch",
    representative: user?.name || user?.email || "AEROPULSE Representative",
    representativeRole: isSuperAdmin ? "Super Admin · Authorized Representative" : "Branch Admin · Authorized Representative",
    reportingPeriod: activeTab === "inventory" ? `Inventory as of ${new Date(data.updatedAt || Date.now()).toLocaleString("en-PH")}` : `${range.from} to ${range.to}`,
    reportId: `APR-${activeTab.toUpperCase()}-${(activeTab === "inventory" ? toIsoDate(new Date()) : range.from).replaceAll("-", "")}-${activeTab === "inventory" ? String(branch || "ALL").toUpperCase() : range.to.replaceAll("-", "")}`,
    generatedAt: new Date().toLocaleString("en-PH"),
  });

  const exportExcel = () => exportToExcel({ filename: `cold-air-${activeTab}-${toIsoDate(new Date())}.xls`, title, summary: data.summary, rows: data.rows, metadata: metadata() });
  const exportPdf = () => {
    const reportMetadata = metadata();
    const summaryHtml = `<div class="summary">${Object.entries(data.summary || {}).map(([key, value]) => `<div class="summary-item"><strong>${escapeHtml(formatReportValue(value, key))}</strong><span>${escapeHtml(humanize(key))}</span></div>`).join("")}</div>`;
    const primaryTitle = activeTab === "sales" ? "Transaction register" : activeTab === "inventory" ? "Branch stock register" : "Technician performance";
    const secondary = data.secondaryRows.length ? reportTableHtml(data.secondaryRows, { title: "Product sales summary" }) : "";
    exportHtmlToPdfViaPrint({ title, subtitle: `${data.basis} · Branch: ${reportMetadata.branch}`, html: `${summaryHtml}${reportTableHtml(data.rows, { title: primaryTitle })}${secondary}`, fileName: `${reportMetadata.reportId}.pdf`, metadata: { ...reportMetadata, reportType: TABS.find((tab) => tab.id === activeTab)?.label, watermark: "COLD AIR" } });
  };

  return <Layout title="Reports" subtitle="Company-formatted sales, stock, and technician records">
    <section className="company-report-shell">
      <header className="company-report-brand">
        <img src="/Cold%20Air%20Logo.jpg" alt="Cold Air logo" />
        <div><p>Company operational report</p><h2>{COMPANY.name}</h2><span>{COMPANY.address}</span><span>{COMPANY.proprietor} · {COMPANY.contact} · {COMPANY.taxRegistration}</span></div>
      </header>

      <nav className="company-report-tabs" aria-label="Report type">{TABS.map((tab) => <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setTab(tab.id)}>{tab.label}</button>)}</nav>

      <div className="company-report-controls">
        {activeTab !== "inventory" ? <><label>From<input type="date" value={range.from} onChange={(event) => setRange((previous) => ({ ...previous, from: event.target.value }))} /></label><label>To<input type="date" value={range.to} onChange={(event) => setRange((previous) => ({ ...previous, to: event.target.value }))} /></label></> : null}
        {isSuperAdmin && activeTab !== "tech" ? <label>Branch<select value={branch} onChange={(event) => setBranch(event.target.value)}><option value="all">All branches</option>{BRANCHES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : null}
        {activeTab === "sales" ? <label>Transaction status<select value={salesStatus} onChange={(event) => setSalesStatus(event.target.value)}>{SALES_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
        {activeTab === "inventory" ? <><label>Stock status<select value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}>{INVENTORY_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="company-report-search">Search<input type="search" value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Product, SKU, brand, model…" /></label></> : null}
        <button className="company-report-generate" type="button" onClick={generate} disabled={busy || Boolean(rangeError && activeTab !== "inventory")}>{busy ? "Generating…" : "Generate report"}</button>
        <button type="button" onClick={exportExcel} disabled={!canExport}>Export Excel</button>
        <button type="button" onClick={exportPdf} disabled={!canExport}>Export PDF</button>
      </div>
      {rangeError && activeTab !== "inventory" ? <p className="company-report-error" role="alert">{rangeError}</p> : null}
      {error ? <p className="company-report-error" role="alert">{error}</p> : null}

      {data.summary ? <article className="company-report-document">
        <div className="company-report-document-heading"><div><p>{activeTab === "inventory" ? "Stock position" : "Reporting period"}</p><h2>{title}</h2></div><div><strong>{branch === "all" ? "All Branches" : branch || assignedBranch}</strong><span>Generated {new Date(data.updatedAt || Date.now()).toLocaleString("en-PH")}</span></div></div>
        <div className="company-report-summary">{Object.entries(data.summary).map(([key, value]) => <div key={key}><span>{humanize(key)}</span><strong>{formatReportValue(value, key)}</strong></div>)}</div>
        {data.basis ? <p className="company-report-basis"><strong>Report basis:</strong> {data.basis}</p> : null}
        <ReportTable title={activeTab === "sales" ? "Transaction register" : activeTab === "inventory" ? "Branch stock register" : "Technician performance"} rows={data.rows} inventory={activeTab === "inventory"} />
        {data.secondaryRows.length ? <ReportTable title="Product sales summary" rows={data.secondaryRows} /> : null}
        {!data.rows.length ? <div className="company-report-empty">No records match the selected filters.</div> : null}
      </article> : <div className="company-report-empty">Choose the report filters, then select Generate report.</div>}
    </section>
  </Layout>;
}

export default AdminReports;
