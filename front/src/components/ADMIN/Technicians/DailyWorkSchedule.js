import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../config/api";
import { useUser } from "../../../context/UserContext";
import { BRANCHES } from "../../../domain/branches/branches";
import { TECHNICIAN_TIME_SLOTS } from "../../../domain/technicianTimeSlots";
import { technicianHasConflict } from "../../../domain/scheduleConflicts";
import { formatBusinessDateKey } from "../../../utils/dateTime";
import "./dailySchedule.css";

const today = () => formatBusinessDateKey();
const displayName = (person = {}) => person.name
  || [person.name_first, person.name_last].filter(Boolean).join(" ").trim()
  || person.username || person.email || "Technician";
const statusLabel = (value = "") => String(value || "pending").replace(/[-_]/g, " ");
const categoryLabel = (value = "") => ({
  installation: "Installation",
  regular_cleaning: "Regular cleaning",
  deep_cleaning: "Deep cleaning",
  service_checkup: "Service / check-up",
}[value] || "Service / check-up");
const money = (value) => value === null || value === undefined || value === ""
  ? "Not recorded"
  : `PHP ${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shiftDate = (value, amount) => {
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return formatBusinessDateKey(date);
};
const formatDate = (value) => {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-PH", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  });
};

const scheduleDraft = (task = {}) => ({
  assignedTechnicianId: String(task.assignedTechnicianId || ""),
  scheduledDate: task.scheduledDate || today(),
  timeSlot: task.timeSlot || TECHNICIAN_TIME_SLOTS[0],
  driverName: task.schedule?.driverName || task.assignedTechnicianName || "",
  teamMemberIds: Array.isArray(task.schedule?.teamMemberIds) ? task.schedule.teamMemberIds.map(String) : [],
  notes: task.schedule?.notes || "",
});

const DailyWorkSchedule = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "superadmin";
  const homeBranch = user?.assignedBranch || user?.activeBranch || "";
  const [date, setDate] = useState(today());
  const [branch, setBranch] = useState(isSuperAdmin ? "all" : homeBranch || "all");
  const [tasks, setTasks] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState(null);
  const [conflictTasks, setConflictTasks] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ scheduled_date: date, limit: "200" });
      if (isSuperAdmin && branch !== "all") query.set("branch", branch);
      const [taskResult, userResult] = await Promise.all([
        apiRequest(`/tasks?${query}`),
        apiRequest("/users?role=technician"),
      ]);
      setTasks(taskResult.tasks || []);
      setTechnicians((userResult.users || []).map((item) => ({
        ...item,
        id: String(item.id || item._id || ""),
        name: displayName(item),
        branch: item.assignedBranch || item.activeBranch || "",
      })).filter((item) => item.accountStatus !== "disabled" && !item.isDeleted));
    } catch (requestError) {
      setError(requestError.message || "Unable to load the daily work schedule.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [branch, date, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let cancelled = false;
    if (!editingId || !draft?.scheduledDate) {
      setConflictTasks([]);
      return () => { cancelled = true; };
    }
    if (draft.scheduledDate === date) {
      setConflictTasks(tasks);
      return () => { cancelled = true; };
    }
    const query = new URLSearchParams({ scheduled_date: draft.scheduledDate, limit: "200" });
    if (isSuperAdmin && branch !== "all") query.set("branch", branch);
    apiRequest(`/tasks?${query}`)
      .then((result) => { if (!cancelled) setConflictTasks(result.tasks || []); })
      .catch(() => { if (!cancelled) setConflictTasks([]); });
    return () => { cancelled = true; };
  }, [branch, date, draft?.scheduledDate, editingId, isSuperAdmin, tasks]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !editingId && !saving) load({ quiet: true });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [editingId, load, saving]);

  const groups = useMemo(() => {
    const grouped = new Map();
    tasks.forEach((task) => {
      const key = task.branch || "Unassigned branch";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(task);
    });
    return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [tasks]);

  const beginEdit = (task) => {
    setEditingId(task.id);
    setDraft(scheduleDraft(task));
    setError("");
    setNotice("");
  };
  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const toggleTeamMember = (id) => setDraft((current) => ({
    ...current,
    teamMemberIds: current.teamMemberIds.includes(id)
      ? current.teamMemberIds.filter((value) => value !== id)
      : [...current.teamMemberIds, id],
  }));
  const techniciansFor = (task) => technicians.filter((technician) => !task.branch || technician.branch === task.branch);
  const isServiceAssignmentLocked = (task) => Boolean(task.requestId && task.assignedTechnicianId);
  const technicianBusy = (task, technicianId) => technicianHasConflict(conflictTasks, {
    technicianId,
    scheduledDate: draft?.scheduledDate,
    timeSlot: draft?.timeSlot,
    excludeTaskId: task.id,
  });

  const saveSchedule = async (task) => {
    if (!draft?.assignedTechnicianId) return setError("Choose the primary technician for this work order.");
    const participantIds = [draft.assignedTechnicianId, ...draft.teamMemberIds]
      .map(String)
      .filter((id, index, values) => id && values.indexOf(id) === index);
    const unavailable = participantIds
      .map((id) => technicians.find((item) => item.id === id))
      .filter((person) => person && technicianBusy(task, person.id));
    if (unavailable.length) {
      return setError(`${unavailable.map((person) => person.name).join(", ")} already ${unavailable.length === 1 ? "has" : "have"} an overlapping work order on this date and time.`);
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const primary = technicians.find((item) => item.id === draft.assignedTechnicianId);
      const result = await apiRequest(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedTechnicianId: draft.assignedTechnicianId,
          assignedTechnicianName: primary?.name || task.assignedTechnicianName,
          scheduledDate: draft.scheduledDate,
          timeSlot: draft.timeSlot,
          schedule: {
            driverName: primary?.name || task.assignedTechnicianName || "",
            teamMemberIds: draft.teamMemberIds.filter((id) => id !== draft.assignedTechnicianId),
            notes: draft.notes,
          },
        }),
      });
      setTasks((current) => current
        .map((item) => item.id === task.id ? result.task : item)
        .filter((item) => item.scheduledDate === date));
      setEditingId("");
      setDraft(null);
      setNotice(`${task.taskCode || "Work order"} schedule updated. The technician view will refresh automatically.`);
    } catch (requestError) {
      setError(requestError.message || "Unable to update this schedule.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="daily-schedule" aria-label="Daily work schedule">
    <header className="daily-schedule__header">
      <div><p className="daily-schedule__eyebrow">Field operations</p><h2>Daily work schedule</h2><p>One live view of existing orders and service work. Changes here update the same technician work order.</p></div>
      <div className="daily-schedule__actions"><button type="button" className="tech-secondary-button" onClick={() => load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button><button type="button" className="tech-primary-button" onClick={() => navigate(isSuperAdmin ? "/superadmin/services?tab=technicians" : "/admin/services?tab=technicians")}>Create work order</button></div>
    </header>

    <div className="daily-schedule__filters">
      <div className="daily-schedule__date-navigation">
        <button type="button" aria-label="Previous day" title="Previous day" onClick={() => setDate((value) => shiftDate(value, -1))}>‹</button>
        <label><span>Schedule date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <button type="button" aria-label="Next day" title="Next day" onClick={() => setDate((value) => shiftDate(value, 1))}>›</button>
      </div>
      <button type="button" className="daily-schedule__today" onClick={() => setDate(today())} disabled={date === today()}><span>Today</span><small>{date === today() ? "Current date selected" : "Return to current date"}</small></button>
      {isSuperAdmin ? <label><span>Branch</span><select value={branch} onChange={(event) => setBranch(event.target.value)}><option value="all">All branches</option>{BRANCHES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : <div className="daily-schedule__branch"><span>Branch</span><strong>{homeBranch || "Assigned branch"}</strong></div>}
    </div>
    <p className="daily-schedule__date">{formatDate(date)} · {tasks.length} job{tasks.length === 1 ? "" : "s"}</p>
    {error ? <p className="tech-message tech-message--error">{error}</p> : null}
    {notice ? <p className="tech-message tech-message--success">{notice}</p> : null}
    {loading ? <p className="daily-schedule__empty">Loading the schedule…</p> : null}
    {!loading && groups.length === 0 ? <div className="daily-schedule__empty"><strong>No jobs scheduled for this date.</strong><span>Choose another day or create a work order.</span></div> : null}

    {!loading ? groups.map(([groupBranch, groupTasks]) => <section className="daily-schedule__branch-group" key={groupBranch}>
      <div className="daily-schedule__branch-title"><h3>{groupBranch}</h3><span>{groupTasks.length} scheduled job{groupTasks.length === 1 ? "" : "s"}</span></div>
      <div className="daily-schedule__table-wrap"><table className="daily-schedule__table">
        <thead><tr><th>Time &amp; work order</th><th>Driver &amp; team</th><th>Customer &amp; location</th><th>Payment</th><th>Work scope</th><th>Notes</th><th>Costs &amp; personnel</th><th>Status</th></tr></thead>
        <tbody>{groupTasks.map((task) => {
          const details = task.scheduleDetails || {};
          const team = [task.assignedTechnicianName, ...(task.schedule?.teamMemberNames || [])].filter(Boolean);
          return <React.Fragment key={task.id}><tr>
            <td data-label="Time & work order"><strong>{task.timeSlot || "Time not set"}</strong><span>{details.reference || task.taskCode}</span><small>{task.taskCode}</small></td>
            <td data-label="Driver & team"><strong>{task.schedule?.driverName || task.assignedTechnicianName || "Driver not assigned"}</strong><span>{team.join(", ") || "Team not assigned"}</span></td>
            <td data-label="Customer & location"><strong>{task.customerName || task.customer || "Customer"}</strong><span>{task.address || "Location not recorded"}</span><small>{task.customerPhone || "Contact not recorded"}</small></td>
            <td data-label="Payment"><strong>{details.paymentMethod || "Not recorded"}</strong><span>{details.paymentStatus ? statusLabel(details.paymentStatus) : "Status not recorded"}</span></td>
            <td data-label="Work scope"><strong>{categoryLabel(details.category)}</strong><span>{details.workDescription || task.title}</span></td>
            <td data-label="Notes"><span>{task.schedule?.notes || task.description || "No schedule note"}</span></td>
            <td data-label="Costs & personnel"><strong>{money(details.otherExpenses)}</strong><span>{details.sellerPersonnel || "Personnel not recorded"}</span></td>
            <td data-label="Status"><span className={`daily-schedule__status is-${String(task.status || "pending").replace(/\s+/g, "-")}`}>{statusLabel(task.status)}</span><button type="button" className="daily-schedule__edit" onClick={() => beginEdit(task)} disabled={["completed", "cancelled"].includes(String(task.status).toLowerCase())}>{editingId === task.id ? "Editing" : "Edit schedule"}</button></td>
          </tr>{editingId === task.id && draft ? <tr className="daily-schedule__editor-row"><td colSpan="8"><div className="daily-schedule__editor">
            <label><span>Scheduled date</span><input type="date" min={today()} value={draft.scheduledDate} disabled={Boolean(task.requestId)} onChange={(event) => updateDraft("scheduledDate", event.target.value)} />{task.requestId ? <small>Customer-confirmed service dates stay locked. Use the service request or visit follow-up workflow to reschedule.</small> : null}</label>
            <label><span>Time</span><select value={draft.timeSlot} disabled={Boolean(task.requestId)} onChange={(event) => updateDraft("timeSlot", event.target.value)}>{!TECHNICIAN_TIME_SLOTS.includes(draft.timeSlot) ? <option value={draft.timeSlot}>{draft.timeSlot}</option> : null}{TECHNICIAN_TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
            <label><span>Team leader / primary technician</span><select value={draft.assignedTechnicianId} disabled={isServiceAssignmentLocked(task)} onChange={(event) => updateDraft("assignedTechnicianId", event.target.value)}><option value="">Select technician</option>{techniciansFor(task).map((technician) => { const busy = technicianBusy(task, technician.id); return <option key={technician.id} value={technician.id} disabled={busy}>{technician.name}{busy ? " · Schedule conflict" : ""}</option>; })}</select>{isServiceAssignmentLocked(task) ? <small>This service-request assignment is permanently locked.</small> : null}</label>
            <div className="daily-schedule__readonly-field"><span>Driver</span><strong>{technicians.find((item) => item.id === draft.assignedTechnicianId)?.name || task.assignedTechnicianName || "Choose a team leader"}</strong><small>The assigned team leader is also the scheduled driver.</small></div>
            <fieldset><legend>Support team (optional)</legend><div>{techniciansFor(task).filter((technician) => technician.id !== draft.assignedTechnicianId).map((technician) => { const busy = technicianBusy(task, technician.id); return <label key={technician.id} className={busy ? "is-unavailable" : ""}><input type="checkbox" checked={draft.teamMemberIds.includes(technician.id)} disabled={busy} onChange={() => toggleTeamMember(technician.id)} />{technician.name}{busy ? " · Schedule conflict" : ""}</label>; })}</div></fieldset>
            <label className="daily-schedule__note-field"><span>Schedule note</span><textarea rows="3" value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} placeholder="Access instructions, delivery note, equipment, or other operational detail" /></label>
            <div className="daily-schedule__editor-actions"><button type="button" className="tech-secondary-button" onClick={() => { setEditingId(""); setDraft(null); }} disabled={saving}>Cancel</button><button type="button" className="tech-primary-button" onClick={() => saveSchedule(task)} disabled={saving}>{saving ? "Saving…" : "Save schedule"}</button></div>
          </div></td></tr> : null}</React.Fragment>;
        })}</tbody>
      </table></div>
    </section>) : null}
  </section>;
};

export default DailyWorkSchedule;
