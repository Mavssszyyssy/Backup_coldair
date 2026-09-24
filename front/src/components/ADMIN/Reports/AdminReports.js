import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../config/api";
import { COMPANY_PROFILE } from "../../../config/company";
import { useUser } from "../../../context/UserContext";
import { BRANCHES } from "../../../domain/branches/branches";
import { exportHtmlToPdfViaPrint, exportToExcel, formatReportValue } from "../../../utils/exporters";
import { getSessionActiveBranch } from "../../../utils/authSession";
import AdminLayout from "../Common/AdminLayout";
import SuperAdminLayout from "../../SUPERADMIN/Common/SuperAdminLayout";
import "./AdminReports.css";

const COMPANY = COMPANY_PROFILE;

const TABS = [
  { id: "intelligence", label: "Business Intelligence" },
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

const SALES_PAYMENT_OPTIONS = [
  ["all", "All payment methods"],
  ["gcash", "GCash"],
  ["card", "Credit / debit card"],
  ["cod", "Cash on Delivery"],
];

const INVENTORY_STATUS_OPTIONS = [
  ["all", "All stock states"],
  ["available", "In stock"],
  ["low", "Low stock"],
  ["out", "Out of stock"],
];
const INVENTORY_CATEGORY_OPTIONS = [
  ["all", "All categories"],
  ["split", "Split Type"],
  ["window", "Window Type"],
  ["floor", "Floor Type"],
];
const REPORT_PAGE_SIZE = 10;
const BUSINESS_INTELLIGENCE_PAGES = ["Sales intelligence", "Service intelligence", "Inventory intelligence", "AMP intelligence"];

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
  technicianCount: "Technicians",
  completedInPeriod: "Completed in period",
  completedToday: "Completed today",
  completedThisWeek: "Completed this week",
  completedThisMonth: "Completed this month",
};

const COLUMN_LABELS = {
  transactionDate: "Transaction date",
  orderCode: "Order number",
  sku: "SKU",
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
  availableSerials: "Available QR units",
  soldUnits: "Sold",
  stockValue: "Stock value",
  stockStatus: "Stock status",
  merchandiseSales: "Merchandise sales",
  completedWorkOrders: "Completed work orders",
};

const OMITTED_INVENTORY_FIELDS = new Set([
  "assignedUnits", "serviceUnits", "retiredUnits", "trackedUnits", "inventoryVariance", "reorderLevel",
]);
const inventoryReportRows = (rows = []) => rows.map((row) => Object.fromEntries(
  Object.entries(row || {}).filter(([key]) => !OMITTED_INVENTORY_FIELDS.has(key)),
));
const inventoryReportSummary = (summary = {}) => Object.fromEntries(
  Object.entries(summary || {}).filter(([key]) => key !== "inventoryVarianceItems"),
);

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

const inventoryReportHtml = (rows, summaryHtml) => {
  const pageCount = Math.max(1, Math.ceil(rows.length / REPORT_PAGE_SIZE));
  return Array.from({ length: pageCount }, (_, index) => {
    const pageRows = rows.slice(index * REPORT_PAGE_SIZE, (index + 1) * REPORT_PAGE_SIZE);
    return `<section class="report-page">${index === 0 ? summaryHtml : ""}<div class="report-page-heading"><strong>Branch stock register</strong><span>Page ${index + 1} of ${pageCount}</span></div>${reportTableHtml(pageRows, { title: `Inventory records · Page ${index + 1}` })}</section>`;
  }).join("");
};

const paginatedReportHtml = (rows, { summaryHtml = "", title = "Report details", secondaryHtml = "" } = {}) => {
  const pageCount = Math.max(1, Math.ceil(rows.length / REPORT_PAGE_SIZE));
  return Array.from({ length: pageCount }, (_, index) => {
    const pageRows = rows.slice(index * REPORT_PAGE_SIZE, (index + 1) * REPORT_PAGE_SIZE);
    return `<section class="report-page">${index === 0 ? summaryHtml : ""}<div class="report-page-heading"><strong>${escapeHtml(title)}</strong><span>Page ${index + 1} of ${pageCount}</span></div>${reportTableHtml(pageRows, { title: `${title} · Page ${index + 1}` })}${index === pageCount - 1 ? secondaryHtml : ""}</section>`;
  }).join("");
};

const businessIntelligenceRows = (intelligence = {}) => {
  const summary = businessIntelligenceSummary(intelligence.summary || {});
  const rows = [
    { section: "Sales summary", record: "Amount collected", detail: "Verified paid transactions", value: summary.amountCollected },
    { section: "Sales summary", record: "Units sold", detail: "Recorded units in selected period", value: summary.unitsSold },
    { section: "Service summary", record: "Completed services", detail: "Completed service records", value: summary.completedServices },
    { section: "Inventory summary", record: "Current stock units", detail: "Current recorded branch stock", value: summary.currentStockUnits },
    { section: "AMP summary", record: "Due within 30 days", detail: "Saved unit-level schedules", value: summary.dueWithin30Days },
    { section: "AMP summary", record: "Overdue units", detail: "Saved unit-level schedules", value: summary.overdueUnits },
    { section: "AMP summary", record: "Condition follow-ups", detail: "Technician-log-driven follow-ups", value: summary.conditionFollowUps },
  ];
  Object.entries(intelligence.insights || {}).forEach(([category, items]) => (items || []).forEach((item) => rows.push({
    section: `${category === "amp" ? "AMP" : humanize(category)} insight`,
    record: item.statement || "Recorded insight",
    detail: item.action || "No manager action recorded",
    value: "—",
  })));
  const addRows = (section, items, mapper) => (items || []).forEach((item) => rows.push({ section, ...mapper(item) }));
  addRows("Sales trend", intelligence.charts?.salesTrend, (item) => ({ record: String(item.bucket || "").slice(0, 10), detail: `${item.unitsSold || 0} unit(s)`, value: item.amountCollected || 0 }));
  addRows("Service trend", intelligence.charts?.serviceTrend, (item) => ({ record: String(item.bucket || "").slice(0, 10), detail: "Completed services", value: item.count || 0 }));
  addRows("Best-selling model", intelligence.tables?.topModels, (item) => ({ record: [item.brand, item.model].filter(Boolean).join(" ") || item.sku, detail: item.sku || "SKU not recorded", value: item.unitsSold || 0 }));
  addRows("Best-selling brand", intelligence.tables?.topBrands, (item) => ({ record: item.brand || "Unspecified", detail: "Units sold", value: item.unitsSold || 0 }));
  addRows("Serviced model", intelligence.tables?.servicedModels, (item) => ({ record: item.model || "Unspecified", detail: "Completed services", value: item.count || 0 }));
  addRows("Service concern", intelligence.tables?.commonIssues, (item) => ({ record: item.issue || "Unspecified", detail: "Completed records", value: item.count || 0 }));
  addRows("Service part", intelligence.tables?.serviceParts, (item) => ({ record: item.part || "Unspecified", detail: "Recorded uses", value: item.count || 0 }));
  addRows("Inventory movement", intelligence.tables?.inventoryMovement, (item) => ({ record: item.product || item.sku, detail: `${item.branch || "Unassigned"} · ${item.sku || "No SKU"} · Stock: ${item.currentStock || 0}`, value: item.unitsSoldInPeriod || 0 }));
  addRows("Slow-moving inventory", intelligence.tables?.slowMovingInventory, (item) => ({ record: item.product || item.sku, detail: `${item.branch || "Unassigned"} · ${item.sku || "No SKU"}`, value: item.currentStock || 0 }));
  return rows;
};

const businessIntelligenceSummary = (summary = {}) => ({
  amountCollected: summary.sales?.amountCollected || 0,
  unitsSold: summary.sales?.unitsSold || 0,
  completedServices: summary.service?.completedServices || 0,
  currentStockUnits: summary.inventory?.currentStockUnits || 0,
  dueWithin30Days: summary.amp?.dueWithin30Days || 0,
  overdueUnits: summary.amp?.overdue || 0,
  conditionFollowUps: summary.amp?.conditionFollowUps || 0,
});

const businessIntelligenceReportHtml = (intelligence = {}, summaryHtml = "") => BUSINESS_INTELLIGENCE_PAGES.map((label, index) => {
  const category = ["sales", "service", "inventory", "amp"][index];
  const categoryRows = businessIntelligenceRows(intelligence).filter((row) => row.section.toLowerCase().startsWith(category) || (category === "sales" && row.section.includes("selling")) || (category === "inventory" && row.section.toLowerCase().includes("inventory")) || (category === "service" && ["Serviced", "Service"].some((word) => row.section.startsWith(word))));
  return `<section class="report-page">${index === 0 ? summaryHtml : ""}<div class="report-page-heading"><strong>${escapeHtml(label)}</strong><span>Page ${index + 1} of ${BUSINESS_INTELLIGENCE_PAGES.length}</span></div>${reportTableHtml(categoryRows, { title: label })}</section>`;
}).join("");

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

function IntelligenceTrend({ title, rows = [], valueKey, valueLabel, money = false }) {
  if (!rows.length) return null;
  const maximum = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  return <section className="company-bi-trend" aria-label={title}>
    <h3>{title}</h3>
    <div className="company-bi-trend-list">
      {rows.map((row) => {
        const value = Number(row[valueKey] || 0);
        const display = money ? formatReportValue(value, "amountCollected") : value;
        return <article key={`${row.bucket}-${value}`}>
          <div><span>{String(row.bucket || "").slice(0, 10)}</span><strong>{display} {valueLabel}</strong></div>
          <span className="company-bi-trend-track" aria-hidden="true"><span style={{ width: `${Math.max(value > 0 ? 4 : 0, (value / maximum) * 100)}%` }} /></span>
        </article>;
      })}
    </div>
  </section>;
}

function BusinessIntelligenceView({ data, page = 1 }) {
  const intelligence = data.intelligence || {};
  const summary = intelligence.summary || {};
  const insights = intelligence.insights || {};
  const tables = intelligence.tables || {};
  const charts = intelligence.charts || {};
  const metrics = [
    ["Sales collected", formatReportValue(summary.sales?.amountCollected || 0, "amountCollected")],
    ["Units sold", summary.sales?.unitsSold || 0],
    ["Completed services", summary.service?.completedServices || 0],
    ["Current stock units", summary.inventory?.currentStockUnits || 0],
    ["AMP due / overdue", `${summary.amp?.dueWithin30Days || 0} / ${summary.amp?.overdue || 0}`],
    ["Condition follow-ups", summary.amp?.conditionFollowUps || 0],
  ];
  const category = ["sales", "service", "inventory", "amp"][page - 1] || "sales";
  return <>
    {page === 1 ? <div className="company-bi-metrics">{metrics.map(([metric, value]) => <article key={metric}><span>{metric}</span><strong>{value}</strong></article>)}</div> : null}
    {data.warning ? <p className="company-report-basis" role="status"><strong>Analysis status:</strong> {data.warning}</p> : null}
    <div className="company-bi-page-heading"><span>Business intelligence page {page} of {BUSINESS_INTELLIGENCE_PAGES.length}</span><h3>{BUSINESS_INTELLIGENCE_PAGES[page - 1]}</h3></div>
    <div className="company-bi-insights"><section>
      <h3>{category === "amp" ? "AMP / Predictive Maintenance" : `${humanize(category)} Performance`}</h3>
      {(insights[category] || []).map((item) => <article key={item.id}><p>{item.statement}</p>{item.action ? <p><strong>Manager action:</strong> {item.action}</p> : null}</article>)}
    </section></div>
    {category === "sales" ? <>
      <div className="company-bi-trends"><IntelligenceTrend title="Collected sales trend" rows={charts.salesTrend || []} valueKey="amountCollected" valueLabel="collected" money /></div>
      <ReportTable title="Best-selling AC models" rows={(tables.topModels || []).map(({ brand, model, sku, unitsSold, sales }) => ({ brand, model, sku, unitsSold, sales }))} />
      <ReportTable title="Best-selling brands" rows={(tables.topBrands || []).map(({ brand, unitsSold }) => ({ brand, unitsSold }))} />
    </> : null}
    {category === "service" ? <>
      <div className="company-bi-trends"><IntelligenceTrend title="Completed service trend" rows={charts.serviceTrend || []} valueKey="count" valueLabel="services" /></div>
      <ReportTable title="Recorded service mix" rows={(charts.serviceByType || []).map(({ label, count }) => ({ serviceType: label, completedServices: count }))} />
      <ReportTable title="Most frequently serviced AC models" rows={(tables.servicedModels || []).map(({ model, count }) => ({ model, completedServices: count }))} />
      <ReportTable title="Common recorded service concerns" rows={(tables.commonIssues || []).map(({ issue, count }) => ({ issue, completedRecords: count }))} />
      <ReportTable title="Frequently recorded service parts" rows={(tables.serviceParts || []).map(({ part, count }) => ({ part, recordedUses: count }))} />
    </> : null}
    {category === "inventory" ? <>
      <ReportTable title="Inventory movement and current stock" rows={(tables.inventoryMovement || []).map(({ branch, product, sku, unitsSoldInPeriod, currentStock, stockStatus }) => ({ branch, product, sku, unitsSoldInPeriod, currentStock, stockStatus }))} inventory />
      <ReportTable title="Stocked lines with no paid sales in this period" rows={(tables.slowMovingInventory || []).map(({ branch, product, sku, currentStock, stockStatus }) => ({ branch, product, sku, currentStock, stockStatus }))} inventory />
    </> : null}
    {category === "amp" ? <p className="company-report-basis">Unit-level AMP recommendations remain available in AMP Planning, where managers can review the supporting service history and action for each AC unit.</p> : null}
  </>;
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
  const [salesPaymentMethod, setSalesPaymentMethod] = useState("all");
  const [salesSearch, setSalesSearch] = useState("");
  const [salesSku, setSalesSku] = useState("");
  const [salesCustomer, setSalesCustomer] = useState("");
  const [stockStatus, setStockStatus] = useState("all");
  const [inventoryCategory, setInventoryCategory] = useState("all");
  const [inventoryBrand, setInventoryBrand] = useState("");
  const [inventorySku, setInventorySku] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [filterOptions, setFilterOptions] = useState({ customers: [], technicians: [], skus: [], brands: [] });
  const [reportPage, setReportPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ summary: null, rows: [], secondaryRows: [], basis: "", updatedAt: "", intelligence: null, warning: "" });

  useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return undefined;
    let active = true;
    const query = new URLSearchParams({ from: range.from, to: range.to, branch: branch || assignedBranch });
    apiRequest(`/reports/filter-options?${query}`)
      .then((result) => {
        if (!active) return;
        const options = {
          customers: Array.isArray(result.customers) ? result.customers : [],
          technicians: Array.isArray(result.technicians) ? result.technicians : [],
          skus: Array.isArray(result.skus) ? result.skus : [],
          brands: Array.isArray(result.brands) ? result.brands : [],
        };
        setFilterOptions(options);
        setSalesCustomer((value) => !value || options.customers.includes(value) ? value : "");
        setSalesSku((value) => !value || options.skus.includes(value) ? value : "");
        setInventorySku((value) => !value || options.skus.includes(value) ? value : "");
        setInventoryBrand((value) => !value || options.brands.includes(value) ? value : "");
        setTechnicianId((value) => !value || options.technicians.some((item) => item.value === value) ? value : "");
      })
      .catch(() => { if (active) setFilterOptions({ customers: [], technicians: [], skus: [], brands: [] }); });
    return () => { active = false; };
  }, [assignedBranch, branch, range.from, range.to]);

  const skuOptions = filterOptions.skus;
  const brandOptions = filterOptions.brands;

  const setTab = (tab) => {
    setActiveTab(tab);
    setReportPage(1);
    setError("");
    setData({ summary: null, rows: [], secondaryRows: [], basis: "", updatedAt: "", intelligence: null, warning: "" });
  };
  const rangeError = range.from && range.to && range.from > range.to ? "The report start date must be on or before the end date." : "";
  const canExport = data.rows.length > 0;
  const isPaginatedReport = ["sales", "inventory", "intelligence"].includes(activeTab);
  const reportTotalPages = activeTab === "intelligence"
    ? BUSINESS_INTELLIGENCE_PAGES.length
    : Math.max(1, Math.ceil(data.rows.length / REPORT_PAGE_SIZE));
  const currentReportPage = Math.min(reportPage, reportTotalPages);
  const firstReportRowIndex = (currentReportPage - 1) * REPORT_PAGE_SIZE;
  const displayedRows = ["sales", "inventory"].includes(activeTab)
    ? data.rows.slice(firstReportRowIndex, firstReportRowIndex + REPORT_PAGE_SIZE)
    : data.rows;
  const firstReportPageNumber = Math.max(1, Math.min(currentReportPage - 2, reportTotalPages - 4));
  const reportPageNumbers = Array.from({ length: Math.min(5, reportTotalPages) }, (_, index) => firstReportPageNumber + index);
  const title = useMemo(() => {
    const label = TABS.find((tab) => tab.id === activeTab)?.label || "Report";
    return activeTab === "inventory" ? `${label} · ${branch === "all" ? "All Branches" : branch}` : `${label} · ${range.from} to ${range.to}`;
  }, [activeTab, branch, range]);

  const generate = async () => {
    if (rangeError && activeTab !== "inventory") return setError(rangeError);
    setBusy(true);
    setError("");
    setReportPage(1);
    try {
      if (activeTab === "intelligence") {
        const query = new URLSearchParams({ from: range.from, to: range.to, branch });
        const result = await apiRequest(`/reports/business-intelligence?${query}`);
        setData({ summary: result.summary || {}, rows: businessIntelligenceRows(result), secondaryRows: [], basis: result.basis || "", updatedAt: result.updatedAt || "", intelligence: result, warning: result.warning || "" });
      } else if (activeTab === "sales") {
        const query = new URLSearchParams({
          interval: "daily", from: range.from, to: range.to, status: salesStatus,
          paymentMethod: salesPaymentMethod, search: salesSearch.trim(), sku: salesSku.trim(), customer: salesCustomer.trim(), topN: "10", branch,
        });
        const result = await apiRequest(`/reports/sales?${query}`);
        setData({ summary: result.summary || {}, rows: result.transactions || [], secondaryRows: result.products || [], basis: result.basis || "", updatedAt: result.updatedAt || "" });
      } else if (activeTab === "inventory") {
        const query = new URLSearchParams({
          branch, stock: stockStatus, category: inventoryCategory,
          search: inventorySearch.trim(), brand: inventoryBrand.trim(), sku: inventorySku.trim(),
        });
        const result = await apiRequest(`/reports/inventory?${query}`);
        setData({ summary: inventoryReportSummary(result.summary), rows: inventoryReportRows(result.rows), secondaryRows: [], basis: result.basis || "", updatedAt: result.updatedAt || "" });
      } else {
        const query = new URLSearchParams({ from: range.from, to: range.to, branch, search: technicianSearch.trim(), technician: technicianId });
        const result = await apiRequest(`/reports/technicians?${query}`);
        setData({ summary: result.summary || {}, rows: result.rows || [], secondaryRows: [], basis: result.basis || "", updatedAt: result.updatedAt || "" });
      }
    } catch (requestError) {
      setError(requestError?.message || "Failed to generate report.");
      setData({ summary: null, rows: [], secondaryRows: [], basis: "", updatedAt: "", intelligence: null, warning: "" });
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
    filters: activeTab === "sales"
      ? `Search: ${salesSearch.trim() || "None"}; Status: ${SALES_STATUS_OPTIONS.find(([value]) => value === salesStatus)?.[1] || salesStatus}; Payment: ${SALES_PAYMENT_OPTIONS.find(([value]) => value === salesPaymentMethod)?.[1] || salesPaymentMethod}; SKU: ${salesSku.trim() || "All"}; Customer: ${salesCustomer.trim() || "All"}`
      : activeTab === "inventory"
        ? `Search: ${inventorySearch.trim() || "None"}; Stock: ${INVENTORY_STATUS_OPTIONS.find(([value]) => value === stockStatus)?.[1] || stockStatus}; Category: ${INVENTORY_CATEGORY_OPTIONS.find(([value]) => value === inventoryCategory)?.[1] || inventoryCategory}; Brand: ${inventoryBrand.trim() || "All"}; SKU: ${inventorySku.trim() || "All"}`
        : activeTab === "intelligence" ? "Verified sales, service, inventory, and AMP records" : `Search: ${technicianSearch.trim() || "None"}; Technician: ${filterOptions.technicians.find((item) => item.value === technicianId)?.label || "All"}`,
  });

  const exportExcel = () => exportToExcel({ filename: `cold-air-${activeTab}-${toIsoDate(new Date())}.xls`, title, summary: activeTab === "intelligence" ? businessIntelligenceSummary(data.summary) : data.summary, rows: data.rows, metadata: metadata() });
  const exportPdf = () => {
    const reportMetadata = metadata();
    const exportSummary = activeTab === "intelligence" ? businessIntelligenceSummary(data.summary) : data.summary;
    const summaryHtml = `<div class="summary">${Object.entries(exportSummary || {}).map(([key, value]) => `<div class="summary-item"><strong>${escapeHtml(formatReportValue(value, key))}</strong><span>${escapeHtml(humanize(key))}</span></div>`).join("")}</div>`;
    const primaryTitle = activeTab === "sales" ? "Transaction register" : activeTab === "inventory" ? "Branch stock register" : "Technician performance";
    const secondary = data.secondaryRows.length ? reportTableHtml(data.secondaryRows, { title: "Product sales summary" }) : "";
    const reportHtml = activeTab === "inventory"
      ? inventoryReportHtml(data.rows, summaryHtml)
      : activeTab === "sales"
        ? paginatedReportHtml(data.rows, { summaryHtml, title: primaryTitle, secondaryHtml: secondary })
        : activeTab === "intelligence"
          ? businessIntelligenceReportHtml(data.intelligence, summaryHtml)
          : `${summaryHtml}${reportTableHtml(data.rows, { title: primaryTitle })}${secondary}`;
    exportHtmlToPdfViaPrint({ title, subtitle: `${data.basis} · Branch: ${reportMetadata.branch} · Filters: ${reportMetadata.filters}`, html: reportHtml, fileName: `${reportMetadata.reportId}.pdf`, metadata: { ...reportMetadata, reportType: TABS.find((tab) => tab.id === activeTab)?.label, watermark: "COLD AIR" } });
  };

  return <Layout title="Analytics & Reports" subtitle="AI-prioritized business intelligence and company-formatted operational records">
    <section className="company-report-shell">
      <header className="company-report-brand">
        <img src="/Cold%20Air%20Logo.jpg" alt="Cold Air logo" />
        <div><p>Company operational report</p><h2>{COMPANY.name}</h2><span>{COMPANY.address}</span><span>{COMPANY.proprietor} · {COMPANY.contact} · {COMPANY.taxRegistration}</span></div>
      </header>

      <nav className="company-report-tabs" aria-label="Report type">{TABS.map((tab) => <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setTab(tab.id)}>{tab.label}</button>)}</nav>

      <div className="company-report-controls">
        <div className="company-report-period-row">
          {activeTab !== "inventory" ? <><label>From<input type="date" value={range.from} onChange={(event) => setRange((previous) => ({ ...previous, from: event.target.value }))} /></label><label>To<input type="date" value={range.to} onChange={(event) => setRange((previous) => ({ ...previous, to: event.target.value }))} /></label></> : null}
          <label>Branch<select value={branch || assignedBranch} disabled={!isSuperAdmin} onChange={(event) => setBranch(event.target.value)}>{isSuperAdmin ? <option value="all">All branches</option> : null}{(isSuperAdmin ? BRANCHES : [assignedBranch]).filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        {activeTab === "sales" ? <section className="company-report-filter-panel" aria-labelledby="sales-filter-heading">
          <div className="company-report-filter-heading"><strong id="sales-filter-heading">Sales filters</strong><span>Use one search or narrow the report with the dropdowns.</span></div>
          <div className="company-report-filter-grid">
            <label className="company-report-filter-search">Search<input type="search" value={salesSearch} onChange={(event) => setSalesSearch(event.target.value)} placeholder="Order number, product, SKU, or customer" /></label>
            <label>SKU<select value={salesSku} onChange={(event) => setSalesSku(event.target.value)}><option value="">All SKUs</option>{skuOptions.map((sku) => <option key={sku} value={sku}>{sku}</option>)}</select></label>
            <label>Customer<select value={salesCustomer} onChange={(event) => setSalesCustomer(event.target.value)}><option value="">All customers</option>{filterOptions.customers.map((customer) => <option key={customer} value={customer}>{customer}</option>)}</select></label>
            <label>Payment method<select value={salesPaymentMethod} onChange={(event) => setSalesPaymentMethod(event.target.value)}>{SALES_PAYMENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Transaction status<select value={salesStatus} onChange={(event) => setSalesStatus(event.target.value)}>{SALES_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
        </section> : null}
        {activeTab === "inventory" ? <section className="company-report-filter-panel" aria-labelledby="inventory-filter-heading">
          <div className="company-report-filter-heading"><strong id="inventory-filter-heading">Inventory filters</strong><span>Use one search or narrow the report with the dropdowns.</span></div>
          <div className="company-report-filter-grid">
            <label className="company-report-filter-search">Search<input type="search" value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Product, model, SKU, or branch" /></label>
            <label>SKU<select value={inventorySku} onChange={(event) => setInventorySku(event.target.value)}><option value="">All SKUs</option>{skuOptions.map((sku) => <option key={sku} value={sku}>{sku}</option>)}</select></label>
            <label>Brand<select value={inventoryBrand} onChange={(event) => setInventoryBrand(event.target.value)}><option value="">All brands</option>{brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></label>
            <label>Stock status<select value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}>{INVENTORY_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Category<select value={inventoryCategory} onChange={(event) => setInventoryCategory(event.target.value)}>{INVENTORY_CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
        </section> : null}
        {activeTab === "tech" ? <section className="company-report-filter-panel" aria-labelledby="technician-filter-heading">
          <div className="company-report-filter-heading"><strong id="technician-filter-heading">Technician filters</strong><span>Choose a technician or use one search for names and branches.</span></div>
          <div className="company-report-filter-grid company-report-filter-grid--compact">
            <label className="company-report-filter-search">Search<input type="search" value={technicianSearch} onChange={(event) => setTechnicianSearch(event.target.value)} placeholder="Technician name or branch" /></label>
            <label>Technician<select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}><option value="">All active technicians</option>{filterOptions.technicians.map((technician) => <option key={technician.value} value={technician.value}>{technician.label}{isSuperAdmin && technician.branch ? ` · ${technician.branch}` : ""}</option>)}</select></label>
          </div>
        </section> : null}
        <div className="company-report-actions">
          <button className="company-report-generate" type="button" onClick={generate} disabled={busy || Boolean(rangeError && activeTab !== "inventory")}>{busy ? "Generating…" : "Generate report"}</button>
          <button type="button" onClick={exportExcel} disabled={!canExport}>Export Excel</button><button type="button" onClick={exportPdf} disabled={!canExport}>Export PDF</button>
        </div>
      </div>
      {rangeError && activeTab !== "inventory" ? <p className="company-report-error" role="alert">{rangeError}</p> : null}
      {error ? <p className="company-report-error" role="alert">{error}</p> : null}

      {data.summary ? <article className="company-report-document">
        <div className="company-report-document-heading"><div><p>{activeTab === "inventory" ? "Stock position" : "Reporting period"}</p><h2>{title}</h2></div><div><strong>{branch === "all" ? "All Branches" : branch || assignedBranch}</strong><span>Generated {new Date(data.updatedAt || Date.now()).toLocaleString("en-PH")}</span></div></div>
        {activeTab !== "intelligence" ? <div className="company-report-summary">{Object.entries(data.summary).map(([key, value]) => <div key={key}><span>{humanize(key)}</span><strong>{formatReportValue(value, key)}</strong></div>)}</div> : null}
        {data.basis ? <p className="company-report-basis"><strong>Report basis:</strong> {data.basis}</p> : null}
        {activeTab === "intelligence" ? <BusinessIntelligenceView data={data} page={currentReportPage} /> : <ReportTable title={activeTab === "sales" ? "Transaction register" : activeTab === "inventory" ? "Branch stock register" : "Technician performance"} rows={displayedRows} inventory={activeTab === "inventory"} />}
        {isPaginatedReport && data.rows.length ? <nav className="company-report-pagination" aria-label={`${activeTab === "intelligence" ? "Business intelligence" : activeTab === "sales" ? "Sales report" : "Inventory report"} pagination`}>
          <span>{activeTab === "intelligence" ? BUSINESS_INTELLIGENCE_PAGES[currentReportPage - 1] : `Showing ${firstReportRowIndex + 1}–${Math.min(firstReportRowIndex + REPORT_PAGE_SIZE, data.rows.length)} of ${data.rows.length} records`}</span>
          <div>
            <button type="button" onClick={() => setReportPage((page) => Math.max(1, page - 1))} disabled={currentReportPage === 1}>Previous</button>
            {reportPageNumbers.map((pageNumber) => <button key={pageNumber} type="button" className={pageNumber === currentReportPage ? "is-current" : ""} aria-current={pageNumber === currentReportPage ? "page" : undefined} aria-label={`${activeTab === "intelligence" ? "Business intelligence" : activeTab === "sales" ? "Sales report" : "Inventory report"} page ${pageNumber}`} onClick={() => setReportPage(pageNumber)}>{pageNumber}</button>)}
            <button type="button" onClick={() => setReportPage((page) => Math.min(reportTotalPages, page + 1))} disabled={currentReportPage === reportTotalPages}>Next</button>
          </div>
        </nav> : null}
        {data.secondaryRows.length && activeTab === "sales" && currentReportPage === 1 ? <ReportTable title="Product sales summary" rows={data.secondaryRows} /> : null}
        {activeTab !== "intelligence" && !data.rows.length ? <div className="company-report-empty">No records match the selected filters.</div> : null}
      </article> : <div className="company-report-empty">Choose the report filters, then select Generate report.</div>}
    </section>
  </Layout>;
}

export default AdminReports;
