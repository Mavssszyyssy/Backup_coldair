import "./commerceAnalytics.css";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#64748b"];

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

export function SalesTrendChart({ data = [], period = "monthly" }) {
  const limit = period === "daily" ? 14 : period === "monthly" ? 12 : 8;
  const values = data.slice(-limit);
  const maxValue = Math.max(1, ...values.map((item) => Number(item.sales || 0)));

  if (!values.length) return <EmptyAnalytics text="No paid sales have been recorded for this period." />;

  return (
    <div className="commerce-trend" role="img" aria-label={`${period} paid revenue bar chart`}>
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

export function DonutChart({ title, caption, data = [], valueKey = "count", valueFormatter = (value) => value.toLocaleString() }) {
  const values = data
    .map((item) => ({ ...item, value: Math.max(0, Number(item[valueKey] || 0)) }))
    .filter((item) => item.value > 0);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <EmptyAnalytics text={`No ${title.toLowerCase()} data is available yet.`} />;

  let cursor = 0;
  const segments = values.map((item, index) => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${COLORS[index % COLORS.length]} ${start}% ${cursor}%`;
  });

  return (
    <div className="commerce-donut-layout">
      <div className="commerce-donut" style={{ background: `conic-gradient(${segments.join(", ")})` }} role="img" aria-label={`${title} pie chart`}>
        <div className="commerce-donut-center"><strong>{valueFormatter(total)}</strong><span>{caption}</span></div>
      </div>
      <div className="commerce-legend">
        {values.map((item, index) => (
          <div className="commerce-legend-item" key={item.key || item.label || index}>
            <span className="commerce-legend-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="commerce-legend-label">{item.label || item.branch || item.source}</span>
            <strong>{valueFormatter(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductPerformance({ products = [] }) {
  const values = products.slice(0, 5);
  const maxSales = Math.max(1, ...values.map((item) => Number(item.sales || 0)));
  if (!values.length) return <EmptyAnalytics text="No paid product sales have been recorded yet." />;
  return (
    <div className="commerce-ranked-list">
      {values.map((item, index) => (
        <div className="commerce-ranked-row" key={`${item.product}-${index}`}>
          <span className="commerce-rank">{index + 1}</span>
          <div className="commerce-ranked-detail">
            <div className="commerce-ranked-title"><span>{item.product || "Unnamed product"}</span><strong>{formatCurrency(item.sales)}</strong></div>
            <div className="commerce-product-track"><div style={{ width: `${Math.max(4, (Number(item.sales || 0) / maxSales) * 100)}%` }} /></div>
            <small>{Number(item.unitsSold || 0).toLocaleString()} units sold</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BranchPerformance({ branches = [] }) {
  if (!branches.length) return <EmptyAnalytics text="No branch sales have been recorded yet." />;
  return (
    <div className="commerce-table-wrap">
      <table className="commerce-table">
        <thead><tr><th>Branch</th><th>Orders</th><th>Paid orders</th><th>Paid revenue</th></tr></thead>
        <tbody>
          {branches.slice(0, 8).map((branch) => (
            <tr key={branch.branch}>
              <td>{branch.branch}</td><td>{Number(branch.orders || 0).toLocaleString()}</td><td>{Number(branch.paidOrders || 0).toLocaleString()}</td><td>{formatCurrency(branch.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TechnicianPerformance({ technicians = [] }) {
  if (!technicians.length) return <EmptyAnalytics text="No technician performance data is available yet." />;
  return (
    <div className="commerce-ranked-list">
      {technicians.slice(0, 5).map((technician, index) => (
        <div className="commerce-tech-row" key={`${technician.name}-${index}`}>
          <span className="commerce-rank">{index + 1}</span>
          <span className="commerce-tech-name">{technician.name || "Technician"}</span>
          <span><strong>{Number(technician.completedMonth || 0)}</strong><small> completed this month</small></span>
        </div>
      ))}
    </div>
  );
}

export function EmptyAnalytics({ text }) {
  return <div className="commerce-empty">{text}</div>;
}
