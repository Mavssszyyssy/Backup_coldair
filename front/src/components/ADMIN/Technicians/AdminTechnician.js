import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../Common/AdminLayout";
import { useUser } from "../../../context/UserContext";
import { BRANCHES } from "../../../domain/branches/branches";
import { apiRequest } from "../../../config/api";
import "../adminShared.css";
import "./styles.css";

const PAGE_SIZE = 8;
const TIME_SLOTS = ["8:00 AM – 10:00 AM", "10:00 AM – 12:00 PM", "1:00 PM – 3:00 PM", "3:00 PM – 5:00 PM"];
const today = () => new Date().toISOString().slice(0, 10);
const displayName = (person = {}) =>
  person.name || [person.name_first, person.name_last].filter(Boolean).join(" ").trim() || person.email || "Technician";
const openTask = (task) => !["completed"].includes(String(task.status || "").toLowerCase());

const initialDraft = (branch = "") => ({
  technicianId: "",
  title: "",
  customerName: "",
  address: "",
  description: "",
  scheduledDate: today(),
  timeSlot: TIME_SLOTS[0],
  priority: "medium",
  branch,
});

const AdminTechnician = () => {
  const { user } = useUser();
  const isSuperAdmin = user?.role === "superadmin";
  const homeBranch = user?.assignedBranch || user?.activeBranch || "";
  const [technicians, setTechnicians] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("active");
  const [workloadFilter, setWorkloadFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState(isSuperAdmin ? "all" : homeBranch || "all");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(() => initialDraft(homeBranch));
  const [savingTask, setSavingTask] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersResult, tasksResult] = await Promise.all([
        apiRequest("/users?role=technician"),
        apiRequest("/tasks"),
      ]);
      setTechnicians((usersResult.users || []).map((item) => ({
        ...item,
        name: displayName(item),
        branch: item.assignedBranch || item.activeBranch || "",
        accountStatus: item.accountStatus || "active",
      })));
      setTasks(tasksResult.tasks || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load technician management.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, accountFilter, workloadFilter, branchFilter]);
  useEffect(() => {
    if (!isSuperAdmin) {
      setBranchFilter(homeBranch || "all");
      setDraft((current) => ({ ...current, branch: homeBranch }));
    }
  }, [homeBranch, isSuperAdmin]);

  const openTasksByTechnician = useMemo(() => tasks.reduce((counts, task) => {
    if (openTask(task) && task.assignedTechnicianId) {
      counts[String(task.assignedTechnicianId)] = (counts[String(task.assignedTechnicianId)] || 0) + 1;
    }
    return counts;
  }, {}), [tasks]);

  const filteredTechnicians = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return technicians.filter((technician) => {
      const openCount = openTasksByTechnician[String(technician.id)] || 0;
      const textMatches = !needle || [technician.name, technician.email, technician.branch, technician.department, ...(technician.skills || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      const accountMatches = accountFilter === "all" || technician.accountStatus === accountFilter;
      const branchMatches = branchFilter === "all" || technician.branch === branchFilter;
      const workloadMatches = workloadFilter === "all" ||
        (workloadFilter === "available" && openCount < 3) ||
        (workloadFilter === "busy" && openCount >= 3);
      return textMatches && accountMatches && branchMatches && workloadMatches;
    });
  }, [accountFilter, branchFilter, openTasksByTechnician, search, technicians, workloadFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTechnicians.length / PAGE_SIZE));
  const pageTechnicians = filteredTechnicians.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const availableForAssignment = technicians.filter((technician) => {
    if (technician.accountStatus !== "active") return false;
    const intendedBranch = draft.branch || homeBranch;
    return !intendedBranch || !technician.branch || technician.branch === intendedBranch;
  });
  const activeCount = technicians.filter((technician) => technician.accountStatus === "active").length;
  const busyCount = technicians.filter((technician) => (openTasksByTechnician[String(technician.id)] || 0) >= 3).length;

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const createTask = async (event) => {
    event.preventDefault();
    const technician = technicians.find((item) => String(item.id) === String(draft.technicianId));
    if (!technician) { setError("Choose a technician from the assignment dropdown."); return; }
    if (!draft.title.trim()) { setError("Enter a work order title."); return; }
    if (draft.scheduledDate < today()) { setError("Choose today or a future date."); return; }
    setSavingTask(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: draft.title.trim(),
          customerName: draft.customerName.trim() || "Customer",
          address: draft.address.trim() || "TBD",
          description: draft.description.trim(),
          scheduledDate: draft.scheduledDate,
          timeSlot: draft.timeSlot,
          priority: draft.priority,
          branch: isSuperAdmin ? draft.branch : homeBranch,
          assignedTechnicianId: technician.id,
          assignedTechnicianName: technician.name,
          status: "pending",
        }),
      });
      setNotice(`Work order assigned to ${technician.name}.`);
      setDraft(initialDraft(isSuperAdmin ? draft.branch : homeBranch));
      await load();
    } catch (requestError) {
      setError(requestError.message || "Unable to assign the work order.");
    } finally {
      setSavingTask(false);
    }
  };

  const updateTaskAssignment = async (task, technicianId) => {
    const technician = technicians.find((item) => String(item.id) === String(technicianId));
    if (!technician) return;
    setUpdatingId(`task-${task.id}`);
    setError("");
    try {
      const result = await apiRequest(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedTechnicianId: technician.id,
          assignedTechnicianName: technician.name,
        }),
      });
      setTasks((current) => current.map((item) => item.id === task.id ? result.task : item));
      setNotice(`Work order reassigned to ${technician.name}.`);
    } catch (requestError) {
      setError(requestError.message || "Unable to reassign this work order.");
    } finally {
      setUpdatingId("");
    }
  };

  const updateTechnician = async (technician, payload, successMessage) => {
    setUpdatingId(`tech-${technician.id}`);
    setError("");
    try {
      const result = await apiRequest(`/users/${technician.id}${payload.status ? "/status" : ""}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setTechnicians((current) => current.map((item) => item.id === technician.id ? {
        ...item,
        ...result.user,
        name: displayName(result.user),
        branch: result.user.assignedBranch || result.user.activeBranch || "",
        accountStatus: result.user.accountStatus || "active",
      } : item));
      setNotice(successMessage);
    } catch (requestError) {
      setError(requestError.message || "Unable to update this technician.");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <AdminLayout title="Technician Management" subtitle="Assign work, monitor workload, and keep field coverage organized.">
      <section className="tech-management">
        <div className="tech-summary-grid">
          <article><span>Total technicians</span><strong>{technicians.length}</strong><small>Visible to your access level</small></article>
          <article><span>Active accounts</span><strong>{activeCount}</strong><small>Ready for work assignment</small></article>
          <article><span>Busy technicians</span><strong>{busyCount}</strong><small>Three or more open work orders</small></article>
          <article><span>Open work orders</span><strong>{tasks.filter(openTask).length}</strong><small>Pending, in progress, or on hold</small></article>
        </div>

        <section className="tech-filter-card admin-card" aria-label="Technician filters">
          <div className="tech-filter-heading"><div><h2>Find a technician</h2><p>Use the filters to match the right field team member to each job.</p></div><button type="button" className="tech-secondary-button" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
          <div className="tech-filter-grid">
            <label className="tech-search-field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, skill, email, or branch" /></label>
            <label><span>Account status</span><select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}><option value="all">All accounts</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
            <label><span>Workload</span><select value={workloadFilter} onChange={(event) => setWorkloadFilter(event.target.value)}><option value="all">All workloads</option><option value="available">Available (under 3 open)</option><option value="busy">Busy (3+ open)</option></select></label>
            <label><span>Branch</span><select value={branchFilter} disabled={!isSuperAdmin && Boolean(homeBranch)} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">All branches</option>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
          </div>
        </section>

        {error ? <p className="tech-message tech-message--error">{error}</p> : null}
        {notice ? <p className="tech-message tech-message--success">{notice}</p> : null}

        <div className="tech-management-grid">
          <section className="admin-card tech-roster-card">
            <div className="tech-section-heading"><div><h2>Field team</h2><p>{filteredTechnicians.length} technician{filteredTechnicians.length === 1 ? "" : "s"} match the selected filters.</p></div></div>
            {loading ? <p className="tech-empty">Loading technicians…</p> : pageTechnicians.length === 0 ? <p className="tech-empty">No technicians match these filters.</p> : <div className="tech-roster-list">{pageTechnicians.map((technician) => {
              const openCount = openTasksByTechnician[String(technician.id)] || 0;
              const changing = updatingId === `tech-${technician.id}`;
              return <article className="tech-person-card" key={technician.id}>
                <div className="tech-person-main"><div className="tech-avatar">{technician.name.charAt(0).toUpperCase()}</div><div><h3>{technician.name}</h3><p>{technician.department || technician.skills?.[0] || "Field technician"}</p><small>{technician.email || "No email recorded"}</small></div></div>
                <div className="tech-person-meta"><span className={`tech-account-status is-${technician.accountStatus}`}>{technician.accountStatus}</span><span>{technician.branch || "Unassigned branch"}</span><strong>{openCount} open work order{openCount === 1 ? "" : "s"}</strong></div>
                {isSuperAdmin ? <label className="tech-inline-select"><span>Branch assignment</span><select value={technician.branch} disabled={changing} onChange={(event) => updateTechnician(technician, { assignedBranch: event.target.value }, `${technician.name} is now assigned to ${event.target.value}.`)}><option value="">Select branch</option>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label> : null}
                <button type="button" className={technician.accountStatus === "active" ? "tech-danger-button" : "tech-primary-button"} disabled={changing} onClick={() => updateTechnician(technician, { status: technician.accountStatus === "active" ? "disabled" : "active" }, `${technician.name}'s account is now ${technician.accountStatus === "active" ? "disabled" : "active"}.`)}>{changing ? "Saving…" : technician.accountStatus === "active" ? "Disable account" : "Enable account"}</button>
              </article>;
            })}</div>}
            {filteredTechnicians.length > PAGE_SIZE ? <div className="tech-pagination"><span>Page {page} of {totalPages}</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button></div></div> : null}
          </section>

          <form className="admin-card tech-assignment-form" onSubmit={createTask}>
            <div className="tech-section-heading"><div><h2>Create work order</h2><p>Assignment is saved directly to the selected technician’s My Work list.</p></div></div>
            {isSuperAdmin ? <label><span>Branch</span><select value={draft.branch} onChange={(event) => updateDraft("branch", event.target.value)} required><option value="">Select branch</option>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label> : <p className="tech-branch-note">Branch: <strong>{homeBranch || "Your active branch"}</strong></p>}
            <label><span>Assign technician</span><select value={draft.technicianId} onChange={(event) => updateDraft("technicianId", event.target.value)} required><option value="">Select an active technician</option>{availableForAssignment.map((technician) => <option key={technician.id} value={technician.id}>{technician.name} · {openTasksByTechnician[String(technician.id)] || 0} open</option>)}</select></label>
            <label><span>Work order title</span><input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="Example: Split-type installation" required /></label>
            <div className="tech-form-row"><label><span>Customer / site</span><input value={draft.customerName} onChange={(event) => updateDraft("customerName", event.target.value)} placeholder="Customer name" /></label><label><span>Priority</span><select value={draft.priority} onChange={(event) => updateDraft("priority", event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
            <label><span>Service address</span><input value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} placeholder="Installation or service location" /></label>
            <div className="tech-form-row"><label><span>Scheduled date</span><input type="date" min={today()} value={draft.scheduledDate} onChange={(event) => updateDraft("scheduledDate", event.target.value)} required /></label><label><span>Time slot</span><select value={draft.timeSlot} onChange={(event) => updateDraft("timeSlot", event.target.value)}>{TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label></div>
            <label><span>Work details</span><textarea rows="3" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Describe the work to be completed" /></label>
            <button className="tech-primary-button" type="submit" disabled={savingTask}>{savingTask ? "Creating work order…" : "Assign work order"}</button>
          </form>
        </div>

        <section className="admin-card tech-work-orders">
          <div className="tech-section-heading"><div><h2>Recent work assignments</h2><p>Use the dropdown to reassign open work without retyping any details.</p></div></div>
          {tasks.filter(openTask).slice(0, 8).length === 0 ? <p className="tech-empty">There are no open work orders.</p> : <div className="tech-work-list">{tasks.filter(openTask).slice(0, 8).map((task) => <article key={task.id} className="tech-work-item"><div><span className={`tech-task-status is-${String(task.status || "pending").replace(/\s+/g, "-")}`}>{task.status || "pending"}</span><h3>{task.title}</h3><p>{task.customerName || task.customer || "Customer"} · {task.branch || "No branch"}</p><small>{task.scheduledDate || "Date not set"} · {task.timeSlot || "Time not set"}</small></div><label><span>Assigned technician</span><select value={task.assignedTechnicianId || ""} disabled={updatingId === `task-${task.id}`} onChange={(event) => updateTaskAssignment(task, event.target.value)}><option value="">Select technician</option>{technicians.filter((technician) => technician.accountStatus === "active" && (!task.branch || !technician.branch || technician.branch === task.branch)).map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}</select></label></article>)}</div>}
        </section>
      </section>
    </AdminLayout>
  );
};

export default AdminTechnician;
