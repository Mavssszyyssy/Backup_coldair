import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { apiRequest } from '../../../config/api';
import { BRANCHES } from '../../../domain/branches/branches';
import '../superAdminShared.css';
import './SuperAdminBranches.css';

const lastActive = (value) => value ? new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never signed in';

const SuperAdminBranches = () => {
  const [admins, setAdmins] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [branch, setBranch] = useState(BRANCHES[0] || '');
  const [coverageAreas, setCoverageAreas] = useState('');
  const [adminId, setAdminId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResult, coverageResult] = await Promise.all([
        apiRequest('/users?role=admin'),
        apiRequest('/branches'),
      ]);
      setAdmins(Array.isArray(usersResult.users) ? usersResult.users : []);
      setCoverage(Array.isArray(coverageResult.branches) ? coverageResult.branches : []);
    } catch (requestError) {
      setAdmins([]);
      setError(requestError.message || 'Unable to load branch administrators.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const assignmentByBranch = useMemo(() => Object.fromEntries(BRANCHES.map((name) => [name, admins.find((admin) => admin.assignedBranch === name) || null])), [admins]);
  const selectedAssignment = assignmentByBranch[branch];
  useEffect(() => { setAdminId(selectedAssignment?.id || ''); }, [branch, selectedAssignment?.id]);
  useEffect(() => {
    const currentCoverage = coverage.find((item) => item.name === branch);
    setCoverageAreas((currentCoverage?.coverageAreas || []).join(', '));
  }, [branch, coverage]);

  const save = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!branch || !adminId) { setError('Select both a branch and an administrator.'); return; }
    setSaving(true);
    try {
      const result = await apiRequest(`/users/${adminId}`, { method: 'PATCH', body: JSON.stringify({ assignedBranch: branch, activeBranch: branch }) });
      const updated = result.user;
      setAdmins((current) => current.map((admin) => {
        if (admin.id === updated.id) return updated;
        return admin.assignedBranch === branch ? { ...admin, assignedBranch: '', activeBranch: '' } : admin;
      }));
      setMessage(`${updated.name || 'Administrator'} is now responsible for ${branch}.`);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update branch ownership.');
    } finally { setSaving(false); }
  };

  const saveCoverage = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!branch || !coverageAreas.trim()) {
      setError('Enter at least one city, province, or service-area name.');
      return;
    }
    setSaving(true);
    try {
      const currentCoverage = coverage.find((item) => item.name === branch);
      const result = await apiRequest(`/branches/${encodeURIComponent(branch)}`, {
        method: 'PUT',
        body: JSON.stringify({
          coverageAreas,
          nearbyBranches: currentCoverage?.nearbyBranches || BRANCHES.filter((name) => name !== branch),
          active: true,
        }),
      });
      setCoverage((current) => [...current.filter((item) => item.name !== branch), result.branch]);
      setMessage(`Service coverage for ${branch} was updated.`);
    } catch (requestError) {
      setError(requestError.message || 'Unable to save branch coverage.');
    } finally { setSaving(false); }
  };

  return <SuperAdminLayout title="Branch Management" subtitle="Assign one accountable administrator to each operating branch">
    <div className="branch-summary"><div><strong>{BRANCHES.length}</strong><span>Operating branches</span></div><div><strong>{Object.values(assignmentByBranch).filter(Boolean).length}</strong><span>Assigned admins</span></div><div><strong>{BRANCHES.length - Object.values(assignmentByBranch).filter(Boolean).length}</strong><span>Need assignment</span></div></div>
    <section className="branch-workspace">
      <div className="branch-workspace-heading"><div><p>HQ branch control</p><h2>Assign branch accountability</h2><span>Pick the branch and administrator from dropdowns. Reassigning a branch transfers its ownership cleanly.</span></div><button type="button" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button></div>
      <form className="branch-assignment-form" onSubmit={save}>
        <label>Branch<select value={branch} onChange={(event) => setBranch(event.target.value)}>{BRANCHES.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label>Responsible administrator<select value={adminId} onChange={(event) => setAdminId(event.target.value)}><option value="">Select an administrator</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name || admin.email} {admin.assignedBranch ? `— currently ${admin.assignedBranch}` : '— unassigned'}</option>)}</select></label>
        <button type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Save assignment'}</button>
      </form>
      <form className="branch-assignment-form" onSubmit={saveCoverage}>
        <label className="branch-coverage-field">Service coverage (comma-separated)<input value={coverageAreas} onChange={(event) => setCoverageAreas(event.target.value)} placeholder="e.g. Bulacan, Plaridel, Malolos" /></label>
        <p className="branch-coverage-help">Customer addresses are matched only against these configured areas. Unmatched addresses cannot be checked out.</p>
        <button type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Save coverage'}</button>
      </form>
      {message ? <p className="branch-success">{message}</p> : null}{error ? <p className="branch-error">{error}</p> : null}
    </section>
    <section className="branch-directory" aria-label="Branch assignments"><header><div><p>Branch directory</p><h2>Current ownership</h2></div></header>{loading ? <p className="branch-empty">Loading branch assignments…</p> : <div>{BRANCHES.map((name) => { const admin = assignmentByBranch[name]; const areas = coverage.find((item) => item.name === name)?.coverageAreas || []; return <article key={name}><div><strong>{name}</strong><span>{admin ? 'Assigned' : 'Needs an administrator'}</span></div>{admin ? <div className="branch-admin-detail"><b>{admin.name || 'Administrator'}</b><small>{admin.email || 'No email recorded'} · {lastActive(admin.lastLogin)}</small></div> : <p>Choose this branch above to assign an administrator.</p>}<small className="branch-coverage-list">Coverage: {areas.join(', ') || 'Not configured'}</small></article>; })}</div>}</section>
  </SuperAdminLayout>;
};

export default SuperAdminBranches;
