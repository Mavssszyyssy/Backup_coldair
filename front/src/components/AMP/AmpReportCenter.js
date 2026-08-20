import { useMemo, useState } from "react";
import { apiRequest } from "../../config/api";
import { exportHtmlToPdfViaPrint } from "../../utils/exporters";

const REPORT_TYPES = [
  { value: "root_cause_analysis", label: "Root Cause Analysis" },
  { value: "predictive_maintenance", label: "Predictive Maintenance" },
  { value: "ac_health_analysis", label: "AC Health Analysis" },
  { value: "summary_report", label: "AMP Summary Report" },
];

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const reportList = (items = []) => (items || [])
  .map((item) => `<li>${escapeHtml(item)}</li>`)
  .join("");

function AmpReportCenter({ units = [] }) {
  const reportUnits = useMemo(
    () => units.filter((unit) => unit?.unitId || unit?.id),
    [units],
  );
  const [reportType, setReportType] = useState("ac_health_analysis");
  const [unitId, setUnitId] = useState("");
  const [report, setReport] = useState(null);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!unitId) {
      setError("Select an installed AC unit first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/ai/amp-report", {
        method: "POST",
        body: JSON.stringify({ reportType, unitId }),
      });
      setReport(result.report || null);
      setProvider(result.provider || "");
    } catch (requestError) {
      setReport(null);
      setError(requestError.message || "Unable to generate AMP report.");
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => {
    if (!report) return;
    const rootCauseRows = (report.rootCauses || []).map((item) => `
      <tr><td>${escapeHtml(item.factor)}</td><td>${escapeHtml(item.evidence)}</td><td>${escapeHtml(item.priority)}</td></tr>`).join("");
    const planRows = (report.maintenancePlan || []).map((item) => `
      <tr><td>${escapeHtml(item.timeframe)}</td><td>${escapeHtml(item.action)}</td><td>${escapeHtml(item.reason)}</td></tr>`).join("");
    const html = `
      <div class="summary">
        <div class="summary-item"><strong>${escapeHtml(report.health?.score ?? "-")}/100</strong><span>Health score</span></div>
        <div class="summary-item"><strong>${escapeHtml(report.health?.label || "-")}</strong><span>Health status</span></div>
        <div class="summary-item"><strong>${escapeHtml(report.health?.riskLevel || "-")}</strong><span>Risk level</span></div>
        <div class="summary-item"><strong>${escapeHtml(report.confidence || "-")}</strong><span>Evidence confidence</span></div>
      </div>
      <p class="meta">${escapeHtml(report.executiveSummary)}</p>
      <h2>Key findings</h2><ul>${reportList(report.findings)}</ul>
      <h2>Root cause review</h2>
      <table><thead><tr><th>Factor</th><th>Evidence</th><th>Priority</th></tr></thead><tbody>${rootCauseRows}</tbody></table>
      <h2>Recommended maintenance</h2><ul>${reportList(report.recommendations)}</ul>
      <h2>Maintenance plan</h2>
      <table><thead><tr><th>Timeframe</th><th>Action</th><th>Reason</th></tr></thead><tbody>${planRows}</tbody></table>
      <p class="meta">${escapeHtml(report.note || "")}</p>`;
    exportHtmlToPdfViaPrint({
      title: report.reportLabel || report.title,
      subtitle: `AC: ${report.unit?.brand || ""} ${report.unit?.model || ""} · Serial: ${report.unit?.serialNumber || "Not recorded"}`,
      fileName: report.fileNameBase,
      html,
      metadata: {
        reportId: report.reportId,
        branch: report.branch,
        reportType: report.reportLabel,
        generatedAt: new Date(report.generatedAt).toLocaleString(),
        systemName: report.systemName,
        watermark: report.watermark,
      },
    });
  };

  return (
    <section className="amp-card amp-report-center">
      <div className="amp-card-header">
        <div>
          <h2>AMP Report Center</h2>
          <p className="amp-muted">Generate traceable AC diagnostics with branch, report ID, and professional PDF export.</p>
        </div>
        {report ? <button type="button" onClick={exportPdf}>Export PDF</button> : null}
      </div>
      <div className="amp-report-controls">
        <label>Report type
          <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
            {REPORT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>Installed AC unit
          <select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
            <option value="">Select a unit</option>
            {reportUnits.map((unit) => {
              const value = unit.unitId || unit.id;
              return <option key={value} value={value}>{unit.modelName || unit.model || "AC Unit"} · {unit.serialNumber || value}</option>;
            })}
          </select>
        </label>
        <button type="button" onClick={generate} disabled={loading || !reportUnits.length}>
          {loading ? "Generating report…" : "Generate report"}
        </button>
      </div>
      {!reportUnits.length ? <p className="amp-empty">No eligible installed units are currently in this AMP view.</p> : null}
      {error ? <p className="amp-error">{error}</p> : null}
      {report ? (
        <div className="amp-report-result">
          <div className="amp-report-meta"><span>{report.reportId}</span><span>Branch: {report.branch}</span><span>{provider === "openai" ? "OpenAI analysis" : "System analysis"}</span></div>
          <h3>{report.title}</h3>
          <p>{report.executiveSummary}</p>
          <div className="amp-metrics">
            <article><span>Health</span><strong>{report.health?.score ?? "-"}</strong></article>
            <article><span>Status</span><strong>{report.health?.label || "-"}</strong></article>
            <article><span>Risk</span><strong>{report.health?.riskLevel || "-"}</strong></article>
          </div>
          <div className="amp-report-grid">
            <div><h4>Key findings</h4><ul>{(report.findings || []).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>
            <div><h4>Recommendations</h4><ul>{(report.recommendations || []).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>
          </div>
          <p className="amp-muted">{report.note}</p>
        </div>
      ) : null}
    </section>
  );
}

export default AmpReportCenter;
