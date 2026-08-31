import { useMemo, useState } from "react";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import { exportHtmlToPdfViaPrint } from "../../utils/exporters";

const REPORT_TYPES = [
  { value: "predictive_maintenance", label: "Next Maintenance Recommendation" },
  { value: "maintenance_summary", label: "Maintenance Summary" },
  { value: "inventory_reliability_analysis", label: "Aggregate Recorded Service Analysis", internalOnly: true },
];
const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const serviceLabel = (value) => value === "deep_cleaning" ? "Deep cleaning" : "Regular cleaning";
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-US") : "Not available";
const capacityAssessmentLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  const labels = {
    suitable: "Suitable for the room",
    insufficient: "May be too small for the room",
    higher_than_necessary: "May be larger than needed",
    room_size_required: "Room size needed",
    capacity_required: "Horsepower needed",
  };
  return labels[normalized] || (normalized
    ? normalized.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Not assessed");
};

function AmpReportCenter({
  units = [],
  title = "AMP Report Center",
  subtitle = "Recorded-history and environment-based maintenance planning with traceable branch reports.",
}) {
  const { user } = useUser();
  const reportUnits = useMemo(() => units.filter((unit) => unit?.unitId || unit?.id), [units]);
  const types = useMemo(() => REPORT_TYPES.filter((item) => !item.internalOnly || ["admin", "superadmin", "owner", "manager"].includes(user?.role)), [user?.role]);
  const [reportType, setReportType] = useState("predictive_maintenance");
  const [unitId, setUnitId] = useState("");
  const [report, setReport] = useState(null);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!unitId) return setError("Select an installed AC unit first.");
    setLoading(true); setError("");
    try {
      const result = await apiRequest("/ai/amp-report", { method: "POST", body: JSON.stringify({ reportType, unitId }) });
      setReport(result.report || null); setProvider(result.provider || "");
    } catch (requestError) { setReport(null); setError(requestError.message || "Unable to generate AMP report."); }
    finally { setLoading(false); }
  };

  const exportPdf = () => {
    if (!report) return;
    const m = report.maintenance || {};
    const historyRows = (report.serviceHistory || []).map((item) => `<tr><td>${escapeHtml(dateLabel(item.date))}</td><td>${escapeHtml(serviceLabel(item.type))}</td><td>${escapeHtml(item.findings || "Not recorded")}</td><td>${escapeHtml(item.actionTaken || "Not recorded")}</td><td>${escapeHtml((item.partsUsed || []).join(", ") || "None recorded")}</td></tr>`).join("");
    const modelRows = (report.aggregateReliability?.modelsByRecordedService || []).map((item) => `<tr><td>${escapeHtml(item.model)}</td><td>${escapeHtml(item.count)}</td></tr>`).join("");
    const html = `
      <div class="summary">
        <div class="summary-item"><strong>${escapeHtml(dateLabel(m.bestServicedBy))}</strong><span>Best serviced by</span></div>
        <div class="summary-item"><strong>${escapeHtml(m.recommendedServiceLabel || serviceLabel(m.recommendedService))}</strong><span>Recommended service</span></div>
        <div class="summary-item"><strong>${escapeHtml(capacityAssessmentLabel(m.capacityAssessment?.status))}</strong><span>Room size vs HP</span></div>
        <div class="summary-item"><strong>${escapeHtml(m.environmentRisk?.level || "Not assessed")}</strong><span>Operating environment</span></div>
      </div>
      <h2>Maintenance recommendation</h2><p>${escapeHtml(m.interpretation || m.recommendationBasis || "")}</p>
      <table><tbody>
        <tr><th>AC Unit ID</th><td>${escapeHtml(report.unit?.unitId || "Not recorded")}</td><th>Serial Number</th><td>${escapeHtml(report.unit?.serialNumber || "Not recorded")}</td></tr>
        <tr><th>Brand</th><td>${escapeHtml(report.unit?.brand || "Not recorded")}</td><th>Model</th><td>${escapeHtml(report.unit?.model || "Not recorded")}</td></tr>
        <tr><th>Last Service</th><td>${escapeHtml(dateLabel(m.lastServiceDate))}</td><th>Last Cleaning</th><td>${escapeHtml(dateLabel(m.lastCleaningDate))}</td></tr>
        <tr><th>Room Size</th><td>${escapeHtml(report.unit?.roomSizeSqm ? `${report.unit.roomSizeSqm} m²` : "Not recorded")}</td><th>AC Horsepower</th><td>${escapeHtml(report.unit?.capacityHp ? `${report.unit.capacityHp} HP` : "Not recorded")}</td></tr>
        <tr><th>Warranty Status</th><td>${escapeHtml(String(report.unit?.warrantyStatus || "Not recorded").replaceAll("_", " "))}</td><th>Responsible Branch</th><td>${escapeHtml(report.branch || "Not recorded")}</td></tr>
      </tbody></table>
      <p><strong>Historical basis:</strong> ${escapeHtml(m.recommendationBasis || "")}</p>
      <p><strong>Capacity assessment:</strong> ${escapeHtml(m.capacityAssessment?.summary || "Room size has not been supplied.")}</p>
      <p><strong>Environment assessment:</strong> ${escapeHtml(m.environmentAssessment || "Operating conditions have not been recorded yet.")}</p>
      <h2>Technician preparation</h2><ul>${(m.technicianPreparation || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>No component suggestion is supported by current recorded history.</li>"}</ul>
      <h2>Recorded service history</h2><table><thead><tr><th>Date</th><th>Service</th><th>Findings</th><th>Action</th><th>Parts</th></tr></thead><tbody>${historyRows}</tbody></table>
      ${report.aggregateReliability ? `<h2>Aggregate recorded service analysis</h2><p>${escapeHtml(report.aggregateReliability.note)}</p><p><strong>Scope:</strong> ${escapeHtml(report.aggregateReliability.scope)} · <strong>Units:</strong> ${escapeHtml(report.aggregateReliability.unitCount)} · <strong>Recorded services:</strong> ${escapeHtml(report.aggregateReliability.recordedServiceCount)}</p><table><thead><tr><th>Model</th><th>Recorded services</th></tr></thead><tbody>${modelRows}</tbody></table><h3>Recorded parts use</h3><ul>${(report.aggregateReliability.partsByRecordedUse || []).map((item) => `<li>${escapeHtml(item.component)} — ${escapeHtml(item.count)} recorded use(s)</li>`).join("") || "<li>No recorded parts-use data.</li>"}</ul>` : ""}
      <p class="meta">${escapeHtml(report.note || "")}</p>`;
    exportHtmlToPdfViaPrint({
      title: report.reportLabel || report.title,
      subtitle: `AC: ${report.unit?.brand || ""} ${report.unit?.model || ""} · Serial: ${report.unit?.serialNumber || "Not recorded"}`,
      fileName: report.fileNameBase, html,
      metadata: {
        reportId: report.reportId, branch: report.branch, reportType: report.reportLabel,
        generatedAt: new Date(report.generatedAt).toLocaleString(), systemName: report.systemName, watermark: report.watermark,
        representative: user?.name || user?.email || "AEROPULSE Representative",
        representativeRole: user?.role === "superadmin" ? "Super Admin · Authorized Representative" : "Branch Representative",
      },
    });
  };

  const maintenance = report?.maintenance || {};
  return (
    <section className="amp-card amp-report-center">
      <div className="amp-card-header"><div><h2>{title}</h2><p className="amp-muted">{subtitle}</p></div>{report ? <button type="button" onClick={exportPdf}>Export PDF</button> : null}</div>
      <div className="amp-report-controls">
        <label>Report type<select value={reportType} onChange={(event) => setReportType(event.target.value)}>{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Installed AC unit<select value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">Select a unit</option>{reportUnits.map((unit) => { const value = unit.unitId || unit.id; return <option key={value} value={value}>{unit.modelName || unit.model || "AC Unit"} · {unit.serialNumber || value}</option>; })}</select></label>
        <button type="button" onClick={generate} disabled={loading || !reportUnits.length}>{loading ? "Generating report…" : "Generate report"}</button>
      </div>
      {!reportUnits.length ? <p className="amp-empty">No eligible installed units are currently in this AMP view.</p> : null}
      {error ? <p className="amp-error">{error}</p> : null}
      {report ? <div className="amp-report-result">
        <div className="amp-report-meta"><span>{report.reportId}</span><span>Branch: {report.branch}</span><span>{provider === "openai" ? "OpenAI-assisted interpretation" : "System recommendation"}</span></div>
        <h3>{report.title}</h3>
        <div className="amp-metrics"><article><span>Best serviced by</span><strong>{dateLabel(maintenance.bestServicedBy)}</strong></article><article><span>Service</span><strong>{maintenance.recommendedServiceLabel || serviceLabel(maintenance.recommendedService)}</strong></article><article><span>Room size vs HP</span><strong>{capacityAssessmentLabel(maintenance.capacityAssessment?.status)}</strong></article></div>
        <p>{maintenance.interpretation || maintenance.recommendationBasis}</p>
        {maintenance.environmentAssessment ? <p><strong>Operating environment:</strong> {maintenance.environmentAssessment}</p> : null}
        <p className="amp-muted">{report.note}</p>
      </div> : null}
    </section>
  );
}

export default AmpReportCenter;
