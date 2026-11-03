import { useState } from "react";
import "./commerceAnalytics.css";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#64748b"];
export const ORDER_STAGE_COLORS = Object.freeze({
  to_pay: "#b45309",
  to_deliver: "#1d4ed8",
  to_install: "#0e7490",
  complete: "#047857",
  cancelled: "#b91c1c",
});
const ACQUISITION_COLORS = Object.freeze({
  social_media: "#1d4ed8",
  paid_advertisement: "#7c3aed",
  friend_referral: "#047857",
  direct_organic: "#0e7490",
  walk_in: "#b45309",
  google: "#be185d",
  unknown: "#64748b",
});
export const segmentColor = (title, item, index) =>
  title === "Order pipeline" ? ORDER_STAGE_COLORS[item.key] || COLORS[index % COLORS.length]
    : title === "Customer acquisition" ? ACQUISITION_COLORS[item.key] || COLORS[index % COLORS.length]
      : COLORS[index % COLORS.length];

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const shortCurrency = (value) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000) return `PHP ${(amount / 1000000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1000) return `PHP ${(amount / 1000).toFixed(1)}K`;
  return `PHP ${Math.round(amount)}`;
};

const labelForPeriod = (item, period) => {
  if (period === "daily") {
    return new Date(`${item.date}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  }
  if (period === "monthly") {
    return new Date(`${item.month}-01T00:00:00`).toLocaleDateString("en-PH", { month: "short", year: "2-digit" });
  }
  return item.quarter || "-";
};

export function SalesTrendChart({ data = [], period = "monthly", t = (value) => value }) {
  const limit = period === "daily" ? 14 : period === "monthly" ? 12 : 8;
  const values = data.slice(-limit);
  const maxValue = Math.max(1, ...values.map((item) => Number(item.sales || 0)));

  if (!values.length) return <EmptyAnalytics text={t("No paid sales have been recorded for this period.")} />;

  return (
    <div className="commerce-trend" role="img" aria-label={`${t(period)} ${t("paid revenue bar chart")}`}>
      <div className="commerce-trend-scale"><span>{shortCurrency(maxValue)}</span><span>0</span></div>
      <div className="commerce-bars">
        {values.map((item, index) => {
          const sales = Number(item.sales || 0);
          const height = Math.max(sales > 0 ? 5 : 0, Math.round((sales / maxValue) * 100));
          return (
            <div className="commerce-bar-column" key={`${labelForPeriod(item, period)}-${index}`}>
              <div className="commerce-bar-track" title={`${labelForPeriod(item, period)}: ${formatCurrency(sales)} from ${item.orders || 0} paid order${item.orders === 1 ? "" : "s"}`}>
                <div className="commerce-bar-fill" style={{ height: `${height}%` }} />
              </div>
              <span>{labelForPeriod(item, period)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DonutChart({ title, caption, canonicalTitle = title, data = [], valueKey = "count", valueFormatter = (value) => value.toLocaleString(), emptyText, t = (value) => value }) {
  const values = data
    .map((item) => ({ ...item, value: Math.max(0, Number(item[valueKey] || 0)) }))
    .filter((item) => item.value > 0);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <EmptyAnalytics text={emptyText || `${t("No data is available yet for")} ${title.toLowerCase()}.`} />;

  let cursor = 0;
  const segments = values.map((item, index) => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${segmentColor(canonicalTitle, item, index)} ${start}% ${cursor}%`;
  });

  return (
    <div className="commerce-donut-layout">
      <div className="commerce-donut" style={{ background: `conic-gradient(${segments.join(", ")})` }} role="img" aria-label={`${title}: ${values.map((item) => `${t(item.label || item.branch || item.source)}, ${valueFormatter(item.value)}`).join("; ")}`}>
        <div className="commerce-donut-center"><strong>{valueFormatter(total)}</strong><span>{caption}</span></div>
      </div>
      <div className="commerce-legend">
        {values.map((item, index) => (
          <div className="commerce-legend-item" key={item.key || item.label || index} title={`${t(item.label || item.branch || item.source)}: ${valueFormatter(item.value)} ${caption}`}>
            <span className="commerce-legend-dot" style={{ backgroundColor: segmentColor(canonicalTitle, item, index) }} />
            <span className="commerce-legend-label">{t(item.label || item.branch || item.source)}</span>
            <strong>{valueFormatter(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductPerformance({ products = [], t = (value) => value }) {
  const values = products.slice(0, 5);
  const maxSales = Math.max(1, ...values.map((item) => Number(item.sales || 0)));
  if (!values.length) return <EmptyAnalytics text={t("No paid product sales have been recorded yet.")} />;
  return (
    <div className="commerce-ranked-list">
      {values.map((item, index) => (
        <div className="commerce-ranked-row" key={`${item.product}-${index}`}>
          <span className="commerce-rank">{index + 1}</span>
          <div className="commerce-ranked-detail">
            <div className="commerce-ranked-title"><span>{item.product || t("Unnamed product")}</span><strong>{formatCurrency(item.sales)}</strong></div>
            <div className="commerce-product-track"><div style={{ width: `${Math.max(4, (Number(item.sales || 0) / maxSales) * 100)}%` }} /></div>
            <small>{Number(item.unitsSold || 0).toLocaleString()} {t("units sold")}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BranchPerformance({ branches = [], t = (value) => value }) {
  const [openBranch, setOpenBranch] = useState('');
  if (!branches.length) return <EmptyAnalytics text={t("No branch sales have been recorded yet.")} />;
  return (
    <div className="commerce-table-wrap">
      <table className="commerce-table">
        <thead><tr><th>{t("Branch")}</th><th>{t("Orders")}</th><th>{t("Paid orders")}</th><th>{t("Paid revenue")}</th></tr></thead>
        <tbody>
          {branches.map((branch) => (
            <FragmentBranch key={branch.branch} branch={branch} open={openBranch === branch.branch} onToggle={() => setOpenBranch((current) => current === branch.branch ? '' : branch.branch)} t={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FragmentBranch({ branch, open, onToggle, t }) {
  return <>
    <tr><td><button type="button" className="commerce-branch-drilldown" aria-expanded={open} onClick={onToggle}>{branch.branch} {open ? '−' : '+'}</button></td><td>{Number(branch.orders || 0).toLocaleString()}</td><td>{Number(branch.paidOrders || 0).toLocaleString()}</td><td>{formatCurrency(branch.revenue)}</td></tr>
    {open ? <tr><td colSpan={4}><div className="commerce-branch-details"><strong>{t("Products in paid orders")}</strong>{branch.products?.length ? <><ul>{branch.products.map((item, index) => <li key={item.productId || `${item.product}-${index}`}><span>{item.product} · {Number(item.quantity || 0).toLocaleString()} {t("units")}</span><strong>{formatCurrency(item.revenue)} {t("item subtotal")}</strong></li>)}</ul><small>{t("Item subtotals can differ from paid order revenue after discounts and delivery charges.")}</small></> : <p>{t("No paid product sales recorded for this branch.")}</p>}</div></td></tr> : null}
  </>;
}

export function TechnicianPerformance({ technicians = [], t = (value) => value }) {
  if (!technicians.length) return <EmptyAnalytics text={t("No technician performance data is available yet.")} />;
  return (
    <div className="commerce-ranked-list">
      {technicians.slice(0, 5).map((technician, index) => (
        <div className="commerce-tech-row" key={`${technician.name}-${index}`}>
          <span className="commerce-rank">{index + 1}</span>
          <span className="commerce-tech-name">{technician.name || t("Technician")}</span>
          <span><strong>{Number(technician.completedMonth || 0)}</strong><small> {t("completed this month")}</small></span>
        </div>
      ))}
    </div>
  );
}

export function EmptyAnalytics({ text }) {
  return <div className="commerce-empty">{text}</div>;
}
