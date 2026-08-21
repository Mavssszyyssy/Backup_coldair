import { useMemo, useState } from "react";
import { apiRequest } from "../../../config/api";
import { useUser } from "../../../context/UserContext";
import { exportHtmlToPdfViaPrint, exportToExcel, formatReportValue } from "../../../utils/exporters";
import { getSessionActiveBranch } from "../../../utils/authSession";
import "../adminShared.css";
import AdminLayout from "../Common/AdminLayout";
// import icons from '../../common/icons';
const icons = {}; // BOUTIQUE MIGRATION STUB

const tabs = [
  { id: "sales", label: "Sales Report" },
  { id: "inventory", label: "Inventory Report" },
  { id: "tech", label: "Technician Performance" },
];

const toIsoDate = (d) => d.toISOString().split("T")[0];

const escapeReportHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const defaultRange = () => {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return { from: toIsoDate(from), to: toIsoDate(to) };
};

function AdminReports() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("sales");
  const [range, setRange] = useState(defaultRange);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ summary: null, rows: [] });

  const canExport = data.rows.length > 0;

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      if (activeTab === "sales") {
        const result = await apiRequest(
          `/reports/sales?interval=daily&from=${encodeURIComponent(new Date(range.from).toISOString())}&to=${encodeURIComponent(new Date(range.to).toISOString())}&topN=10`,
        );
        const totalSales = (result.series || []).reduce(
          (sum, item) => sum + Number(item.revenue || 0),
          0,
        );
        const totalUnits = (result.series || []).reduce(
          (sum, item) => sum + Number(item.unitsSold || 0),
          0,
        );
        const topProducts = (result.topProducts || []).map((p) => ({
          name: p.name,
          unitsSold: Number(p.unitsSold || 0),
          revenue: Number(p.revenue || 0),
        }));
        setData({
          summary: {
            totalSales,
            totalUnits,
            topProductsCount: topProducts.length,
          },
          rows: topProducts,
        });
      } else if (activeTab === "inventory") {
        const [lowStock, allProducts] = await Promise.all([
          apiRequest("/products/low-stock").catch(() => ({ products: [] })),
          apiRequest("/products").catch(() => ({ products: [] })),
        ]);

        const products = Array.isArray(allProducts.products)
          ? allProducts.products
          : [];
        const lowStockItems = Array.isArray(lowStock.products)
          ? lowStock.products
          : [];

        const stockValue = products.reduce(
          (sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0),
          0,
        );
        const rows = lowStockItems.map((p) => ({
          sku: p.sku,
          name: p.name,
          stock: Number(p.stock || 0),
          threshold: Number(p.threshold || 0),
          recommendation: "Reorder recommended",
        }));

        setData({
          summary: { lowStockCount: lowStockItems.length, stockValue },
          rows,
        });
      } else {
        // Placeholder: later you can wire to real task / dispatch metrics
        const rows = [
          {
            technician: "Technician A",
            completedOrders: 12,
            avgResponseMinutes: 45,
          },
          {
            technician: "Technician B",
            completedOrders: 9,
            avgResponseMinutes: 62,
          },
          {
            technician: "Technician C",
            completedOrders: 6,
            avgResponseMinutes: 80,
          },
        ];
        setData({
          summary: {
            totalCompletedOrders: rows.reduce(
              (s, r) => s + r.completedOrders,
              0,
            ),
            avgResponseMinutes: Math.round(
              rows.reduce((s, r) => s + r.avgResponseMinutes, 0) / rows.length,
            ),
          },
          rows,
        });
      }
    } catch (e) {
      setError(e?.message || "Failed to generate report.");
      setData({ summary: null, rows: [] });
    } finally {
      setBusy(false);
    }
  };

  const title = useMemo(() => {
    const tab = tabs.find((t) => t.id === activeTab)?.label || "Reports";
    return `${tab} (${range.from} to ${range.to})`;
  }, [activeTab, range.from, range.to]);

  const createExportMetadata = () => {
    const isSuperAdmin = user?.role === "superadmin";
    const assignedBranch =
      user?.activeBranch ||
      user?.assignedBranch ||
      getSessionActiveBranch() ||
      "";
    return {
      branch: isSuperAdmin
        ? "Head Office · All Branches"
        : assignedBranch || "Unassigned Branch",
      representative: user?.name || user?.email || "AEROPULSE Representative",
      representativeRole: isSuperAdmin
        ? "Super Admin · Authorized Representative"
        : "Branch Admin · Authorized Representative",
      reportingPeriod: `${range.from} to ${range.to}`,
      reportId: `APR-${activeTab.toUpperCase()}-${range.from.replaceAll("-", "")}-${range.to.replaceAll("-", "")}`,
      generatedAt: new Date().toLocaleString("en-PH"),
    };
  };

  const onExportExcel = () => {
    const exportMetadata = createExportMetadata();
    exportToExcel({
      filename: `aeropulse-${activeTab}-${range.from}-to-${range.to}.xls`,
      title,
      summary: data.summary,
      rows: data.rows,
      metadata: exportMetadata,
    });
  };

  const onExportPdf = () => {
    const exportMetadata = createExportMetadata();
    const summaryHtml = data.summary
      ? `<div class="summary">${Object.entries(
          data.summary,
        )
          .map(
            ([k, v]) =>
              `<div class="summary-item"><strong>${escapeReportHtml(formatReportValue(v, k))}</strong><span>${escapeReportHtml(k.replace(/([A-Z])/g, " $1"))}</span></div>`,
          )
          .join("")}</div>`
      : "";
    const headers = data.rows.length ? Object.keys(data.rows[0]) : [];
    const table = headers.length
      ? `<table>
          <thead><tr>${headers.map((h) => `<th>${escapeReportHtml(h)}</th>`).join("")}</tr></thead>
          <tbody>
            ${data.rows
              .map(
                (r) =>
                  `<tr>${headers.map((h) => `<td>${escapeReportHtml(formatReportValue(r[h], h))}</td>`).join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>`
      : '<div class="meta">No rows.</div>';
    exportHtmlToPdfViaPrint({
      title,
      subtitle: `Reporting period: ${range.from} to ${range.to} · Exporting branch: ${exportMetadata.branch}`,
      html: `${summaryHtml}${table}`,
      fileName: `${exportMetadata.reportId}.pdf`,
      metadata: {
        ...exportMetadata,
        reportType: tabs.find((tab) => tab.id === activeTab)?.label || "Operational Report",
        watermark: "AEROPULSE",
      },
    });
  };

  return (
    <AdminLayout
      title="Reports"
      subtitle="Generate sales, inventory, and technician performance exports"
    >
      <div className="admin-card">
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  background: activeTab === tab.id ? "#eff6ff" : "white",
                  color: activeTab === tab.id ? "#1d4ed8" : "#374151",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <label style={{ fontWeight: 800, fontSize: 12, color: "#374151" }}>
              From
              <input
                type="date"
                value={range.from}
                onChange={(e) =>
                  setRange((p) => ({ ...p, from: e.target.value }))
                }
              />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12, color: "#374151" }}>
              To
              <input
                type="date"
                value={range.to}
                onChange={(e) =>
                  setRange((p) => ({ ...p, to: e.target.value }))
                }
              />
            </label>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              style={{ fontWeight: 800 }}
            >
              {busy ? "Generating…" : "Generate"}
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              disabled={!canExport}
              style={{ fontWeight: 800 }}
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              disabled={!canExport}
              style={{ fontWeight: 800 }}
            >
              Export PDF
            </button>
          </div>
        </div>

        {error ? (
          <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p>
        ) : null}

        {data.summary ? (
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <div className="stat-card" style={{ minWidth: 240 }}>
              <div className="stat-icon">
                <img
                  src={icons.clipboardList}
                  alt=""
                  className="inline-icon inline-icon--xl"
                />
              </div>
              <div className="stat-info">
                <h3>Summary</h3>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>
                  {Object.entries(data.summary)
                    .map(
                      ([k, v]) =>
                        `${k.replace(/([A-Z])/g, " $1")}: ${formatReportValue(v, k)}`,
                    )
                    .join(" | ")}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {data.rows.length ? (
          <div style={{ marginTop: 12 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  {Object.keys(data.rows[0]).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, idx) => (
                  <tr key={idx}>
                    {Object.keys(data.rows[0]).map((h) => (
                      <td key={h}>{formatReportValue(r[h], h)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ marginTop: 12, color: "#6b7280", fontWeight: 700 }}>
            Generate a report to see results.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminReports;
