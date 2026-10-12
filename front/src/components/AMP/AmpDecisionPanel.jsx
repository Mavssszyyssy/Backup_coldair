import { useEffect, useState } from "react";
import { apiRequest } from "../../config/api";
import MaintenanceDecisionSupport from "../ADMIN/Maintenance/MaintenanceDecisionSupport";
import "../ADMIN/Maintenance/styles.css";

export default function AmpDecisionPanel({ unitId }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOpen(false);
    setData(null);
    setError("");
  }, [unitId]);

  useEffect(() => {
    if (!open || !unitId) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    apiRequest(`/amp/units/${encodeURIComponent(unitId)}/decision-support`)
      .then((result) => { if (active) setData(result); })
      .catch((failure) => { if (active) setError(failure?.message || "Unable to load this unit's assessments."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, unitId]);

  const task = data?.lastVisit?.taskId ? { id: data.lastVisit.taskId, status: "completed" } : null;
  return <details className="amp-details amp-decision-panel" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>AI parts and future-issue assessment</summary>
    <p className="amp-muted">For this AC only. Review suggested parts before a visit and possible follow-up concerns after completed maintenance. Technician confirmation is required.</p>
    {loading ? <p role="status">Loading assessments…</p> : null}
    {error ? <p className="amp-error" role="alert">{error}</p> : null}
    {!loading && !error && data && !data.request && !task ? <p className="amp-empty">No open maintenance request or linked completed visit is available for this AC.</p> : null}
    {!loading && !error && data && (data.request || task) ? <MaintenanceDecisionSupport
      request={data.request}
      task={task}
      initialPost={data.lastVisit?.futurePrediction || null}
      onPreUpdated={(assessment) => setData((current) => ({ ...current, request: { ...current.request, aiPreAssessment: assessment } }))}
      onPostUpdated={(assessment) => setData((current) => ({ ...current, lastVisit: { ...current.lastVisit, futurePrediction: assessment } }))}
    /> : null}
  </details>;
}
