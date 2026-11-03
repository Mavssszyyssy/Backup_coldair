import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Broom,
  Buildings,
  CalendarCheck,
  CheckCircle,
  ClipboardText,
  ClockCounterClockwise,
  MagnifyingGlass,
  Package,
  Sparkle,
  WarningCircle,
  Wrench,
} from "@phosphor-icons/react";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import useActiveBranches from "../../domain/branches/useActiveBranches";
import AmpDashboardShell from "./AmpDashboardShell";
import AmpReportCenter from "./AmpReportCenter";
import AmpPurposeGuide from "./AmpPurposeGuide";
import { serviceDateLabel } from "../../domain/myunit/serviceHistoryDisplay";
import { ampDueLabel } from "../../domain/ampDueLabel";
import { translateText } from "../../utils/customerI18n";
import "./styles.css";

const SERVICE_WINDOWS = [30, 90, 180, 365];
const UNASSIGNED_BRANCH = "Unassigned";
const PIPELINE_PAGE_SIZE = 10;
const SUMMARY_SERVICE_TYPES = ["inspection", "repair", "regular_cleaning", "deep_cleaning"];
const SUMMARY_SERVICE_ICONS = {
  inspection: MagnifyingGlass,
  repair: Wrench,
  regular_cleaning: Broom,
  deep_cleaning: Sparkle,
};

const humanLabel = (value, fallback) => String(value || fallback || "")
  .trim()
  .toLowerCase()
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const SERVICE_ACTIONS = {
  repair: {
    title: "Review units marked for repair",
    action: "Check the technician's notes, then arrange an inspection before approving repair or replacement work.",
  },
  inspection: {
    title: "Arrange unit inspections",
    action: "Review the reported concern and schedule an inspection before deciding on repair or replacement.",
  },
  deep_cleaning: {
    title: "Prepare deep-cleaning appointments",
    action: "Confirm customer availability and allow enough technician time for each deep cleaning.",
  },
  regular_cleaning: {
    title: "Prepare regular-cleaning appointments",
    action: "Contact the customers and plan regular-cleaning appointments within the selected date range.",
  },
};

const unitWord = (count) => `${count} unit${Number(count) === 1 ? "" : "s"}`;

const safeCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export const buildFollowUpSummary = ({
  branchSummary = [],
  actionSummary = {},
  pagination = {},
  pipeline = [],
  selectedBranch = "all",
  isCompanyWide = false,
} = {}) => {
  const total = safeCount(pagination.total ?? pipeline.length);
  const hasCompletePage = pipeline.length === total;
  const scopedBranchSummary = isCompanyWide && selectedBranch !== "all"
    ? branchSummary.filter((item) => item.branch === selectedBranch)
    : branchSummary;
  const branchDistribution = scopedBranchSummary.length
    ? scopedBranchSummary.map((item) => ({
      branch: item.branch || UNASSIGNED_BRANCH,
      total: safeCount(item.total),
      upcoming: safeCount(item.upcoming),
      overdue: safeCount(item.overdue),
    }))
    : hasCompletePage
      ? Array.from(pipeline.reduce((counts, unit) => {
        const branch = unit.serviceBranch || UNASSIGNED_BRANCH;
        const current = counts.get(branch) || { branch, total: 0, upcoming: 0, overdue: 0 };
        current.total += 1;
        current[unit.overdue ? "overdue" : "upcoming"] += 1;
        counts.set(branch, current);
        return counts;
      }, new Map()).values())
      : [];

  const serviceCounts = new Map(SUMMARY_SERVICE_TYPES.map((serviceType) => [serviceType, 0]));
  const serviceDemand = actionSummary.serviceDemand?.length
    ? actionSummary.serviceDemand
    : hasCompletePage
      ? pipeline.map((unit) => ({ serviceType: unit.recommendedService, count: 1 }))
      : [];
  serviceDemand.forEach((item) => {
    const serviceType = SUMMARY_SERVICE_TYPES.includes(item.serviceType) ? item.serviceType : "inspection";
    serviceCounts.set(serviceType, serviceCounts.get(serviceType) + safeCount(item.count));
  });
  const services = SUMMARY_SERVICE_TYPES.map((serviceType) => ({
    serviceType,
    label: humanLabel(serviceType),
    count: serviceCounts.get(serviceType),
  }));
  const overdue = branchDistribution.reduce((sum, item) => sum + item.overdue, 0);
  const upcoming = branchDistribution.reduce((sum, item) => sum + item.upcoming, 0);
  const branchTotal = branchDistribution.reduce((sum, item) => sum + item.total, 0);
  const serviceTotal = services.reduce((sum, item) => sum + item.count, 0);

  return {
    total,
    overdue,
    upcoming,
    services,
    branchDistribution,
    serviceTotal,
    branchTotal,
    isReconciled: overdue + upcoming === total && serviceTotal === total && branchTotal === total,
  };
};

export const buildManagementActions = ({ summary = {}, actionSummary = {}, serviceWindow = 30 } = {}) => {
  const total = Number(summary.total || 0);
  const overdue = Number(summary.overdue || 0);
  const upcoming = Number(summary.upcoming || 0);
  if (total === 0) return [{
    level: "monitor",
    title: "No follow-up needed right now",
    sections: [{ label: "Current list", value: `No units have a suggested service date within the next ${serviceWindow} days.` }],
  }];

  const actions = [overdue > 0 ? {
    level: "urgent",
    title: "Contact overdue customers first",
    sections: [{ label: "What to do", value: `${unitWord(overdue)} passed the suggested service date. Review each unit's notes, then contact the customer to arrange the next step.` }],
  } : {
    level: "upcoming",
    title: "Prepare upcoming customer follow-ups",
    sections: [{ label: "What to do", value: `${unitWord(upcoming)} ${upcoming === 1 ? "is" : "are"} due within the next ${serviceWindow} days. Review the unit notes before arranging service.` }],
  }];

  (actionSummary.serviceDemand || []).forEach((demand) => {
    const definition = SERVICE_ACTIONS[demand.serviceType];
    const count = Number(demand.count || 0);
    if (!definition || count < 1) return;
    actions.push({
      level: demand.overdue > 0 ? "urgent" : "service",
      title: definition.title,
      sections: [
        { label: "Units", value: `${unitWord(count)} ${count === 1 ? "is" : "are"} marked for ${humanLabel(demand.serviceType).toLowerCase()}${demand.overdue > 0 ? `; ${unitWord(demand.overdue)} ${Number(demand.overdue) === 1 ? "is" : "are"} overdue` : ""}.` },
        { label: "Next step", value: definition.action },
      ],
    });
  });

  const priorityUnits = actionSummary.priorityUnits?.length
    ? actionSummary.priorityUnits
    : actionSummary.earliestDueUnit ? [actionSummary.earliestDueUnit] : [];
  priorityUnits.slice(0, 3).forEach((unit) => {
    if (!unit?.bestServicedBy) return;
    const sections = [
      { label: "Unit and customer", value: `${unit.customerName || "Recorded customer"} · ${unit.serialNumber || "Serial number not recorded"}` },
      unit.currentStatus ? { label: "Current status", value: humanLabel(unit.currentStatus) } : null,
      unit.assessment ? { label: "What the records suggest", value: unit.assessment } : null,
      unit.technicianRecorded ? { label: "Technician notes", value: unit.technicianRecorded } : null,
      unit.previousVisitHistory?.length ? { label: "Earlier service history", value: unit.previousVisitHistory } : null,
      unit.currentIssues?.length ? { label: "Issues to follow up", value: unit.currentIssues } : { label: "Issues to follow up", value: unit.affectedComponent ? `The recorded ${humanLabel(unit.affectedComponent).toLowerCase()} concern requires follow-up.` : "No unresolved issue is recorded in the latest visit." },
      unit.completedWork?.length ? { label: "Work already completed", value: unit.completedWork } : unit.workCompleted ? { label: "Work already completed", value: unit.workCompleted } : null,
      unit.customerObservation ? { label: "Customer observation", value: unit.customerObservation } : null,
      (unit.affectedComponent || unit.severity) ? { label: "Follow-up details", value: [unit.affectedComponent ? `Part noted: ${humanLabel(unit.affectedComponent)}.` : "", unit.severity ? `Priority: ${humanLabel(unit.severity)}.` : ""].filter(Boolean).join(" ") } : null,
      { label: "Next step", value: unit.recommendedActions?.length ? unit.recommendedActions : ["Open the service plan to review the notes and next steps."] },
      unit.recommendedPart ? { label: "Recommended part", value: unit.recommendedPart } : null,
      { label: "Next possible visit", value: `${humanLabel(unit.recommendedService, "inspection")} by ${serviceDateLabel(unit.nextPossibleVisit || unit.bestServicedBy)}.` },
      unit.reason ? { label: "Why this date", value: unit.reason } : null,
    ].filter(Boolean);
    actions.push({
      level: unit.severity && ["urgent", "critical"].includes(unit.severity) ? "urgent" : "next",
      title: `Review ${unit.modelName || "AC Unit"}`,
      unitId: unit.unitId,
      modelName: unit.modelName,
      customerName: unit.customerName,
      serialNumber: unit.serialNumber,
      suggestedDate: unit.nextPossibleVisit || unit.bestServicedBy,
      sections,
    });
  });
  return actions;
};

function FollowUpSummary({ summary, loading, error, serviceWindow, selectedBranch, isCompanyWide, onSelectBranch, t = (value) => value }) {
  const contextLabel = isCompanyWide && selectedBranch === "all" ? t("All branches") : selectedBranch === "all" ? t("My branch") : selectedBranch;
  const value = (count) => loading ? "…" : error ? t("Unavailable") : count;
  const overduePercentage = summary.total ? Math.round((summary.overdue / summary.total) * 100) : 0;
  const upcomingPercentage = summary.total ? Math.max(0, 100 - overduePercentage) : 0;
  const maximumBranchTotal = Math.max(1, ...summary.branchDistribution.map((item) => item.total));

  return (
    <section className="amp-card amp-follow-up-summary" aria-labelledby="amp-follow-up-summary-title">
      <div className="amp-summary-heading">
        <div className="amp-summary-title-group">
          <span className="amp-summary-title-icon"><ClipboardText size={24} weight="duotone" aria-hidden="true" /></span>
          <div>
            <span className="amp-summary-eyebrow">{t("Selected view")}</span>
            <h2 id="amp-follow-up-summary-title">{t("Units needing attention")}</h2>
            <p>{t("See the units that need attention for the selected branch and date range.")}</p>
          </div>
        </div>
        <div className="amp-summary-context" aria-label={t('Active summary filters')}>
          <span><Buildings size={14} weight="bold" aria-hidden="true" />{contextLabel}</span>
          <span><CalendarCheck size={14} weight="bold" aria-hidden="true" />{t("Next")} {serviceWindow} {t("days")}</span>
        </div>
      </div>

      <div className="amp-summary-primary" aria-label={t('Follow-up status')}>
        <a className="amp-summary-total-card" href="#amp-follow-up-units">
          <span className="amp-summary-total-icon"><ClipboardText size={27} weight="duotone" aria-hidden="true" /></span>
          <div>
            <span>{t("Total units needing follow-up")}</span>
            <strong>{value(summary.total)}</strong>
            <small>{t("For the selected branch and date range")}</small>
          </div>
          <ArrowRight className="amp-summary-card-arrow" size={20} weight="bold" aria-hidden="true" />
        </a>
        <div className="amp-summary-status-card">
          <div className="amp-summary-panel-heading">
            <div><span className="amp-summary-panel-icon"><CalendarCheck size={17} weight="duotone" aria-hidden="true" /></span><h3>{t("Follow-up timing")}</h3></div>
            <span>{summary.total} {t("accounted for")}</span>
          </div>
          <div className="amp-summary-status-grid">
            <a className="amp-summary-status overdue" href="#amp-follow-up-units">
              <span className="amp-summary-status-icon"><WarningCircle size={20} weight="fill" aria-hidden="true" /></span>
              <div><span>{t("Overdue")}</span><strong>{value(summary.overdue)}</strong><small>{t("prioritize first")}</small></div>
            </a>
            <a className="amp-summary-status upcoming" href="#amp-follow-up-units">
              <span className="amp-summary-status-icon"><CalendarCheck size={20} weight="fill" aria-hidden="true" /></span>
              <div><span>{t("Upcoming")}</span><strong>{value(summary.upcoming)}</strong><small>{t("inside this window")}</small></div>
            </a>
          </div>
          {!loading && !error ? (
            <div className="amp-summary-status-track" aria-label={`${overduePercentage}% overdue and ${upcomingPercentage}% upcoming`}>
              <span className="overdue" style={{ width: `${overduePercentage}%` }} />
              <span className="upcoming" style={{ width: `${upcomingPercentage}%` }} />
            </div>
          ) : null}
        </div>
      </div>

      {!loading && !error && summary.isReconciled ? (
        <div className="amp-summary-breakdowns">
          <section className="amp-summary-panel" aria-labelledby="amp-service-breakdown-title">
            <div className="amp-summary-panel-heading">
              <div><span className="amp-summary-panel-icon"><Wrench size={17} weight="duotone" aria-hidden="true" /></span><h3 id="amp-service-breakdown-title">{t("Recommended service")}</h3></div>
              <span>{summary.serviceTotal} {t("units")}</span>
            </div>
            <div className="amp-service-summary-grid">
              {summary.services.map((service) => {
                const ServiceIcon = SUMMARY_SERVICE_ICONS[service.serviceType];
                const servicePercentage = summary.serviceTotal ? Math.round((service.count / summary.serviceTotal) * 100) : 0;
                return (
                  <a className={`amp-service-summary ${service.serviceType}`} href="#amp-follow-up-units" key={service.serviceType}>
                    <span className="amp-service-summary-icon"><ServiceIcon size={18} weight="duotone" aria-hidden="true" /></span>
                    <span className="amp-service-summary-copy"><span>{t(service.label)}</span><small>{servicePercentage}% {t("of follow-ups")}</small></span>
                    <strong>{service.count}</strong>
                    <i aria-hidden="true"><i style={{ width: `${servicePercentage}%` }} /></i>
                  </a>
                );
              })}
            </div>
          </section>

          <section className="amp-summary-panel" aria-labelledby="amp-branch-distribution-title">
            <div className="amp-summary-panel-heading">
              <div><span className="amp-summary-panel-icon"><Buildings size={17} weight="duotone" aria-hidden="true" /></span><h3 id="amp-branch-distribution-title">{t("Branch distribution")}</h3></div>
              <span>{summary.branchTotal} {t("units")}</span>
            </div>
            <div className="amp-branch-distribution">
              {summary.branchDistribution.map((item) => isCompanyWide ? (
                <button type="button" key={item.branch} onClick={() => onSelectBranch(item.branch)} aria-label={`Filter follow-up units to ${item.branch}`} style={{ "--amp-branch-load": `${Math.round((item.total / maximumBranchTotal) * 100)}%` }}>
                  <span><Buildings size={15} weight="duotone" aria-hidden="true" />{item.branch}</span>
                  <strong>{item.total}</strong>
                  <small>{item.upcoming} {t("upcoming")} · {item.overdue} {t("overdue")}</small>
                  <i aria-hidden="true"><i /></i>
                </button>
              ) : (
                <div key={item.branch} style={{ "--amp-branch-load": `${Math.round((item.total / maximumBranchTotal) * 100)}%` }}>
                  <span><Buildings size={15} weight="duotone" aria-hidden="true" />{item.branch}</span>
                  <strong>{item.total}</strong>
                  <small>{item.upcoming} {t("upcoming")} · {item.overdue} {t("overdue")}</small>
                  <i aria-hidden="true"><i /></i>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {!loading && !error && summary.isReconciled ? (
        <p className="amp-summary-proof">
          <CheckCircle size={19} weight="fill" aria-hidden="true" />
          <strong>{t("All totals match")}</strong>
          <span>{summary.total} {t("units")}: {summary.overdue} {t("overdue and")} {summary.upcoming} {t("upcoming")}</span>
          <span>{summary.serviceTotal} {t("units grouped by service type")}</span>
          <span>{summary.branchTotal} {t("units assigned to branches")}</span>
        </p>
      ) : null}
      {!loading && !error && !summary.isReconciled ? (
        <p className="amp-summary-warning">{t("The total is available, but the full breakdown could not be loaded.")}</p>
      ) : null}
    </section>
  );
}

function PipelineAssessmentDialog({ unit, onClose, t = (value) => value }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") { event.preventDefault(); closeRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);
  return createPortal(<div className="amp-assessment-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="amp-assessment-dialog" role="dialog" aria-modal="true" aria-labelledby="amp-assessment-title">
      <header><div><h2 id="amp-assessment-title">{t("Maintenance assessment")} · {unit.modelName || t("AC unit")}</h2><p>{unit.customerName || t("Customer not recorded")} · {unit.serialNumber || unit.unitId}</p></div><button type="button" ref={closeRef} onClick={onClose} aria-label={t("Close assessment details")}>{t("Close")}</button></header>
      <div className="amp-assessment-dialog-body amp-recommendation-sections">
        <section><h4>{t("Priority and status")}</h4><p>{t(humanLabel(unit.severity || unit.priority, "Not recorded"))} · {t(humanLabel(unit.currentStatus, "Not recorded"))}</p></section>
        <section><h4>{t("Technician notes")}</h4><p>{unit.technicianRecorded || t("No technician note is recorded for the latest visit.")}</p></section>
        <section><h4>{t("What the records suggest")}</h4><p>{unit.aiAssessment || t("Open the service planner to review this AC's records.")}</p><small>{t("Use this as a guide. A technician must confirm the issue.")}</small></section>
        {unit.historicalContext ? <section><h4>{t("Past service notes")}</h4><p>{unit.historicalContext}</p></section> : null}
        <section><h4>{t("Possible causes")}</h4>{unit.possibleCauses?.length ? <ul>{unit.possibleCauses.map((cause, index) => <li key={`${cause}-${index}`}>{cause}</li>)}</ul> : <p>{t("No possible cause is listed in the completed report.")}</p>}</section>
        <section><h4>{t("What to check")}</h4>{unit.diagnosticActions?.length ? <ol>{unit.diagnosticActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}</ol> : <p>{t("Review the technician report and inspect the unit before deciding on repairs.")}</p>}</section>
        <section><h4>{t("Suggested service")}</h4><p>{unit.recommendedServiceOrRepair || t(humanLabel(unit.recommendedService, "Not yet reviewed"))}</p></section>
        <section><h4>{t("Suggested part")}</h4><p>{unit.partsRecommendation || unit.recommendedPart || t("No part is suggested from the available records.")}</p></section>
        <section><h4>{t("Suggested date")}</h4><p>{serviceDateLabel(unit.nextPossibleVisit || unit.bestServicedBy)} · {ampDueLabel(unit.daysUntilDue)}</p><small>{unit.whyThisDate || unit.recommendationBasis || t("Open the service planner to review the available records.")}</small></section>
        {unit.previousVisitHistory?.length ? <section><h4>{t("Earlier service history")}</h4><ul>{unit.previousVisitHistory.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section> : null}
        {(unit.condition || unit.capacityAssessment?.summary) ? <section><h4>{t("Current AC condition")}</h4>{unit.condition ? <p>{t(humanLabel(unit.condition))}</p> : null}{unit.capacityAssessment?.summary ? <p>{unit.capacityAssessment.summary}</p> : null}</section> : null}
        <section><h4>{t("Issues to follow up")}</h4>{unit.currentIssues?.length ? <ul>{unit.currentIssues.map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}</ul> : <p>{unit.affectedComponent ? `${t("The recorded")} ${t(humanLabel(unit.affectedComponent).toLowerCase())} ${t("concern requires follow-up.")}` : t("No unresolved issue is recorded in the latest visit.")}</p>}</section>
        {unit.completedWork?.length ? <section><h4>{t("Work already completed")}</h4><ul>{unit.completedWork.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section> : null}
        {unit.recommendedActions?.length ? <section><h4>{t("Recommended next steps")}</h4><ul>{unit.recommendedActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}</ul></section> : null}
        <section><p><strong>{t("Before approving work:")}</strong> {t("A technician must inspect the unit and confirm the issue.")}</p></section>
        <section><h4>{t("Other details")}</h4><p>{t("Warranty")}: {t(humanLabel(unit.warrantyStatus, "pending activation"))} · {t("Branch")}: {unit.serviceBranch || t("Not assigned")}</p></section>
      </div>
    </section>
  </div>, document.body);
}

function ManagementActionDialog({ action, unit, onClose, t = (value) => value }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = [...dialogRef.current?.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || []];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);
  const dueDate = action.suggestedDate && new Date(action.suggestedDate);
  const dueDay = dueDate && Number.isFinite(dueDate.getTime())
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(dueDate)
    : null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const dateStatus = dueDay ? dueDay < today ? "Overdue" : dueDay === today ? "Due today" : "Upcoming" : null;
  const details = [
    ...(action.sections || []),
    unit?.reportedIssue ? { label: "Reported issue", value: unit.reportedIssue } : null,
    unit?.possibleCauses?.length ? { label: "Possible causes", value: unit.possibleCauses } : null,
    unit?.diagnosticActions?.length ? { label: "Diagnostic recommendations", value: unit.diagnosticActions } : null,
    unit?.partsRecommendation ? { label: "Recommended parts", value: unit.partsRecommendation } : null,
    unit?.whyThisDate ? { label: "Supporting reasons", value: unit.whyThisDate } : null,
  ].filter(Boolean);
  return createPortal(<div className="amp-assessment-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="amp-assessment-dialog" role="dialog" aria-modal="true" aria-labelledby="amp-action-dialog-title">
      <header><div><h2 id="amp-action-dialog-title">{t(action.title)}</h2>{action.modelName || action.customerName ? <p>{[action.modelName, action.customerName, action.serialNumber].filter(Boolean).join(" · ")}</p> : null}</div><button type="button" ref={closeRef} onClick={onClose} aria-label={t('Close follow-up details')}>{t("Close")}</button></header>
      <div className="amp-assessment-dialog-body amp-recommendation-sections">
        {dateStatus ? <section><h4>{t("Suggested inspection date")}</h4><p>{serviceDateLabel(action.suggestedDate)} · <strong>{t(dateStatus)}</strong></p></section> : null}
        {details.map((detail, index) => <section key={`${detail.label}-${index}`}><h4>{t(detail.label)}</h4>{Array.isArray(detail.value) ? <ul>{detail.value.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul> : <p>{detail.value}</p>}</section>)}
      </div>
    </section>
  </div>, document.body);
}

function PipelineTable({ units, onSelectPlan, t = (value) => value }) {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const triggerRef = useRef(null);
  const closeDetails = () => { setSelectedUnit(null); triggerRef.current?.focus(); };
  return (
    <><div className="amp-table-wrap amp-followup-table-wrap">
      <table className="amp-table amp-followup-table">
        <thead>
          <tr>
            <th>{t("Unit")}</th>
            <th>{t("Customer")}</th>
            <th>{t("Suggested Servicing Date")}</th>
            <th>{t("Recommended Service")}</th>
            <th>{t("Reason & next step")}</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr className={unit.overdue ? "is-overdue" : "is-upcoming"} key={unit.unitId}>
              <td data-label={t("Unit")}>
                <strong>{unit.modelName}</strong>
                <span>{unit.serialNumber}</span>
                <span>{unit.zipCode}</span>
              </td>
              <td data-label={t("Customer")}>
                <strong>{unit.customerName}</strong>
                <span>{unit.addressLine || t("Address pending")}</span>
              </td>
              <td data-label={t("Suggested servicing date")}>
                <strong>{serviceDateLabel(unit.bestServicedBy)}</strong>
                <span className={unit.overdue ? "amp-due-status overdue" : "amp-due-status upcoming"}>{ampDueLabel(unit.daysUntilDue)}</span>
              </td>
              <td data-label={t("Recommended service")}>
                <strong className={`amp-service-pill ${unit.recommendedService || "inspection"}`}>{t(humanLabel(unit.recommendedService, "not yet assessed"))}</strong>
                <span>{unit.lastServiceDate ? `${t("Last service")} ${serviceDateLabel(unit.lastServiceDate)}` : t("No completed service recorded")}</span>
              </td>
              <td data-label={t("Reason and next step")}>
                <span className="amp-assessment-preview">{unit.aiAssessment || unit.technicianRecorded || t("No assessment recorded yet.")}</span>
                <button type="button" className="amp-assessment-view" onClick={(event) => { triggerRef.current = event.currentTarget; setSelectedUnit(unit); }}>{t("View details")}</button>
                <a className="amp-plan-link" href="#amp-service-plan" onClick={() => onSelectPlan(String(unit.unitId))}>{t("Review service plan")}</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>{selectedUnit ? <PipelineAssessmentDialog unit={selectedUnit} onClose={closeDetails} t={t} /> : null}</>
  );
}

function ManagerAmpDashboard() {
  const branchNames = useActiveBranches();
  const { userRole, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const isCompanyWide = userRole === "superadmin" || userRole === "owner";
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [serviceWindow, setServiceWindow] = useState(30);
  const [pipeline, setPipeline] = useState([]);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [pipelinePagination, setPipelinePagination] = useState({ page: 1, pageSize: PIPELINE_PAGE_SIZE, total: 0, totalPages: 1 });
  const [branchSummary, setBranchSummary] = useState([]);
  const [actionSummary, setActionSummary] = useState({ serviceDemand: [], priorityUnits: [], earliestDueUnit: null });
  const [reportUnits, setReportUnits] = useState([]);
  const [aggregate, setAggregate] = useState({ modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planSelection, setPlanSelection] = useState({ unitId: "", revision: 0 });
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [selectedAction, setSelectedAction] = useState(null);
  const actionTriggerRef = useRef(null);
  const closeAction = () => { setSelectedAction(null); actionTriggerRef.current?.focus(); };
  const selectPlan = (unitId) => setPlanSelection((previous) => ({ unitId, revision: previous.revision + 1 }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const branchQuery = isCompanyWide && selectedBranch !== "all"
      ? `&branch=${encodeURIComponent(selectedBranch)}`
      : "";
    Promise.all([
      apiRequest(`/amp/manager/pipeline?days=${serviceWindow}&page=${pipelinePage}&pageSize=${PIPELINE_PAGE_SIZE}${branchQuery}`),
      apiRequest("/amp/report-units"),
    ])
      .then(([pipelineResult, reportUnitResult]) => {
        if (cancelled) return;
        setPipeline(pipelineResult.units || []);
        setPipelinePagination(pipelineResult.pagination || { page: 1, pageSize: PIPELINE_PAGE_SIZE, total: pipelineResult.units?.length || 0, totalPages: 1 });
        setBranchSummary(pipelineResult.branchSummary || []);
        setActionSummary(pipelineResult.actionSummary || { serviceDemand: [], priorityUnits: [], earliestDueUnit: null });
        setReportUnits(reportUnitResult.units || []);
        setAggregate(pipelineResult.aggregate || { modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Unable to load the maintenance list. Please try again.");
        setPipeline([]);
        setPipelinePagination({ page: 1, pageSize: PIPELINE_PAGE_SIZE, total: 0, totalPages: 1 });
        setBranchSummary([]);
        setActionSummary({ serviceDemand: [], priorityUnits: [], earliestDueUnit: null });
        setReportUnits([]);
        setAggregate({ modelTrends: [], brandTrends: [], componentReplacements: [], serviceDemand: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCompanyWide, selectedBranch, serviceWindow, pipelinePage, refreshRevision]);

  const currentSummary = useMemo(() => {
    if (!branchSummary.length) {
      return {
        total: pipeline.length,
        upcoming: pipeline.filter((unit) => !unit.overdue).length,
        overdue: pipeline.filter((unit) => unit.overdue).length,
      };
    }
    if (isCompanyWide && selectedBranch !== "all") {
      return branchSummary.find((item) => item.branch === selectedBranch) || { total: 0, upcoming: 0, overdue: 0 };
    }
    return branchSummary.reduce((totals, item) => ({
      total: totals.total + item.total,
      upcoming: totals.upcoming + item.upcoming,
      overdue: totals.overdue + item.overdue,
    }), { total: 0, upcoming: 0, overdue: 0 });
  }, [branchSummary, isCompanyWide, pipeline, selectedBranch]);

  const groupedPipeline = useMemo(() => {
    const groups = new Map();
    pipeline.forEach((unit) => {
      const branch = unit.serviceBranch || UNASSIGNED_BRANCH;
      groups.set(branch, [...(groups.get(branch) || []), unit]);
    });
    const order = [...branchNames, UNASSIGNED_BRANCH];
    return Array.from(groups.entries())
      .map(([branch, units]) => ({ branch, units }))
      .sort((a, b) => order.indexOf(a.branch) - order.indexOf(b.branch));
  }, [branchNames, pipeline]);

  const visibleReportUnits = useMemo(() => {
    if (!isCompanyWide || selectedBranch === "all") return reportUnits;
    return reportUnits.filter((unit) => unit.branch === selectedBranch);
  }, [isCompanyWide, reportUnits, selectedBranch]);

  const unassignedCount = branchSummary.find((item) => item.branch === UNASSIGNED_BRANCH)?.total || 0;
  const effectiveActionSummary = useMemo(() => {
    if (actionSummary.serviceDemand?.length || actionSummary.priorityUnits?.length || actionSummary.earliestDueUnit) return actionSummary;
    const serviceDemand = Array.from(pipeline.reduce((counts, unit) => {
      const serviceType = unit.recommendedService || "inspection";
      const current = counts.get(serviceType) || { serviceType, count: 0, overdue: 0 };
      current.count += 1;
      if (unit.overdue) current.overdue += 1;
      counts.set(serviceType, current);
      return counts;
    }, new Map()).values());
    const first = pipeline[0];
    return {
      serviceDemand,
      priorityUnits: first ? [{
        unitId: first.unitId,
        modelName: first.modelName,
        serialNumber: first.serialNumber,
        customerName: first.customerName,
        bestServicedBy: first.bestServicedBy,
        recommendedService: first.recommendedService,
        assessment: first.aiAssessment,
      }] : [],
      earliestDueUnit: first ? {
        unitId: first.unitId,
        modelName: first.modelName,
        serialNumber: first.serialNumber,
        customerName: first.customerName,
        bestServicedBy: first.bestServicedBy,
        recommendedService: first.recommendedService,
      } : null,
    };
  }, [actionSummary, pipeline]);
  const managementActions = useMemo(() => buildManagementActions({
    summary: currentSummary,
    actionSummary: effectiveActionSummary,
    serviceWindow,
  }), [currentSummary, effectiveActionSummary, serviceWindow]);
  const followUpSummary = useMemo(() => buildFollowUpSummary({
    branchSummary,
    actionSummary: effectiveActionSummary,
    pagination: pipelinePagination,
    pipeline,
    selectedBranch,
    isCompanyWide,
  }), [branchSummary, effectiveActionSummary, isCompanyWide, pipeline, pipelinePagination, selectedBranch]);
  const selectBranch = (branch) => {
    setPipelinePage(1);
    setSelectedBranch(branch);
  };
  const pageTitle = isCompanyWide ? "Branch maintenance" : "My branch maintenance";
  const pageSubtitle = isCompanyWide
    ? "See which branches need attention. Branch admins remain responsible for service processing."
    : "Review upcoming and overdue AC maintenance for your branch. These are suggestions, not confirmed bookings.";

  return (
    <AmpDashboardShell title={pageTitle} subtitle={pageSubtitle}>
      <AmpPurposeGuide planning={isCompanyWide} />
      {isCompanyWide ? <div className="amp-followup-controls" aria-label={t('Branch maintenance filters')}>
        <div className="amp-overview-filters">
          <label className="amp-branch-filter">{t("Service window")}<select value={serviceWindow} onChange={(event) => { setPipelinePage(1); setServiceWindow(Number(event.target.value)); }}>{SERVICE_WINDOWS.map((days) => <option key={days} value={days}>{t('Next')} {days} {t('days')}</option>)}</select></label>
          <label className="amp-branch-filter">{t("Branch (including branches with no due units)")}<select value={selectedBranch} onChange={(event) => selectBranch(event.target.value)}><option value="all">{t("All branches")}</option>{[...branchNames, UNASSIGNED_BRANCH].map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        </div>
        {unassignedCount > 0 ? <p className="amp-unassigned-notice"><strong>{unassignedCount} {t(unassignedCount === 1 ? "unit has no responsible branch." : "units have no responsible branch.")}</strong> {t("These records are not included in any branch admin’s service queue.")}</p> : null}
      </div> : null}
      <FollowUpSummary
        summary={followUpSummary}
        loading={loading}
        error={error}
        serviceWindow={serviceWindow}
        selectedBranch={selectedBranch}
        isCompanyWide={isCompanyWide}
        onSelectBranch={selectBranch}
        t={t}
      />

      {!loading && !error ? (
        <section className="amp-card amp-management-actions" aria-labelledby="amp-management-actions-title">
          <div className="amp-action-heading">
            <div>
              <span className="amp-action-eyebrow">{t("Next steps")}</span>
              <h2 id="amp-management-actions-title">{t("Recommended follow-up")}</h2>
              <p>{t("These steps are based on the suggested dates and service needs shown on this page.")}</p>
            </div>
            {currentSummary.total > 0 ? <a href="#amp-follow-up-units">{t("Review affected units")}</a> : null}
          </div>
          <div className="amp-action-grid">
            {managementActions.map((action, index) => (
              <article className={`amp-action-item ${action.level}`} key={`${action.title}-${index}`}>
                <span>{index + 1}</span>
                <div>
                  <h3>{t(action.title)}</h3>
                  {action.sections?.[0] ? <p className="amp-action-preview">{Array.isArray(action.sections[0].value) ? action.sections[0].value[0] : action.sections[0].value}</p> : null}
                  {action.customerName ? <small className="amp-action-customer">{action.customerName}{action.serialNumber ? ` · ${action.serialNumber}` : ""}</small> : null}
                  <button type="button" className="amp-action-details" onClick={(event) => { actionTriggerRef.current = event.currentTarget; setSelectedAction(action); }}>{t("See details")}</button>
                </div>
              </article>
            ))}
          </div>
          <p className="amp-action-disclaimer">{t("Review the technician's notes before scheduling service or approving repairs.")}</p>
        </section>
      ) : null}

      {selectedAction ? <ManagementActionDialog action={selectedAction} unit={pipeline.find((unit) => unit.unitId === selectedAction.unitId)} onClose={closeAction} t={t} /> : null}

      <section className="amp-card amp-followup-section" id="amp-follow-up-units">
        <div className="amp-card-header">
          <div className="amp-section-title">
            <span className="amp-section-icon"><CalendarCheck size={23} weight="duotone" aria-hidden="true" /></span>
            <div>
              <h2>{t(isCompanyWide ? "Units needing branch follow-up" : "Units to follow up")}</h2>
              {isCompanyWide ? <p className="amp-muted">{t("View only. Units are grouped by the branch responsible for follow-up.")}</p> : null}
            </div>
          </div>
          {!isCompanyWide ? <label className="amp-branch-filter">{t("Service window")}<select value={serviceWindow} onChange={(event) => { setPipelinePage(1); setServiceWindow(Number(event.target.value)); }}>{SERVICE_WINDOWS.map((days) => <option key={days} value={days}>{t("Next")} {days} {t("days")}</option>)}</select></label> : null}
          {loading ? <span>{t("Loading...")}</span> : null}
        </div>

        {error ? <p className="amp-error">{error}</p> : null}

        {!loading && !error && pipeline.length === 0 ? (
          <p className="amp-empty">{t("No units are entering the selected")} {serviceWindow}-{t("day service window.")}</p>
        ) : null}

        {pipeline.length > 0 && isCompanyWide ? (
          <div className="amp-pipeline-groups">
            {groupedPipeline.map((group) => (
              <section className="amp-pipeline-group" key={group.branch}>
                <header>
                  <div><h3>{group.branch === UNASSIGNED_BRANCH ? t("Unassigned Units") : `${group.branch} ${t("Branch")}`}</h3><span>{group.units.length} {t("units")}</span></div>
                  <strong>{group.units.filter((unit) => unit.overdue).length} {t("overdue")}</strong>
                </header>
                <PipelineTable units={group.units} onSelectPlan={selectPlan} t={t} />
              </section>
            ))}
          </div>
        ) : null}

        {pipeline.length > 0 && !isCompanyWide ? <PipelineTable units={pipeline} onSelectPlan={selectPlan} t={t} /> : null}
        {!loading && !error && pipelinePagination.total > 0 ? (
          <nav className="amp-pagination" aria-label={t("Maintenance list pages")}>
            <button type="button" onClick={() => setPipelinePage((value) => Math.max(1, value - 1))} disabled={pipelinePage <= 1}>{t("Previous")}</button>
            <span>{t("Page")} {pipelinePagination.page} {t("of")} {pipelinePagination.totalPages} · {pipelinePagination.total} {t("units")}</span>
            <button type="button" onClick={() => setPipelinePage((value) => Math.min(pipelinePagination.totalPages, value + 1))} disabled={pipelinePage >= pipelinePagination.totalPages}>{t("Next")}</button>
          </nav>
        ) : null}
      </section>

      <div id="amp-service-plan"><AmpReportCenter onPlanGenerated={() => setRefreshRevision(value => value + 1)} key={`${selectedBranch}:${planSelection.revision}`} initialUnitId={planSelection.unitId} units={visibleReportUnits} title={t("Service planner")} subtitle={t("Choose a unit to review its suggested date, service history, and next steps.")} /></div>

      <details className="amp-card amp-details amp-insight-details"><summary><span className="amp-details-summary-icon"><ClockCounterClockwise size={19} weight="duotone" aria-hidden="true" /></span><span><strong>{t("Past service and parts records")}</strong><small>{t("Completed services and parts used")}</small></span></summary>
      <div className="amp-report-grid">
        <section className="amp-insight-card">
          <div className="amp-section-title compact"><span className="amp-section-icon"><ClockCounterClockwise size={20} weight="duotone" aria-hidden="true" /></span><div><h2>{t("Completed services by AC model")}</h2></div></div>
          <p className="amp-muted">{t("Ranked only from completed service records")} {t(isCompanyWide && selectedBranch === "all" ? "across all branches" : "in the selected branch")}.</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>{t("Model")}</th><th>{t("Completed services")}</th><th>{t("Average services per unit")}</th></tr></thead><tbody>{aggregate.modelTrends.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.recordedServices}</td><td>{item.servicesPerUnit}</td></tr>)}</tbody></table></div>
          {!aggregate.modelTrends.length && !loading && !error ? <p className="amp-empty">{t("No completed service records are available yet.")}</p> : null}
        </section>
        <section className="amp-insight-card">
          <div className="amp-section-title compact"><span className="amp-section-icon"><Package size={20} weight="duotone" aria-hidden="true" /></span><div><h2>{t("Parts used in past services")}</h2></div></div>
          <p className="amp-muted">{t("Shows how often compressor, motor, and control-board parts were recorded in completed services.")}</p>
          <div className="amp-table-wrap"><table className="amp-table compact"><thead><tr><th>{t("Component")}</th><th>{t("Recorded uses")}</th></tr></thead><tbody>{aggregate.componentReplacements.map((item) => <tr key={item.component}><td>{item.component}</td><td>{item.count}</td></tr>)}</tbody></table></div>
          {!aggregate.componentReplacements.length && !loading && !error ? <p className="amp-empty">{t("No recorded component use is available yet.")}</p> : null}
        </section>
      </div>
      </details>
    </AmpDashboardShell>
  );
}

export default ManagerAmpDashboard;
