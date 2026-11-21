import SearchableSelect from "../../common/SearchableSelect";
import LoadingSkeleton from "../../common/LoadingSkeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../../../config/api";
import { COMPANY_PROFILE } from "../../../config/company";
import { useUser } from "../../../context/UserContext";
import useActiveBranches from "../../../domain/branches/useActiveBranches";
import { exportHtmlToPdfViaPrint, exportToExcel, formatReportValue, reportColumns } from "../../../utils/exporters";
import { getSessionActiveBranch } from "../../../utils/authSession";
import { formatBusinessDate, formatBusinessDateKey, formatBusinessDateTime } from "../../../utils/dateTime";
import { translateText } from "../../../utils/customerI18n";
import AdminLayout from "../Common/AdminLayout";
import SuperAdminLayout from "../../SUPERADMIN/Common/SuperAdminLayout";
import "./AdminReports.css";

const COMPANY = COMPANY_PROFILE;

const TABS = [
  { id: "sales", label: "Sales Report" },
  { id: "intelligence", label: "Business Intelligence" },
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
const BI_METRIC_LABELS = { amountCollected: "Sales collected", unitsSold: "Units sold", completedServices: "Completed services", currentStockUnits: "Current stock units", dueWithin30Days: "AMP due within 30 days", overdueUnits: "AMP overdue", conditionFollowUps: "Condition follow-ups" };
const SALES_KPIS = ["paidRevenue", "transactionCount", "unitsSold"];
const SALES_KPI_LABELS = { paidRevenue: "Total revenue collected", transactionCount: "Total orders", unitsSold: "Units ordered" };
const INTERPRETATION_DISCLAIMER = "For decision support only. AI does not replace human judgment.";
const SALES_FINANCIAL_FIELDS = new Set([
  "unitPrice", "subtotal", "vat", "deliveryFee", "discount", "total", "amountCollected",
]);

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
  bucket: "Period",
  statement: "Statement",
  managerAction: "Manager action",
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
  averageCompletionHours: "Average completion time (hours)",
  onTimeRate: "On-time rate",
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
  const from = new Date(to.getTime() - 30 * 86_400_000);
  return { from: formatBusinessDateKey(from), to: formatBusinessDateKey(to) };
};
const humanize = (value) => COLUMN_LABELS[value] || SUMMARY_LABELS[value] || String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
const displayValue = (value, key) => {
  if (key === "transactionDate" && value) return formatBusinessDateTime(value);
  if (key === "bucket" && value) return String(value).slice(0, 10);
  return formatReportValue(value, key);
};
const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const salesSummary = (summary, status) => {
  const { paidRevenue, transactionCount, unitsSold, ...breakdown } = summary;
  return {
    paidRevenue: paidRevenue ?? (status === "cancelled" ? 0 : breakdown.amountCollected ?? 0),
    transactionCount: transactionCount ?? 0,
    unitsSold: unitsSold ?? 0,
    ...breakdown,
  };
};

const reportInterpretation = (value, t) => ({
  title: t("AI interpretation"),
  lines: [
    ...(value?.status === "ready" && value.summary && value.reviewAction
      ? [value.summary, `${t("Suggested review")}: ${value.reviewAction}`]
      : [t(value?.status === "empty" ? "No matching records to interpret." : "AI interpretation is unavailable for this report.")]),
    t(INTERPRETATION_DISCLAIMER),
  ],
});

const reportTableHtml = (rows, { title = "Report details", className = "", emptyLabel = "No matching records.", t = (value) => value } = {}) => {
  const heading = `<h3 class="table-title">${escapeHtml(title)}</h3>`;
  if (!rows.length) return `${heading}<div class="meta">${escapeHtml(emptyLabel)}</div>`;
  const headers = reportColumns(rows);
  const tableClass = ["report-table", className].filter(Boolean).join(" ");
  return `${heading}<table class="${tableClass}"><thead><tr>${headers.map((header) => `<th>${escapeHtml(t(humanize(header)))}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td${typeof row[header] === "number" ? ' class="report-number"' : ""}>${escapeHtml(displayValue(row[header], header))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
};

const salesReportHtml = (rows, summaryHtml, secondaryRows = [], t = (value) => value) => {
  const operationalRows = rows.map((row) => Object.fromEntries(
      Object.entries(row || {}).filter(([key]) => key === "amountCollected" || !SALES_FINANCIAL_FIELDS.has(key)),
  ));
  const financialRows = rows.map((row) => Object.fromEntries(
      Object.entries(row || {}).filter(([key]) => key === "orderCode" || SALES_FINANCIAL_FIELDS.has(key)),
  ));
  return `${summaryHtml}<section class="report-section report-section--splittable report-page--sales">${reportTableHtml(operationalRows, { title: t("Sales list"), t, className: "report-table--operations", emptyLabel: t("No matching records.") })}${financialRows.length ? reportTableHtml(financialRows, { title: t("Transaction amounts"), className: "report-table--financial", t }) : ""}</section>${secondaryRows.length ? `<section class="report-section report-section--splittable">${reportTableHtml(secondaryRows, { title: t("Product sales summary"), className: "report-table--products", t })}</section>` : ""}`;
};

const inventoryReportHtml = (rows, summaryHtml, t) => {
  return `${summaryHtml}<section class="report-section report-section--splittable">${reportTableHtml(rows, { title: t("Branch stock register"), t, emptyLabel: t("No matching records.") })}</section>`;
};

// The preview and both exports share the same tables and typed fields.
const businessIntelligenceGroups = (intelligence = {}) => {
  const tables = intelligence.tables || {};
  const charts = intelligence.charts || {};
  return [
    { id: "sales", title: "Sales intelligence", performanceTitle: "Sales Performance", tables: [
      { title: "Collected sales trend", rows: (charts.salesTrend || []).map(({ bucket, amountCollected }) => ({ bucket, amountCollected })), chart: { valueKey: "amountCollected", valueLabel: "collected", money: true } },
      { title: "Best-selling AC models", rows: (tables.topModels || []).map(({ brand, model, sku, unitsSold, sales }) => ({ brand, model, sku, unitsSold, sales })) },
      { title: "Best-selling brands", rows: (tables.topBrands || []).map(({ brand, unitsSold }) => ({ brand, unitsSold })) },
    ] },
    { id: "service", title: "Service intelligence", performanceTitle: "Service Performance", tables: [
      { title: "Completed service trend", rows: (charts.serviceTrend || []).map(({ bucket, count }) => ({ bucket, count })), chart: { valueKey: "count", valueLabel: "services" } },
      { title: "Recorded service mix", rows: (charts.serviceByType || []).map(({ label, count }) => ({ serviceType: label, completedServices: count })) },
      { title: "Most frequently serviced AC models", rows: (tables.servicedModels || []).map(({ model, count }) => ({ model, completedServices: count })) },
      { title: "Common recorded service concerns", rows: (tables.commonIssues || []).map(({ issue, count }) => ({ issue, completedRecords: count })) },
      { title: "Frequently recorded service parts", rows: (tables.serviceParts || []).map(({ part, count }) => ({ part, recordedUses: count })) },
    ] },
    { id: "inventory", title: "Inventory intelligence", performanceTitle: "Inventory Performance", tables: [
      { title: "Inventory movement and current stock", rows: (tables.inventoryMovement || []).map(({ branch, product, sku, unitsSoldInPeriod, currentStock, stockStatus }) => ({ branch, product, sku, unitsSoldInPeriod, currentStock, stockStatus })), inventory: true },
      { title: "Stocked lines with no paid sales in this period", rows: (tables.slowMovingInventory || []).map(({ branch, product, sku, currentStock, stockStatus }) => ({ branch, product, sku, currentStock, stockStatus })), inventory: true },
    ] },
    { id: "amp", title: "AMP intelligence", performanceTitle: "AMP / Predictive Maintenance", tables: [], guidance: "Unit-level AMP recommendations remain available in AMP Planning, where managers can review the supporting service history and action for each AC unit." },
  ].map((group) => ({ ...group, insights: intelligence.insights?.[group.id] || [] }));
};

const businessIntelligenceRows = (intelligence) => [
  ...Object.entries(businessIntelligenceSummary(intelligence.summary || {})).map(([metric, value]) => ({ metric, value })),
  ...businessIntelligenceGroups(intelligence).flatMap((group) => [...group.insights, ...group.tables.flatMap((table) => table.rows)]),
];

const businessIntelligenceExcelTables = (intelligence, t) => businessIntelligenceGroups(intelligence).flatMap((group) => [
  { title: t(group.title), rows: group.insights.map(({ statement, action }) => ({ statement, managerAction: action || "" })) },
  ...group.tables.filter((table) => table.rows.length).map((table) => ({ title: t(table.title), rows: table.rows })),
  ...(group.guidance ? [{ title: t("AMP Planning"), rows: [{ note: t(group.guidance) }] }] : []),
]);

const businessIntelligenceSummary = (summary = {}) => ({
  amountCollected: summary.sales?.amountCollected || 0,
  unitsSold: summary.sales?.unitsSold || 0,
  completedServices: summary.service?.completedServices || 0,
  currentStockUnits: summary.inventory?.currentStockUnits || 0,
  dueWithin30Days: summary.amp?.dueWithin30Days || 0,
  overdueUnits: summary.amp?.overdue || 0,
  conditionFollowUps: summary.amp?.conditionFollowUps || 0,
});

const businessIntelligenceReportHtml = (intelligence, summaryHtml, t) => `<h2>${escapeHtml(t("Report summary"))}</h2>${summaryHtml}` + businessIntelligenceGroups(intelligence).map((group, index) =>
  `<section class="report-section report-section--splittable report-analysis-group"><div class="report-analysis-intro"><div class="report-group-heading"><span>${String(index + 1).padStart(2, "0")}</span><h2>${escapeHtml(t(group.title))}</h2></div>${group.insights.map((item) => `<div class="report-insight"><p>${escapeHtml(item.statement)}</p>${item.action ? `<p class="report-review-action"><strong>${escapeHtml(t("Manager action:"))}</strong> ${escapeHtml(item.action)}</p>` : ""}</div>`).join("")}</div>${group.tables.filter((table) => table.rows.length).map((table) => reportTableHtml(table.rows, { title: t(table.title), t })).join("")}${group.guidance ? `<p class="report-guidance">${escapeHtml(t(group.guidance))}</p>` : ""}</section>`
).join("");

function ReportTable({ title, rows, columns, inventory = false, t = (value) => value }) {
  if (!rows.length) return null;
  const headers = columns || reportColumns(rows);
  return <section className="company-report-table-section">
    <h3>{t(title)}</h3>
    <div className="company-report-table-wrap">
      <table className="company-report-table">
        <thead><tr>{headers.map((header) => <th key={header}>{t(humanize(header))}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${row.orderCode || row.sku || index}-${row.branch || ""}`}>
          {headers.map((header) => <td key={header} className={inventory && header === "currentStock" ? `stock-cell stock-cell--${row.stockStatus === "Out of stock" ? "out" : row.stockStatus === "Low stock" ? "low" : "ok"}` : ""}>{displayValue(row[header], header)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function IntelligenceTrend({ title, rows = [], valueKey, valueLabel, money = false, t = (value) => value }) {
  if (!rows.length) return null;
  const maximum = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  return <section className="company-bi-trend" aria-label={t(title)}>
    <h3>{t(title)}</h3>
    <div className="company-bi-trend-list">
      {rows.map((row) => {
        const value = Number(row[valueKey] || 0);
        const display = money ? formatReportValue(value, "amountCollected") : value;
        return <article key={`${row.bucket}-${value}`}>
          <div><span>{String(row.bucket || "").slice(0, 10)}</span><strong>{display} {t(valueLabel)}</strong></div>
          <span className="company-bi-trend-track" aria-hidden="true"><span style={{ width: `${Math.max(value > 0 ? 4 : 0, (value / maximum) * 100)}%` }} /></span>
        </article>;
      })}
    </div>
  </section>;
}

function BusinessIntelligenceView({ data, page = 1, t = (value) => value }) {
  const intelligence = data.intelligence || {};
  const summary = intelligence.summary || {};
  const group = businessIntelligenceGroups(intelligence)[page - 1] || businessIntelligenceGroups(intelligence)[0];
  const metrics = Object.entries(businessIntelligenceSummary(summary)).map(([key, value]) => [BI_METRIC_LABELS[key], formatReportValue(value, key)]);
  return <>
    {page === 1 ? <div className="company-bi-metrics">{metrics.map(([metric, value]) => <article key={metric}><span>{t(metric)}</span><strong>{value}</strong></article>)}</div> : null}
    {data.warning ? <p className="company-report-basis" role="status"><strong>{t('Analysis status:')}</strong> {t(data.warning)}</p> : null}
    <div className="company-bi-page-heading"><span>{t('Business intelligence page')} {page} {t('of')} {BUSINESS_INTELLIGENCE_PAGES.length}</span><h3>{t(group.title)}</h3></div>
    <div className="company-bi-insights"><section>
      <h3>{t(group.performanceTitle)}</h3>
      {group.insights.map((item) => <article key={item.id}><p>{item.statement}</p>{item.action ? <p><strong>{t('Manager action:')}</strong> {item.action}</p> : null}</article>)}
    </section></div>
    {group.tables.map((table) => table.chart
      ? <div className="company-bi-trends" key={table.title}><IntelligenceTrend title={table.title} rows={table.rows} {...table.chart} t={t} /></div>
      : <ReportTable key={table.title} t={t} title={table.title} rows={table.rows} inventory={table.inventory} />)}
    {group.guidance ? <p className="company-report-basis">{t(group.guidance)}</p> : null}
  </>;
}

function AdminReports() {
  const branchNames = useActiveBranches();
  const { user, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
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
  const reportRequest = useRef(0);
  useEffect(() => () => { reportRequest.current += 1; }, []);
  const [error, setError] = useState("");
  const [data, setData] = useState({ summary: null, rows: [], secondaryRows: [], basis: "", updatedAt: "", intelligence: null, warning: "" });

  useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return undefined;
    let active = true;
    const query = new URLSearchParams({ from: range.from, to: range.to, branch: branch || assignedBranch });
    const showOptions = (result) => {
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
      };
    apiRequest(`/reports/filter-options?${query}`, { onCached: showOptions })
      .then(showOptions)
      .catch(() => { if (active) setFilterOptions({ customers: [], technicians: [], skus: [], brands: [] }); });
    return () => { active = false; };
  }, [assignedBranch, branch, range.from, range.to]);

  const skuOptions = filterOptions.skus;
  const brandOptions = filterOptions.brands;

  const setTab = (tab) => {
    reportRequest.current += 1;
    setBusy(false);
    if (tab !== activeTab) setRange(defaultRange());
    setActiveTab(tab);
    setReportPage(1);
    setError("");
    setData({ summary: null, rows: [], secondaryRows: [], basis: "", updatedAt: "", intelligence: null, warning: "" });
  };
  const rangeError = range.from && range.to && range.from > range.to ? t('The report start date must be on or before the end date.') : "";
  const hasInterpretation = activeTab === "sales" || activeTab === "inventory";
  const canExport = !busy && Boolean(data.summary);
  const notes = hasInterpretation ? reportInterpretation(data.interpretation, t) : undefined;
  const reportSummary = activeTab === "intelligence" ? businessIntelligenceSummary(data.summary || {})
    : activeTab === "sales" ? salesSummary(data.summary || {}, data.salesStatus)
      : data.summary;
  const metricLabel = (key) => t((activeTab === "sales" && SALES_KPI_LABELS[key]) || (activeTab === "intelligence" && BI_METRIC_LABELS[key]) || humanize(key));
  const rowHeading = activeTab === "sales" ? t("Sales list") : activeTab === "inventory" ? t("Branch stock register") : activeTab === "tech" ? t("Technician performance") : undefined;
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
    const label = t(TABS.find((tab) => tab.id === activeTab)?.label || "Report");
    return activeTab === "inventory" ? `${label} · ${branch === "all" ? t('All Branches') : branch}` : `${label} · ${range.from} ${t('to')} ${range.to}`;
  }, [activeTab, branch, range, currentLanguage]);

  const generate = async () => {
    if (busy) return;
    if (rangeError && activeTab !== "inventory") return setError(rangeError);
    setBusy(true);
    const version = ++reportRequest.current;
    setError("");
    setReportPage(1);
    const interpretation = { interpretation: "1", language: currentLanguage === "Filipino" ? "filipino" : "english" };
    const saveReport = (result, reportData) => {
      if (version !== reportRequest.current) return;
      setData({
        ...reportData,
        basis: result.basis || "",
        updatedAt: result.updatedAt || "",
        interpretation: result.interpretation,
        reportTitle: title,
        reportMetadata: metadata(result.updatedAt),
      });
    };
    try {
      if (activeTab === "intelligence") {
        const query = new URLSearchParams({ from: range.from, to: range.to, branch });
        const result = await apiRequest(`/reports/business-intelligence?${query}`, { revalidate: true, onCached: (cached) => saveReport(cached, { summary: cached.summary || {}, rows: businessIntelligenceRows(cached), secondaryRows: [], intelligence: cached, warning: cached.warning || "" }) });
        saveReport(result, { summary: result.summary || {}, rows: businessIntelligenceRows(result), secondaryRows: [], intelligence: result, warning: result.warning || "" });
      } else if (activeTab === "sales") {
        const query = new URLSearchParams({
          interval: "daily", from: range.from, to: range.to, status: salesStatus,
          paymentMethod: salesPaymentMethod, search: salesSearch.trim(), sku: salesSku.trim(), customer: salesCustomer.trim(), topN: "10", branch,
          ...interpretation,
        });
        const result = await apiRequest(`/reports/sales?${query}`, { revalidate: true, onCached: (cached) => saveReport(cached, { summary: cached.summary || {}, rows: cached.transactions || [], secondaryRows: cached.products || [], salesStatus }) });
        saveReport(result, { summary: result.summary || {}, rows: result.transactions || [], secondaryRows: result.products || [], salesStatus });
      } else if (activeTab === "inventory") {
        const query = new URLSearchParams({
          branch, stock: stockStatus, category: inventoryCategory,
          search: inventorySearch.trim(), brand: inventoryBrand.trim(), sku: inventorySku.trim(),
          ...interpretation,
        });
        const result = await apiRequest(`/reports/inventory?${query}`, { revalidate: true, onCached: (cached) => saveReport(cached, { summary: inventoryReportSummary(cached.summary), rows: inventoryReportRows(cached.rows), secondaryRows: [] }) });
        saveReport(result, { summary: inventoryReportSummary(result.summary), rows: inventoryReportRows(result.rows), secondaryRows: [] });
      } else {
        const query = new URLSearchParams({ from: range.from, to: range.to, branch, search: technicianSearch.trim(), technician: technicianId });
        const result = await apiRequest(`/reports/technicians?${query}`, { revalidate: true, onCached: (cached) => saveReport(cached, { summary: cached.summary || {}, rows: cached.rows || [], secondaryRows: [] }) });
        saveReport(result, { summary: result.summary || {}, rows: result.rows || [], secondaryRows: [] });
      }
    } catch (requestError) {
      if (version !== reportRequest.current) return;
      setError(requestError?.message || "Failed to generate report.");
      setData({ summary: null, rows: [], secondaryRows: [], basis: "", updatedAt: "", intelligence: null, warning: "" });
    } finally { if (version === reportRequest.current) setBusy(false); }
  };

  const metadata = (updatedAt) => ({
    ...COMPANY,
    logoUrl: "/Cold%20Air%20Logo.jpg",
    branch: isSuperAdmin && branch === "all" ? "Head Office · All Branches" : branch || assignedBranch || "Unassigned Branch",
    representative: user?.name || user?.email || "AEROPULSE Representative",
    representativeRole: isSuperAdmin ? "Super Admin · Authorized Representative" : "Branch Admin · Authorized Representative",
    reportingPeriod: activeTab === "inventory" ? `Inventory as of ${formatBusinessDateTime(updatedAt || Date.now())}` : `${formatBusinessDate(range.from)} to ${formatBusinessDate(range.to)}`,
    reportId: `APR-${activeTab.toUpperCase()}-${(activeTab === "inventory" ? toIsoDate(new Date()) : range.from).replaceAll("-", "")}-${activeTab === "inventory" ? String(branch || "ALL").toUpperCase() : range.to.replaceAll("-", "")}`,
    generatedAt: formatBusinessDateTime(updatedAt || new Date()),
    filters: activeTab === "sales"
      ? `Search: ${salesSearch.trim() || "None"}; Status: ${SALES_STATUS_OPTIONS.find(([value]) => value === salesStatus)?.[1] || salesStatus}; Payment: ${SALES_PAYMENT_OPTIONS.find(([value]) => value === salesPaymentMethod)?.[1] || salesPaymentMethod}; SKU: ${salesSku.trim() || "All"}; Customer: ${salesCustomer.trim() || "All"}`
      : activeTab === "inventory"
        ? `Search: ${inventorySearch.trim() || "None"}; Stock: ${INVENTORY_STATUS_OPTIONS.find(([value]) => value === stockStatus)?.[1] || stockStatus}; Category: ${INVENTORY_CATEGORY_OPTIONS.find(([value]) => value === inventoryCategory)?.[1] || inventoryCategory}; Brand: ${inventoryBrand.trim() || "All"}; SKU: ${inventorySku.trim() || "All"}`
        : activeTab === "intelligence" ? "Verified sales, service, inventory, and AMP records" : `Search: ${technicianSearch.trim() || "None"}; Technician: ${filterOptions.technicians.find((item) => item.value === technicianId)?.label || "All"}`,
  });

  const exportExcel = () => exportToExcel({
    filename: `cold-air-${activeTab}-${toIsoDate(new Date())}.xls`,
    title: data.reportTitle, summary: reportSummary, rows: activeTab === "intelligence" ? [] : data.rows,
    additionalTables: activeTab === "sales" && data.secondaryRows.length ? [{ title: t("Product sales summary"), rows: data.secondaryRows }]
      : activeTab === "intelligence" ? businessIntelligenceExcelTables(data.intelligence, t) : [],
    metadata: { ...data.reportMetadata, basis: data.basis ? t(data.basis) : "", analysisStatus: data.warning ? t(data.warning) : "", emptyRowsLabel: t("No matching records.") },
    notes, rowHeading,
    columnLabel: (key) => t(humanize(key)), formatText: displayValue,
    summaryHeading: t(activeTab === "sales" ? "Key performance indicators" : "Report summary"),
    summaryLabels: Object.fromEntries(Object.keys(reportSummary).map((key) => [key, metricLabel(key)])),
  });
  const exportPdf = () => {
    const reportMetadata = data.reportMetadata;
    const tiles = (entries, className = "summary") => entries.length ? `<div class="${className}">${entries.map(([key, value]) => `<div class="summary-item"><strong>${escapeHtml(formatReportValue(value, key))}</strong><span>${escapeHtml(metricLabel(key))}</span></div>`).join("")}</div>` : "";
    const entries = Object.entries(reportSummary || {});
    const summaryHtml = activeTab === "sales"
      ? `<h2>${escapeHtml(t("Key performance indicators"))}</h2>${tiles(entries.filter(([key]) => SALES_KPIS.includes(key)), "summary summary--kpis")}${tiles(entries.filter(([key]) => !SALES_KPIS.includes(key)))}`
      : tiles(entries);
    const notesHtml = notes ? `<section class="report-section report-section--accent report-interpretation"><h2>${escapeHtml(notes.title)}</h2>${notes.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</section>` : "";
    const warningHtml = data.warning ? `<p class="meta"><strong>${escapeHtml(t("Analysis status:"))}</strong> ${escapeHtml(t(data.warning))}</p>` : "";
    const reportHtml = activeTab === "inventory"
      ? inventoryReportHtml(data.rows, summaryHtml + notesHtml, t)
      : activeTab === "sales"
        ? salesReportHtml(data.rows, summaryHtml + notesHtml, data.secondaryRows, t)
        : activeTab === "intelligence"
          ? businessIntelligenceReportHtml(data.intelligence, summaryHtml, t)
          : `${summaryHtml}${reportTableHtml(data.rows, { title: t("Technician performance"), t, emptyLabel: t("No matching records.") })}`;
    exportHtmlToPdfViaPrint({ title: data.reportTitle, subtitle: `${t(data.basis)} - Branch: ${reportMetadata.branch} - Filters: ${reportMetadata.filters}`, html: warningHtml + reportHtml, fileName: `${reportMetadata.reportId}.pdf`, metadata: { ...reportMetadata, reportType: TABS.find((tab) => tab.id === activeTab)?.label, watermark: "COLD AIR", pageOrientation: "landscape", documentStyle: "tabular" } });
  };

  return <Layout title={t('Analytics & Reports')} subtitle={t('AI-prioritized business intelligence and company-formatted operational records')}>
    <section className="company-report-shell">
      <header className="company-report-brand">
        <img src="/Cold%20Air%20Logo.jpg" alt={t('Cold Air logo')} />
        <div><p>{t('Company operational report')}</p><h2>{COMPANY.name}</h2><span>{COMPANY.address}</span><span>{COMPANY.proprietor} · {COMPANY.contact} · {COMPANY.taxRegistration}</span></div>
      </header>

      <nav className="company-report-tabs" aria-label={t('Report type')}>{TABS.map((tab) => <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} aria-current={activeTab === tab.id ? "page" : undefined} disabled={busy} onClick={() => setTab(tab.id)}>{t(tab.label)}</button>)}</nav>

      <div className="company-report-controls">
        <div className="company-report-period-row">
          {activeTab !== "inventory" ? <><label>{t('From')}<input type="date" max={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} value={range.from} onChange={(event) => setRange((previous) => ({ ...previous, from: event.target.value }))} /></label><label>{t('To')}<input type="date" max={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} value={range.to} onChange={(event) => setRange((previous) => ({ ...previous, to: event.target.value }))} /></label></> : null}
          <label>{t('Branch')}<SearchableSelect value={branch || assignedBranch} disabled={!isSuperAdmin} onChange={(event) => setBranch(event.target.value)}>{isSuperAdmin ? <option value="all">{t('All branches')}</option> : null}{(isSuperAdmin ? branchNames : [assignedBranch]).filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}</SearchableSelect></label>
        </div>
        {activeTab === "sales" ? <section className="company-report-filter-panel" aria-labelledby="sales-filter-heading">
          <div className="company-report-filter-heading"><strong id="sales-filter-heading">{t('Sales filters')}</strong><span>{t('Use one search or narrow the report with the dropdowns.')}</span></div>
          <div className="company-report-filter-grid">
            <label className="company-report-filter-search">{t('Search')}<input maxLength={160} type="search" value={salesSearch} onChange={(event) => setSalesSearch(event.target.value)} placeholder={t('Order number, product, SKU, or customer')} /></label>
            <label>SKU<SearchableSelect value={salesSku} onChange={(event) => setSalesSku(event.target.value)}><option value="">{t('All SKUs')}</option>{skuOptions.map((sku) => <option key={sku} value={sku}>{sku}</option>)}</SearchableSelect></label>
            <label>{t('Customer')}<SearchableSelect value={salesCustomer} onChange={(event) => setSalesCustomer(event.target.value)}><option value="">{t('All customers')}</option>{filterOptions.customers.map((customer) => <option key={customer} value={customer}>{customer}</option>)}</SearchableSelect></label>
            <label>{t('Payment method')}<SearchableSelect value={salesPaymentMethod} onChange={(event) => setSalesPaymentMethod(event.target.value)}>{SALES_PAYMENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</SearchableSelect></label>
            <label>{t('Transaction status')}<SearchableSelect value={salesStatus} onChange={(event) => setSalesStatus(event.target.value)}>{SALES_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</SearchableSelect></label>
          </div>
        </section> : null}
        {activeTab === "inventory" ? <section className="company-report-filter-panel" aria-labelledby="inventory-filter-heading">
          <div className="company-report-filter-heading"><strong id="inventory-filter-heading">{t('Inventory filters')}</strong><span>{t('Use one search or narrow the report with the dropdowns.')}</span></div>
          <div className="company-report-filter-grid">
            <label className="company-report-filter-search">{t('Search')}<input maxLength={160} type="search" value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder={t('Product, model, SKU, or branch')} /></label>
            <label>SKU<SearchableSelect value={inventorySku} onChange={(event) => setInventorySku(event.target.value)}><option value="">{t('All SKUs')}</option>{skuOptions.map((sku) => <option key={sku} value={sku}>{sku}</option>)}</SearchableSelect></label>
            <label>{t('Brand')}<SearchableSelect value={inventoryBrand} onChange={(event) => setInventoryBrand(event.target.value)}><option value="">{t('All brands')}</option>{brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</SearchableSelect></label>
            <label>{t('Stock status')}<SearchableSelect value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}>{INVENTORY_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</SearchableSelect></label>
            <label>{t('Category')}<SearchableSelect value={inventoryCategory} onChange={(event) => setInventoryCategory(event.target.value)}>{INVENTORY_CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</SearchableSelect></label>
          </div>
        </section> : null}
        {activeTab === "tech" ? <section className="company-report-filter-panel" aria-labelledby="technician-filter-heading">
          <div className="company-report-filter-heading"><strong id="technician-filter-heading">{t('Technician filters')}</strong><span>{t('Choose a technician or use one search for names and branches.')}</span></div>
          <div className="company-report-filter-grid company-report-filter-grid--compact">
            <label className="company-report-filter-search">{t('Search')}<input maxLength={160} type="search" value={technicianSearch} onChange={(event) => setTechnicianSearch(event.target.value)} placeholder={t('Technician name or branch')} /></label>
            <label>{t('Technician')}<SearchableSelect value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}><option value="">{t('All active technicians')}</option>{filterOptions.technicians.map((technician) => <option key={technician.value} value={technician.value}>{technician.label}{isSuperAdmin && technician.branch ? ` · ${technician.branch}` : ""}</option>)}</SearchableSelect></label>
          </div>
        </section> : null}
        <div className="company-report-actions">
          <button className="company-report-generate" type="button" onClick={generate} disabled={busy || Boolean(rangeError && activeTab !== "inventory")}>{t(busy ? 'Generating…' : 'Generate report')}</button>
          <button type="button" onClick={exportExcel} disabled={!canExport}>{t('Export Excel')}</button><button type="button" onClick={exportPdf} disabled={!canExport}>{t('Export PDF')}</button>
        </div>
      </div>
      {rangeError && activeTab !== "inventory" ? <p className="company-report-error" role="alert">{rangeError}</p> : null}
      {error ? <p className="company-report-error" role="alert">{t(error)}</p> : null}

      {data.summary ? <article className="company-report-document">
        <div className="company-report-document-heading"><div><p>{t(activeTab === "inventory" ? 'Stock position' : 'Reporting period')}</p><h2>{data.reportTitle}</h2></div><div><strong>{data.reportMetadata.branch}</strong><span>{t('Generated')} {formatBusinessDateTime(data.updatedAt || Date.now())}</span></div></div>
        {activeTab === "sales" ? <section className="company-report-kpis">
          <h3>{t("Key performance indicators")}</h3>
          <div className="company-report-summary">{SALES_KPIS.map((key) => <div key={key}><span>{metricLabel(key)}</span><strong>{formatReportValue(reportSummary[key], key)}</strong></div>)}</div>
        </section> : null}
        {activeTab !== "intelligence" ? <div className="company-report-summary">{Object.entries(reportSummary).filter(([key]) => activeTab !== "sales" || !SALES_KPIS.includes(key)).map(([key, value]) => <div key={key}><span>{metricLabel(key)}</span><strong>{formatReportValue(value, key)}</strong></div>)}</div> : null}
        {data.basis ? <p className="company-report-basis"><strong>{t('Report basis:')}</strong> {t(data.basis)}</p> : null}
        {notes ? <section className="company-report-interpretation"><h3>{notes.title}</h3>{notes.lines.map((line, index) => <p key={index}>{line}</p>)}</section> : null}
        {activeTab === "intelligence" ? <BusinessIntelligenceView data={data} page={currentReportPage} t={t} /> : <ReportTable t={t} title={activeTab === "sales" ? "Sales list" : activeTab === "inventory" ? "Branch stock register" : "Technician performance"} rows={displayedRows} columns={reportColumns(data.rows)} inventory={activeTab === "inventory"} />}
        {isPaginatedReport && data.rows.length ? <nav className="company-report-pagination" aria-label={`${t(activeTab === "intelligence" ? "Business intelligence" : activeTab === "sales" ? "Sales report" : "Inventory report")} ${t('pagination')}`}>
          <span>{activeTab === "intelligence" ? t(BUSINESS_INTELLIGENCE_PAGES[currentReportPage - 1]) : `${t('Showing')} ${firstReportRowIndex + 1}–${Math.min(firstReportRowIndex + REPORT_PAGE_SIZE, data.rows.length)} ${t('of')} ${data.rows.length} ${t('records')}`}</span>
          <div>
            <button type="button" onClick={() => setReportPage((page) => Math.max(1, page - 1))} disabled={currentReportPage === 1}>{t('Previous')}</button>
            {reportPageNumbers.map((pageNumber) => <button key={pageNumber} type="button" className={pageNumber === currentReportPage ? "is-current" : ""} aria-current={pageNumber === currentReportPage ? "page" : undefined} aria-label={`${t(activeTab === "intelligence" ? "Business intelligence" : activeTab === "sales" ? "Sales report" : "Inventory report")} ${t('page')} ${pageNumber}`} onClick={() => setReportPage(pageNumber)}>{pageNumber}</button>)}
            <button type="button" onClick={() => setReportPage((page) => Math.min(reportTotalPages, page + 1))} disabled={currentReportPage === reportTotalPages}>{t('Next')}</button>
          </div>
        </nav> : null}
        {data.secondaryRows.length && activeTab === "sales" && currentReportPage === 1 ? <ReportTable t={t} title="Product sales summary" rows={data.secondaryRows} /> : null}
        {activeTab !== "intelligence" && !data.rows.length ? <div className="company-report-empty">{t('No records match the selected filters.')}</div> : null}
      </article> : busy ? <LoadingSkeleton label={t('Generating…')} variant="table" /> : <div className="company-report-empty">{t('Choose the report filters, then select Generate report.')}</div>}
    </section>
  </Layout>;
}

export default AdminReports;
