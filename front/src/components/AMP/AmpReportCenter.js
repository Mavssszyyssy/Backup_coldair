import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  DownloadSimple,
  FileText,
} from "@phosphor-icons/react";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import { translateText } from "../../utils/customerI18n";
import { customerSystemMessage } from "../../domain/customerLanguage";
import { exportHtmlToPdfViaPrint } from "../../utils/exporters";
import { serviceLabel, serviceDateLabel as dateLabel } from "../../domain/myunit/serviceHistoryDisplay";
import AmpDecisionPanel from "./AmpDecisionPanel";

const REPORT_TYPES = [
  { value: "predictive_maintenance", label: "Next service plan", help: "See when service is suggested and why. This does not book a visit." },
  { value: "maintenance_summary", label: "Service history", help: "Review the installation, cleaning and repair work recorded for this AC." },
  { value: "inventory_reliability_analysis", label: "Model and parts history", help: "Review recorded services and parts used for the selected brand at its branch. These are historical counts, not failure predictions.", internalOnly: true },
];
const REPORT_PAGE_LABELS = ["Service plan", "Planning details", "Service records"];
const HISTORY_PAGE_SIZE = 5;
const customerKey = (unit) => String(unit.customerId || unit.customerName || '').trim();
const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
const basisLabel = (value) => ({
  same_unit: "This AC unit's history",
  same_model: "Same model history", same_brand_type: "Similar model type and brand history",
  same_brand: "Same brand history", system_default: "Standard 6-month schedule",
})[String(value || "").toLowerCase()] || "Available service records";
const maintenanceContextItems = (signals = {}, t = (text) => text) => [
  signals.serviceRequestCount ? `${signals.serviceRequestCount} ${t("service request(s) reviewed.")}` : "",
  signals.serviceRequestFrequency?.averageGapDays ? `${t("Typical time between service requests")}: ${signals.serviceRequestFrequency.averageGapDays} ${t("days")}.` : "",
  signals.filterDirtRecordCount ? `${signals.filterDirtRecordCount} ${t("record(s) mentioning a dirty filter.")}` : "",
  signals.coilDirtRecordCount ? `${signals.coilDirtRecordCount} ${t("record(s) mentioning a dirty coil.")}` : "",
  signals.deepCleaningRecordCount ? `${signals.deepCleaningRecordCount} ${t("completed deep cleaning(s).")}` : "",
  signals.coilMaintenanceRecordCount ? `${signals.coilMaintenanceRecordCount} ${t("completed coil cleaning(s).")}` : "",
  ...(signals.recurringProblems || []).map(item => `${item.count} ${t("record(s) of the same")} ${item.label} ${t("concern.")}`),
  signals.refrigerantIssueRecordCount ? `${signals.refrigerantIssueRecordCount} ${t("refrigerant-related record(s). These are not counted as cleaning visits.")}` : "",
].filter(Boolean);
const reviewStatusLabel = (value) => ({
  ready_for_review: "Service outcome ready to review",
  awaiting_visit: "Awaiting a completed cleaning visit",
  no_matched_visit: "Replaced by a newer plan before a matching visit",
})[value] || "Saved plan";
const readableToken = (value, fallback = "Not assessed") => String(value || fallback).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function AmpReportCenter({
  units = [],
  unitsLoading = false,
  initialUnitId = "",
  onPlanGenerated,
  title = "AC care reports",
  subtitle = "Choose an AC and the information you need. Start with its next service or review past work.",
}) {
  const { user, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const customerCopy = (value) => user?.role === "customer" ? customerSystemMessage(value) : value;
  const reportUnits = useMemo(() => units.filter((unit) => unit?.unitId || unit?.id), [units]);
  const types = useMemo(() => REPORT_TYPES.filter((item) => !item.internalOnly || ["admin", "superadmin", "owner", "manager"].includes(user?.role)), [user?.role]);
  const [reportType, setReportType] = useState("predictive_maintenance");
  const [unitId, setUnitId] = useState(initialUnitId);
  const [customerFilter, setCustomerFilter] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [report, setReport] = useState(null);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportPage, setReportPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const reportResultRef = useRef(null);
  const canChooseCustomer = ["admin", "superadmin", "owner", "manager"].includes(user?.role);
  const customerOptions = useMemo(() => {
    const options = new Map();
    reportUnits.forEach((unit) => {
      const key = customerKey(unit);
      if (key && !options.has(key)) options.set(key, { key, name: String(unit.customerName || 'Customer name not recorded').trim() });
    });
    const names = [...options.values()].map((item) => item.name);
    return [...options.values()].map((item) => ({ ...item, label: names.filter((name) => name === item.name).length > 1 ? `${item.name} · ${item.key.slice(-6)}` : item.name }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [reportUnits]);
  const selectableUnits = useMemo(() => reportUnits.filter((unit) => {
    if (customerFilter && customerKey(unit) !== customerFilter) return false;
    const text = `${unit.modelName || unit.model || ""} ${unit.serialNumber || ""} ${unit.customerName || ""}`.toLowerCase();
    return !unitSearch.trim() || text.includes(unitSearch.trim().toLowerCase()) || String(unit.unitId || unit.id) === unitId;
  }), [reportUnits, customerFilter, unitSearch, unitId]);
  useEffect(() => { setReport(null); setProvider(""); setError(""); setReportPage(0); setHistoryPage(0); }, [unitId, reportType]);
  useEffect(() => {
    if (unitId && !reportUnits.some((unit) => String(unit.unitId || unit.id) === unitId)) setUnitId("");
  }, [reportUnits, unitId]);
  useEffect(() => {
    const selected = reportUnits.find((unit) => String(unit.unitId || unit.id) === unitId);
    if (selected && customerKey(selected) !== customerFilter) setCustomerFilter(customerKey(selected));
  }, [reportUnits, unitId, customerFilter]);

  const generate = async () => {
    if (!unitId) return setError("Select an installed AC unit first.");
    if (!reportUnits.some((unit) => String(unit.unitId || unit.id) === unitId && (!customerFilter || customerKey(unit) === customerFilter))) return setError("Select an AC unit belonging to the selected customer.");
    setLoading(true); setError(""); setReport(null); setHistoryPage(0);
    try {
      const result = await apiRequest("/ai/amp-report", { method: "POST", body: JSON.stringify({ reportType, unitId }) });
      const next = result.report;
      // Keep staff analysis and saved evidence intact; simplify the customer view and its PDF only.
      setReport(next && user?.role === "customer" ? {
        ...next,
        explanationWarning: customerCopy(next.explanationWarning),
        maintenance: { ...next.maintenance,
          recommendationBasis: customerCopy(next.maintenance?.recommendationBasis),
          interpretation: customerCopy(next.maintenance?.interpretation),
          routineMaintenance: { ...next.maintenance?.routineMaintenance, recommendationBasis: customerCopy(next.maintenance?.routineMaintenance?.recommendationBasis) },
          latestVisitAnalysis: { ...next.maintenance?.latestVisitAnalysis, customerSummary: customerCopy(next.maintenance?.latestVisitAnalysis?.customerSummary) },
          dataQuality: { ...next.maintenance?.dataQuality, message: customerCopy(next.maintenance?.dataQuality?.message) },
        },
        serviceHistory: (next.serviceHistory || []).map(item => ({ ...item,
          evidence: item.evidence ? { ...item.evidence, reason: customerCopy(item.evidence.reason) } : item.evidence,
        })),
      } : next || null); setProvider(result.provider || "");
      setReportPage(["maintenance_summary", "inventory_reliability_analysis"].includes(reportType) ? 2 : 0);
      if (reportType === "predictive_maintenance" && result.report) onPlanGenerated?.(result.report);
    } catch (requestError) { setReport(null); setError(requestError.message || "We could not prepare your report. Please try again."); }
    finally { setLoading(false); }
  };

  const exportPdf = () => {
    if (!report) return;
    const m = report.maintenance || {};
    const pattern = m.patternAnalysis || {};
    const visit = m.latestVisitAnalysis || {};
    const condition = m.conditionBasedFollowUp || null;
    const routine = m.routineMaintenance || {};
    const assessment = m.predictiveAssessment || {};
    const contextItems = maintenanceContextItems(m.maintenanceSignals, t);
    const historyEntries = (report.serviceHistory || []).map((item) => `<article class="history-entry"><div class="history-entry-header"><strong>${escapeHtml(dateLabel(item.date))}</strong><span>${escapeHtml(item.serviceLabel || serviceLabel(item.type))}</span></div><div class="report-grid"><div class="report-field"><span>${t("Technician findings")}</span><strong>${escapeHtml(item.findings || t("Not recorded"))}</strong></div><div class="report-field"><span>${t("Work completed")}</span><strong>${escapeHtml(item.actionTaken || t("Not recorded"))}</strong></div><div class="report-field"><span>${t("Parts used")}</span><strong>${escapeHtml((item.partsUsed || []).join(", ") || t("None recorded"))}</strong></div></div>${item.evidence?.eligible === false ? `<p class="report-callout">${escapeHtml(item.evidence.reason)}</p>` : ""}${item.aiInterpretation?.customerSummary ? `<p class="report-callout"><strong>${t("Follow-up recommendation")}:</strong> ${escapeHtml(item.aiInterpretation.customerSummary)}</p>` : ""}</article>`).join("") || `<p>${t("No service history has been recorded.")}</p>`;
    const modelRows = (report.aggregateReliability?.modelsByRecordedService || []).map((item) => `<tr><td>${escapeHtml(item.model)}</td><td>${escapeHtml(item.count)}</td></tr>`).join("");
    const html = `
      <div class="summary">
        <div class="summary-item"><strong>${escapeHtml(dateLabel(m.bestServicedBy))}</strong><span>${t(condition ? "Condition follow-up date" : "Suggested servicing date")}</span></div>
        <div class="summary-item"><strong>${escapeHtml(m.recommendedServiceLabel || serviceLabel(m.recommendedService))}</strong><span>${t("Recommended service")}</span></div>
        <div class="summary-item"><strong>${escapeHtml(t(capacityAssessmentLabel(m.capacityAssessment?.status)))}</strong><span>${t("Room size vs HP")}</span></div>
      </div>
      <section class="report-section report-section--accent">
        <div class="report-section-heading">${t("Recommended service plan")}</div>
        <div class="report-grid">
          <div class="report-field"><span>${t("Priority")}</span><strong>${escapeHtml(assessment.priority || t("Routine"))}</strong></div>
          <div class="report-field"><span>${t("Current status")}</span><strong>${escapeHtml(assessment.currentStatus || t("Not recorded"))}</strong></div>
        </div>
        <h3>${t("Summary")}</h3><p>${escapeHtml(assessment.assessmentSummary || m.aiAssessment || visit.aiAssessment || t("More completed service details are needed before a recommendation can be shown."))}</p>
        <h3>${t("Why this date was suggested")}</h3><p>${escapeHtml(m.whyThisDate || visit.whyThisDate || m.recommendationBasis || t("A completed cleaning or installation date is needed."))}</p>
      </section>
      <section class="report-section">
        <div class="report-section-heading">${t("Technician record and follow-up")}</div>
        <div class="report-subsection"><h2>${t("Technician notes")}</h2><p>${escapeHtml(assessment.technicianRecorded || t("Not recorded"))}</p></div>
        ${assessment.previousVisitHistory?.length ? `<div class="report-subsection"><h3>${t("Earlier service history")}</h3><ul>${assessment.previousVisitHistory.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
        <div class="report-subsection"><h3>${t("Issues to follow up")}</h3>${assessment.currentIssues?.length ? `<ul>${assessment.currentIssues.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p>${t("No unresolved issue is recorded in the latest visit.")}</p>`}</div>
        ${assessment.completedWork?.length ? `<div class="report-subsection"><h3>${t("Work already completed")}</h3><ul>${assessment.completedWork.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
        <div class="report-subsection"><h3>${t("Part to check")}</h3><p>${escapeHtml(assessment.recommendedPart || t("No part is suggested from the available records."))}</p></div>
        ${assessment.recommendedActions?.length ? `<div class="report-subsection"><h3>${t("Next steps")}</h3><ol>${assessment.recommendedActions.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol></div>` : ""}
      </section>
      ${condition ? `<section class="report-section report-section--muted"><div class="report-section-heading">${t("Separate routine cleaning plan")}</div><div class="report-grid"><div class="report-field"><span>${t("Routine cleaning date")}</span><strong>${escapeHtml(dateLabel(routine.bestServicedBy))}</strong></div><div class="report-field"><span>${t("Routine service")}</span><strong>${escapeHtml(serviceLabel(routine.recommendedService))}</strong></div></div><p>${escapeHtml(routine.recommendationBasis || "")}</p><p class="meta">${t("The earlier condition follow-up is shown first and does not erase the routine cleaning plan.")}</p></section>` : ""}
      <section class="report-section">
        <div class="report-section-heading">${t("Information reviewed")}</div>
        ${assessment.factorsConsidered?.length ? `<div class="report-subsection"><h2>${t("Service and unit factors")}</h2><ul>${assessment.factorsConsidered.map(item => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</li>`).join("")}</ul></div>` : ""}
        ${assessment.observationsConsidered?.length ? `<div class="report-subsection"><h3>${t("Technician and customer notes")}</h3><ul>${assessment.observationsConsidered.map(item => `<li><strong>${escapeHtml(item.source)}:</strong> ${escapeHtml(item.value)}</li>`).join("")}</ul></div>` : ""}
        <div class="report-grid">
          <div class="report-field"><span>${t("Based on")}</span><strong>${escapeHtml(t(basisLabel(pattern.source || m.historicalBasis?.level)))}</strong></div>
          <div class="report-field"><span>${t("Completed cleaning intervals")}</span><strong>${escapeHtml(pattern.intervalCount ?? m.historicalBasis?.sampleSize ?? 0)}</strong></div>
          <div class="report-field"><span>${t("Typical time between cleanings")}</span><strong>${escapeHtml(pattern.averageIntervalDays ? `${pattern.averageIntervalDays} ${t("days")}` : t("6-month starting schedule"))}</strong></div>
          <div class="report-field"><span>${t("Maintenance recommendation")}</span><strong>${escapeHtml(m.recommendedServiceLabel || serviceLabel(m.recommendedService))}</strong></div>
        </div>
        ${pattern.intervalsDays?.length ? `<p><strong>${t("Time between completed cleanings")}:</strong> ${escapeHtml(pattern.intervalsDays.join(", "))} ${t("days")}</p>` : ""}
        ${contextItems.length ? `<ul>${contextItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        ${m.dataQuality?.message ? `<p class="report-callout"><strong>${t("Record review needed")}:</strong> ${escapeHtml(m.dataQuality.message)}</p>` : ""}
      </section>
      <section class="report-section report-section--muted">
        <div class="report-section-heading">${t("AC and coverage details")}</div>
        <div class="report-grid">
          <div class="report-field"><span>${t("AC unit ID")}</span><strong>${escapeHtml(report.unit?.unitId || t("Not recorded"))}</strong></div>
          <div class="report-field"><span>${t("Serial number")}</span><strong>${escapeHtml(report.unit?.serialNumber || t("Not recorded"))}</strong></div>
          <div class="report-field"><span>${t("Brand")}</span><strong>${escapeHtml(report.unit?.brand || t("Not recorded"))}</strong></div>
          <div class="report-field"><span>${t("Model")}</span><strong>${escapeHtml(report.unit?.model || t("Not recorded"))}</strong></div>
          <div class="report-field"><span>${t("Last service")}</span><strong>${escapeHtml(dateLabel(m.lastServiceDate))}</strong></div>
          <div class="report-field"><span>${t("Last cleaning")}</span><strong>${escapeHtml(dateLabel(m.lastCleaningDate))}</strong></div>
          <div class="report-field"><span>${t("Room size")}</span><strong>${escapeHtml(report.unit?.roomSizeSqm ? `${report.unit.roomSizeSqm} sq m` : t("Not recorded"))}</strong></div>
          <div class="report-field"><span>${t("AC horsepower")}</span><strong>${escapeHtml(report.unit?.capacityHp ? `${report.unit.capacityHp} HP` : t("Not recorded"))}</strong></div>
          <div class="report-field"><span>${t("Warranty status")}</span><strong>${escapeHtml(String(report.unit?.warrantyStatus || t("Not recorded")).replaceAll("_", " "))}</strong></div>
          <div class="report-field"><span>${t("Responsible branch")}</span><strong>${escapeHtml(report.branch || t("Not recorded"))}</strong></div>
        </div>
        <p class="report-callout"><strong>${t("Room and AC size")}:</strong> ${escapeHtml(m.capacityAssessment?.summary || t("Room size has not been supplied."))}</p>
      </section>
      <section class="report-section report-section--splittable">
        <div class="report-section-heading">${t("Recorded service history")}</div>
        <div class="history-list">${historyEntries}</div>
      </section>
      ${report.aggregateReliability ? `<section class="report-section report-section--splittable"><div class="report-section-heading">${t("Model and parts history")}</div><p>${escapeHtml(report.aggregateReliability.note)}</p><div class="report-grid"><div class="report-field"><span>${t("Group")}</span><strong>${escapeHtml(report.aggregateReliability.scope)}</strong></div><div class="report-field"><span>${t("Units")}</span><strong>${escapeHtml(report.aggregateReliability.unitCount)}</strong></div><div class="report-field"><span>${t("Completed services")}</span><strong>${escapeHtml(report.aggregateReliability.recordedServiceCount)}</strong></div></div><table><thead><tr><th>${t("Model")}</th><th>${t("Completed services")}</th></tr></thead><tbody>${modelRows}</tbody></table><h3>${t("Parts used in past services")}</h3><ul>${(report.aggregateReliability.partsByRecordedUse || []).map((item) => `<li>${escapeHtml(item.component)}: ${escapeHtml(item.count)} ${t("recorded use(s)")}</li>`).join("") || `<li>${t("No recorded major-part use.")}</li>`}</ul></section>` : ""}
      <p class="meta">${escapeHtml(report.note || "")}</p>`;
    exportHtmlToPdfViaPrint({
      title: t(report.reportLabel || report.title),
      subtitle: `AC: ${report.unit?.brand || ""} ${report.unit?.model || ""} - ${t("Serial")}: ${report.unit?.serialNumber || t("Not recorded")}`,
      fileName: report.fileNameBase, html,
      metadata: {
        reportId: report.reportId, branch: report.branch, reportType: report.reportLabel,
        generatedAt: new Date(report.generatedAt).toLocaleString(), systemName: report.systemName, watermark: report.watermark,
        pageOrientation: "portrait", documentStyle: "narrative",
        representative: user?.role === "customer" ? "" : user?.name || t("AEROPULSE Staff"),
        representativeRole: t(user?.role === "superadmin" ? "Super Admin - Authorized Representative" : "Branch Representative"),
      },
    });
  };

  const maintenance = report?.maintenance || {};
  const pattern = maintenance.patternAnalysis || {};
  const signals = maintenance.maintenanceSignals || {};
  const visitAnalysis = maintenance.latestVisitAnalysis || {};
  const conditionFollowUp = maintenance.conditionBasedFollowUp || null;
  const routineMaintenance = maintenance.routineMaintenance || {};
  const assessment = maintenance.predictiveAssessment || {};
  const contextItems = maintenanceContextItems(signals, t);
  const historyFirst = ["maintenance_summary", "summary_report"].includes(report?.reportType || reportType);
  const reportLabel = REPORT_TYPES.find(item => item.value === (report?.reportType || reportType))?.label;
  const serviceHistory = report?.serviceHistory || [];
  const historyPageCount = Math.max(1, Math.ceil(serviceHistory.length / HISTORY_PAGE_SIZE));
  const visibleServiceHistory = serviceHistory.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE);
  const selectReportPage = (nextPage) => {
    setReportPage(nextPage);
    const scrollToReport = () => reportResultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(scrollToReport);
    else scrollToReport();
  };
  return (
    <section className="amp-card amp-report-center">
      <div className="amp-card-header amp-report-center-header">
        <div className="amp-section-title">
          <span className="amp-section-icon"><FileText size={24} weight="duotone" aria-hidden="true" /></span>
          <div><h2>{t(title)}</h2><p className="amp-muted">{t(subtitle)}</p></div>
        </div>
        {report ? <button type="button" className="amp-export-button" onClick={exportPdf}><DownloadSimple size={18} weight="bold" aria-hidden="true" /> {t("Export PDF")}</button> : null}
      </div>
      <div className="amp-report-controls" aria-label={t('Report generator')}>
        <label><span><i aria-hidden="true">1</i>{t("Report type")}</span><select aria-label={t("Report type")} disabled={loading} value={reportType} onChange={(event) => setReportType(event.target.value)}>{types.map((item) => <option key={item.value} value={item.value}>{t(item.label)}</option>)}</select></label>
        {canChooseCustomer ? <label><span>{t("Customer name")}</span><select aria-label={t("Customer name")} disabled={loading || unitsLoading} value={customerFilter} onChange={(event) => { setUnitId(""); setUnitSearch(""); setCustomerFilter(event.target.value); }}><option value="">{t("All customers")}</option>{customerOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label> : null}
        {reportUnits.length > 10 ? <label><span>{t("Find installed AC unit")}</span><input type="search" aria-label={t("Find installed AC unit")} value={unitSearch} onChange={(event) => setUnitSearch(event.target.value)} placeholder={t("Model or serial number")} /></label> : null}
        <label><span><i aria-hidden="true">2</i>{t("Installed AC unit")}</span><select aria-label={t("Installed AC unit")} disabled={loading || unitsLoading} value={unitId} onChange={(event) => setUnitId(event.target.value)}><option value="">{t(unitsLoading ? "Loading installed AC units…" : "Select a unit")}</option>{selectableUnits.map((unit) => { const value = unit.unitId || unit.id; return <option key={value} value={value}>{canChooseCustomer && !customerFilter ? `${unit.customerName || t("Customer name not recorded")} · ` : ""}{unit.modelName || unit.model || t("AC Unit")} · {unit.serialNumber || value}</option>; })}</select></label>
        <button type="button" className="amp-generate-button" onClick={generate} disabled={loading || unitsLoading || !reportUnits.length}><FileText size={18} weight="bold" aria-hidden="true" />{t(loading ? "Preparing report…" : "View report")}</button>
      </div>
      <p className="amp-report-help"><CheckCircle size={17} weight="fill" aria-hidden="true" />{t(types.find(item => item.value === reportType)?.help)}</p>
      {unitsLoading ? <p className="amp-muted" role="status">{t("Loading installed AC units…")}</p> : !reportUnits.length ? <p className="amp-empty">{t("No installed AC units are available here yet.")}</p> : null}
      {error ? <p className="amp-error">{t(error)}</p> : null}
      {unitId && ["admin", "superadmin"].includes(user?.role) ? <AmpDecisionPanel key={unitId} unitId={unitId} /> : null}
      {report ? <div className="amp-report-result" ref={reportResultRef}>
        <div className="amp-report-result-heading"><div><h3>{t(reportLabel || report.title)}</h3></div><div className="amp-report-meta"><span>{t("Branch")}: {report.branch}</span><span>{t(conditionFollowUp ? "Based on the technician report" : maintenance.predictionSource === "openai" ? "Suggested from service history" : provider === "openai" && maintenance.interpretation ? "Based on service records" : "Based on service records")}</span></div></div>
        {report.explanationWarning ? <p role="status" className="amp-muted amp-report-notice">{report.explanationWarning}</p> : null}
        <div className="amp-report-page-heading" aria-live="polite"><div><span>{t("Report section")}</span><strong>{t(REPORT_PAGE_LABELS[reportPage])}</strong></div><span>{t("Page")} {reportPage + 1} {t("of")} {REPORT_PAGE_LABELS.length}</span></div>
        <div className="amp-report-page-content">
          {reportPage === 0 ? <>
            {!historyFirst ? <div className="amp-metrics"><article><span>{t(conditionFollowUp ? "Condition follow-up date" : "Suggested servicing date")}</span><strong>{dateLabel(maintenance.bestServicedBy)}</strong></article><article><span>{t("Recommended service")}</span><strong>{maintenance.recommendedServiceLabel || serviceLabel(maintenance.recommendedService)}</strong></article><article><span>{t("Room and AC size match")}</span><strong>{t(capacityAssessmentLabel(maintenance.capacityAssessment?.status))}</strong></article></div> : null}
            <details className="amp-details" open>
              <summary>{t("Suggested service plan")}</summary>
              <div className="amp-metrics"><article><span>{t("Priority")}</span><strong>{assessment.priority || t("Routine")}</strong></article><article><span>{t("Recommended schedule")}</span><strong>{dateLabel(assessment.recommendedServicingDate || maintenance.bestServicedBy)}</strong></article><article><span>{t("Recommended service")}</span><strong>{maintenance.recommendedServiceLabel || serviceLabel(assessment.recommendedService || maintenance.recommendedService)}</strong></article></div>
              <h4>{t("Summary")}</h4><p>{assessment.assessmentSummary || maintenance.aiAssessment || visitAnalysis.aiAssessment || t("More completed service details are needed before a recommendation can be shown.")}</p>
              <dl className="amp-factor-list"><div><dt>{t("Current status")}</dt><dd>{assessment.currentStatus || t("Not recorded")}</dd></div><div><dt>{t("Technician notes")}</dt><dd>{assessment.technicianRecorded || t("Not recorded")}</dd></div></dl>
              {assessment.previousVisitHistory?.length ? <><h4>{t("Earlier service history")}</h4><ul>{assessment.previousVisitHistory.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></> : null}
              <h4>{t("Issues to follow up")}</h4>{assessment.currentIssues?.length ? <ul>{assessment.currentIssues.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>{t("No unresolved issue is recorded in the latest visit.")}</p>}
              {assessment.completedWork?.length ? <><h4>{t("Work already completed")}</h4><ul>{assessment.completedWork.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></> : null}
              <h4>{t("Part to check")}</h4><p>{assessment.recommendedPart || t("No part is suggested from the available records.")}</p>
              <p className="amp-muted">{t("This uses only the technician’s submitted findings and the AC records available in AEROPULSE. The original technician report remains unchanged in Service records.")}</p>
            </details>
            <details className="amp-details" open><summary>{t("Why this date was suggested")}</summary><p>{assessment.reasonForRecommendation || maintenance.whyThisDate || visitAnalysis.whyThisDate || maintenance.recommendationBasis || t("A completed cleaning or installation date is needed.")}</p></details>
            {conditionFollowUp ? <details className="amp-details" open><summary>{t("Separate routine cleaning plan")}</summary><div className="amp-metrics"><article><span>{t("Routine cleaning date")}</span><strong>{dateLabel(routineMaintenance.bestServicedBy)}</strong></article><article><span>{t("Routine service")}</span><strong>{serviceLabel(routineMaintenance.recommendedService)}</strong></article><article><span>{t("Routine interval")}</span><strong>{routineMaintenance.intervalDays ? `${routineMaintenance.intervalDays} ${t("days")}` : t("Not available")}</strong></article></div><p>{routineMaintenance.recommendationBasis}</p><p className="amp-muted">{t("The earlier condition follow-up is shown first. It does not erase this routine cleaning plan.")}</p></details> : null}
          </> : null}
          {reportPage === 1 ? <>
            {assessment.factorsConsidered?.length ? <details className="amp-details" open><summary>{t("What was reviewed")}</summary><dl className="amp-factor-list">{assessment.factorsConsidered.map((item) => <div key={`${item.label}-${item.value}`}><dt>{item.label}</dt><dd>{/date/i.test(item.label) ? dateLabel(item.value) : item.value}</dd></div>)}</dl></details> : null}
            {assessment.observationsConsidered?.length ? <details className="amp-details" open><summary>{t("Technician and customer notes")}</summary><ul>{assessment.observationsConsidered.map((item, index) => <li key={`${item.source}-${index}`}><strong>{item.source}:</strong> {item.value}</li>)}</ul><p className="amp-muted">{t("A technician must confirm issues reported by the customer.")}</p></details> : null}
            {assessment.recommendedActions?.length ? <details className="amp-details" open><summary>{t("Next steps")}</summary><ol>{assessment.recommendedActions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol><p className="amp-muted">{assessment.evidenceNotice}</p></details> : null}
            {maintenance.dataQuality?.message ? <p role="status" className="amp-error">{t("Record review needed")}: {maintenance.dataQuality.message}</p> : null}
            <p className="amp-muted">{t("Last completed service")}: {dateLabel(maintenance.lastServiceDate)} · {t("Last recorded cleaning")}: {dateLabel(maintenance.lastCleaningDate)}</p>
            {report.predictionReview ? <details className="amp-details amp-prediction-review" open={report.predictionReview.entries?.some((entry) => entry.status === "ready_for_review")}>
              <summary>{t("Compare past plans with completed service")}</summary><p>{report.predictionReview.note}</p>
              {report.predictionReview.entries?.length ? <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>{t("Saved plan")}</th><th>{t("Information used")}</th><th>{t("Completed service")}</th></tr></thead><tbody>{report.predictionReview.entries.map((entry) => <tr key={entry.id}>
                <td><strong>{dateLabel(entry.suggestedDate)}</strong><span>{serviceLabel(entry.recommendedService)}</span><span className="amp-review-status">{t(reviewStatusLabel(entry.status))}</span></td>
                <td><strong>{t(basisLabel(entry.basisLevel))}</strong><span>{entry.sampleSize} {t(entry.sampleSize === 1 ? "completed cleaning interval" : "completed cleaning intervals")} · {entry.comparableUnitCount} {t(entry.comparableUnitCount === 1 ? "similar unit" : "similar units")}</span>{entry.excludedRecordCount ? <span>{entry.excludedRecordCount} {t(entry.excludedRecordCount === 1 ? "incomplete record not used" : "incomplete records not used")}</span> : null}</td>
                <td>{entry.outcome ? <><strong>{dateLabel(entry.outcome.serviceDate)} · {entry.outcome.serviceLabel}</strong><span>{entry.outcome.daysFromSuggestedDate === 0 ? t("Completed on the suggested date") : `${Math.abs(entry.outcome.daysFromSuggestedDate)} ${t(Math.abs(entry.outcome.daysFromSuggestedDate) === 1 ? "day" : "days")} ${t(entry.outcome.daysFromSuggestedDate > 0 ? "after" : "before")} ${t("the suggested date")}`}</span><span>{t("Findings")}: {entry.outcome.findings || t("Not recorded")}</span><span>{t("Work")}: {entry.outcome.actionTaken || t("Not recorded")}</span></> : <span>{t("No completed cleaning has been matched to this saved plan.")}</span>}</td>
              </tr>)}</tbody></table></div> : <p className="amp-empty">{t("No saved plan is available for this unit yet. View a Next service plan before the visit to save one.")}</p>}
            </details> : null}
            {report.predictionReviewWarning ? <p role="status" className="amp-error">{report.predictionReviewWarning}</p> : null}
            {!assessment.factorsConsidered?.length && !assessment.observationsConsidered?.length && !assessment.recommendedActions?.length && !report.predictionReview ? <p className="amp-empty">{t("No additional planning details are available for this report.")}</p> : null}
          </> : null}
          {reportPage === 2 ? <>
            <details className="amp-details" key={`history-${report.reportId}-${reportType}`} open><summary>{t("Recorded service history")}</summary>
              {visibleServiceHistory.length ? <div className="amp-table-wrap"><table className="amp-table amp-history-table"><thead><tr><th>{t("Date")}</th><th>{t("Service performed")}</th><th>{t("Findings and actions")}</th></tr></thead><tbody>{visibleServiceHistory.map((item, index) => <tr key={`${item.date}-${historyPage * HISTORY_PAGE_SIZE + index}`}><td data-label={t("Date")}>{dateLabel(item.date)}</td><td data-label={t("Service performed")}>{item.serviceLabel || serviceLabel(item.type)}</td><td data-label={t("Findings and actions")}>{item.findings || t("Findings not recorded")}<br />{item.actionTaken || t("Actions not recorded")}{item.evidence?.eligible === false ? <p className="amp-error">{item.evidence.reason}</p> : null}{item.aiInterpretation?.customerSummary ? <p><strong>{t("Follow-up recommendation")}:</strong> {item.aiInterpretation.customerSummary}</p> : null}</td></tr>)}</tbody></table></div> : <p className="amp-empty">{t("No service history has been recorded.")}</p>}
              {historyPageCount > 1 ? <nav className="amp-history-pagination" aria-label={t("Service history pages")}><button type="button" onClick={() => setHistoryPage((page) => Math.max(0, page - 1))} disabled={historyPage === 0}>{t("Previous records")}</button><span>{t("Records")} {historyPage * HISTORY_PAGE_SIZE + 1}-{Math.min((historyPage + 1) * HISTORY_PAGE_SIZE, serviceHistory.length)} {t("of")} {serviceHistory.length}</span><button type="button" onClick={() => setHistoryPage((page) => Math.min(historyPageCount - 1, page + 1))} disabled={historyPage === historyPageCount - 1}>{t("Next records")}</button></nav> : null}
            </details>
            {report.aggregateReliability ? <details className="amp-details" open><summary>{t("Model and parts history")}</summary><p>{report.aggregateReliability.scope} · {report.aggregateReliability.unitCount} {t("units")} · {report.aggregateReliability.recordedServiceCount} {t("recorded services")}</p><p>{report.aggregateReliability.note}</p><ul>{(report.aggregateReliability.modelsByRecordedService || []).map(item => <li key={item.model}>{item.model}: {item.count} {t("recorded services")}</li>)}</ul><ul>{(report.aggregateReliability.partsByRecordedUse || []).map(item => <li key={item.component}>{item.component}: {item.count} {t("recorded uses")}</li>)}</ul></details> : null}
            <details className="amp-details"><summary>{t("What was used to choose this date")}</summary>
              <p>{conditionFollowUp ? visitAnalysis.customerSummary : maintenance.recommendationBasis}</p>
              {conditionFollowUp ? <p><strong>{t("Routine cleaning basis")}:</strong> {routineMaintenance.recommendationBasis}</p> : null}
              {historyFirst ? <p>{t("Suggested servicing date")}: {dateLabel(maintenance.bestServicedBy)}</p> : null}
              <div className="amp-metrics"><article><span>{t("Based on")}</span><strong>{t(basisLabel(pattern.source || maintenance.historicalBasis?.level))}</strong></article><article><span>{t("Completed cleaning intervals")}</span><strong>{pattern.intervalCount ?? maintenance.historicalBasis?.sampleSize ?? 0}</strong></article><article><span>{t("Typical time between cleanings")}</span><strong>{pattern.averageIntervalDays ? `${pattern.averageIntervalDays} ${t("days")}` : t("6-month starting schedule")}</strong></article></div>
              {pattern.intervalsDays?.length ? <p>{t("Time between completed cleanings")}: {pattern.intervalsDays.join(", ")} {t("days")}. {t("Repair visits are not included.")}</p> : null}
              {contextItems.length ? <ul>{contextItems.map(item => <li key={item}>{item}</li>)}</ul> : <p>{t("No recurring cleaning-related issue has been recorded for this AC.")}</p>}
              <p>{maintenance.capacityAssessment?.summary}</p>
              <p>{t("The suggested date uses the technician's report and the unit's completed service history. If the unit does not have enough cleaning history, records from similar units or the standard 6-month schedule are used. This is a guide only; it is not a booking and does not change warranty coverage.")}</p>
              <p className="amp-muted">{t("Report reference")}: {report.reportId}</p>
            </details>
            <p className="amp-muted">{report.note}</p>
          </> : null}
        </div>
        <nav className="amp-report-page-navigation" aria-label={t("Report pages")}><button type="button" onClick={() => selectReportPage(Math.max(0, reportPage - 1))} disabled={reportPage === 0}>{t("Previous")}</button><span>{t("Page")} {reportPage + 1} {t("of")} {REPORT_PAGE_LABELS.length}</span><button type="button" onClick={() => selectReportPage(Math.min(REPORT_PAGE_LABELS.length - 1, reportPage + 1))} disabled={reportPage === REPORT_PAGE_LABELS.length - 1}>{t("Next")}</button></nav>
      </div> : null}
    </section>
  );
}

export default AmpReportCenter;
