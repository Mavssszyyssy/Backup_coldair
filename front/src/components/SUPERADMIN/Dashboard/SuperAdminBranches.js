import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { apiRequest } from '../../../config/api';
import { BRANCHES } from '../../../domain/branches/branches';
import { validateEmailForSubmission } from '../../../domain/emailPolicy';
import { formatBusinessDate } from '../../../utils/dateTime';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import useAutoDismissMessage from '../../../hooks/useAutoDismissMessage';
import '../superAdminShared.css';
import './SuperAdminBranches.css';

const lastActive = (value, t) => value ? formatBusinessDate(value) : t('Never signed in');

const SuperAdminBranches = () => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [admins, setAdmins] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [branch, setBranch] = useState(BRANCHES[0] || '');
  const [coverageAreas, setCoverageAreas] = useState('');
  const [adminId, setAdminId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEmailId, setSavingEmailId] = useState('');
  const [message, setMessage] = useState('');
  useAutoDismissMessage(message, setMessage);
  const [error, setError] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCoverage, setNewBranchCoverage] = useState('');
  const [adminDraft, setAdminDraft] = useState({ name_first: '', name_last: '', email: '', branch: '' });
  const [oneTimePassword, setOneTimePassword] = useState('');
  const branchNames = useMemo(() => coverage.length ? coverage.map((item) => item.name) : BRANCHES, [coverage]);

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

  useEffect(() => {
    if (branchNames.length && !branchNames.includes(branch)) setBranch(branchNames[0]);
  }, [branch, branchNames]);

  const assignmentByBranch = useMemo(() => Object.fromEntries(branchNames.map((name) => [name, admins.find((admin) => admin.assignedBranch === name) || null])), [admins, branchNames]);
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
      setAdmins((current) => current.map((admin) => admin.id === updated.id ? updated : admin));
      setMessage(`${updated.name || t('Administrator')} ${t('is now responsible for')} ${branch}.`);
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
          nearbyBranches: currentCoverage?.nearbyBranches || branchNames.filter((name) => name !== branch),
          active: true,
        }),
      });
      setCoverage((current) => [...current.filter((item) => item.name !== branch), result.branch]);
      setMessage(`${t('Service coverage for')} ${branch} ${t('was updated.')}`);
    } catch (requestError) {
      setError(requestError.message || 'Unable to save branch coverage.');
    } finally { setSaving(false); }
  };

  const createBranch = async (event) => {
    event.preventDefault();
    setMessage(''); setError(''); setSaving(true);
    try {
      const result = await apiRequest('/branches', { method: 'POST', body: JSON.stringify({ name: newBranchName, coverageAreas: newBranchCoverage }) });
      setCoverage((current) => [...current, result.branch].sort((a, b) => a.name.localeCompare(b.name)));
      setBranch(result.branch.name);
      setAdminDraft((current) => ({ ...current, branch: result.branch.name }));
      setNewBranchName(''); setNewBranchCoverage('');
      setMessage(`${result.branch.name} ${t('was created with no inventory, orders, or administrator assigned.')}`);
    } catch (requestError) { setError(requestError.message || 'Unable to create branch.'); }
    finally { setSaving(false); }
  };

  const createAdministrator = async (event) => {
    event.preventDefault();
    setMessage(''); setError(''); setOneTimePassword('');
    if (assignmentByBranch[adminDraft.branch]) { setError('This branch already has an active administrator.'); return; }
    const emailError = await validateEmailForSubmission(adminDraft.email);
    if (emailError) { setError(emailError); return; }
    setSaving(true);
    try {
      const result = await apiRequest('/users/staff', { method: 'POST', body: JSON.stringify({ ...adminDraft, role: 'admin' }) });
      setAdmins((current) => [...current, result.user]);
      setOneTimePassword(result.tempPassword || '');
      if (result.deliveryWarning) setError(result.deliveryWarning);
      else setMessage(`${result.user.name || t('Administrator')} ${t('was assigned to')} ${adminDraft.branch}.`);
      setAdminDraft({ name_first: '', name_last: '', email: '', branch: '' });
    } catch (requestError) { setError(requestError.message || 'Unable to create administrator.'); }
    finally { setSaving(false); }
  };

  const saveAdminEmail = async (admin) => {
    setMessage('');
    setError('');
    const email = String(admin.email || '').trim().toLowerCase();
    const emailValidationError = await validateEmailForSubmission(email);
    if (emailValidationError) {
      setError(emailValidationError);
      return;
    }
    setSavingEmailId(admin.id);
    try {
      const result = await apiRequest(`/users/${admin.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ email }),
      });
      setAdmins((current) => current.map((item) => item.id === admin.id ? result.user : item));
      setMessage(currentLanguage === 'Filipino'
        ? `${t('Email for')} ${result.user.name || t('Administrator')} ${t('was updated successfully.')}`
        : `${result.user.name || 'Administrator'}'s email was updated successfully.`);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update the administrator email.');
    } finally {
      setSavingEmailId('');
    }
  };

  return <SuperAdminLayout title={t('Branch Management')} subtitle={t('Assign one accountable administrator to each operating branch')}>
    <div className="branch-summary"><div><strong>{branchNames.length}</strong><span>{t('Operating branches')}</span></div><div><strong>{Object.values(assignmentByBranch).filter(Boolean).length}</strong><span>{t('Assigned admins')}</span></div><div><strong>{branchNames.length - Object.values(assignmentByBranch).filter(Boolean).length}</strong><span>{t('Need assignment')}</span></div></div>
    <section className="branch-workspace" aria-label={t('Create branch and administrator')}>
      <div className="branch-workspace-heading"><div><p>{t('Branch expansion')}</p><h2>{t('Add branch')}</h2><span>{t('New branches start with no stock, orders, technicians, or administrator.')}</span></div></div>
      <form className="branch-assignment-form branch-create-form" onSubmit={createBranch}>
        <label>{t('Branch name')}<input value={newBranchName} maxLength={80} required onChange={(event) => setNewBranchName(event.target.value)} /></label>
        <label className="branch-coverage-field">{t('Service areas (comma-separated)')}<input value={newBranchCoverage} required onChange={(event) => setNewBranchCoverage(event.target.value)} placeholder={t('City or province names')} /></label>
        <button type="submit" disabled={saving || loading}>{t(saving ? 'Saving…' : 'Add branch')}</button>
      </form>
      <div className="branch-workspace-heading"><div><h2>{t('Create branch administrator')}</h2><span>{t('Only branches without an active administrator can be assigned.')}</span></div></div>
      <form className="branch-assignment-form branch-admin-form" onSubmit={createAdministrator}>
        <label>{t('First name')}<input value={adminDraft.name_first} required onChange={(event) => setAdminDraft((current) => ({ ...current, name_first: event.target.value }))} /></label>
        <label>{t('Last name')}<input value={adminDraft.name_last} required onChange={(event) => setAdminDraft((current) => ({ ...current, name_last: event.target.value }))} /></label>
        <label>{t('Email')}<input type="email" value={adminDraft.email} required onChange={(event) => setAdminDraft((current) => ({ ...current, email: event.target.value }))} /></label>
        <label>{t('Eligible branch')}<select value={adminDraft.branch} required onChange={(event) => setAdminDraft((current) => ({ ...current, branch: event.target.value }))}><option value="">{t('Select branch')}</option>{branchNames.filter((name) => !assignmentByBranch[name]).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <button type="submit" disabled={saving || loading || !adminDraft.branch}>{t(saving ? 'Creating…' : 'Create administrator')}</button>
      </form>
      {oneTimePassword ? <p className="branch-success" role="status">{t('Invitation email was unavailable. Share this one-time temporary password securely:')} <strong>{oneTimePassword}</strong>. {t('It will disappear when you leave this page.')}</p> : null}
    </section>
    <section className="branch-workspace">
      <div className="branch-workspace-heading"><div><p>{t('HQ branch control')}</p><h2>{t('Assign branch accountability')}</h2><span>{t('Only unassigned administrators can take an open branch. Existing ownership is not changed silently.')}</span></div><button type="button" onClick={load} disabled={loading}>{t(loading ? 'Loading…' : 'Refresh')}</button></div>
      <form className="branch-assignment-form branch-owner-form" onSubmit={save}>
        <label>{t('Branch')}<select value={branch} onChange={(event) => setBranch(event.target.value)}>{branchNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label>{t('Responsible administrator')}<select value={adminId} onChange={(event) => setAdminId(event.target.value)} disabled={Boolean(selectedAssignment)}><option value="">{t('Select an administrator')}</option>{admins.filter((admin) => !admin.assignedBranch || admin.id === selectedAssignment?.id).map((admin) => <option key={admin.id} value={admin.id}>{admin.name || admin.email} {t(admin.assignedBranch ? '— current owner' : '— unassigned')}</option>)}</select></label>
        <button type="submit" disabled={saving || loading || Boolean(selectedAssignment)}>{t(saving ? 'Saving…' : 'Save assignment')}</button>
      </form>
      <form className="branch-assignment-form" onSubmit={saveCoverage}>
        <label className="branch-coverage-field">{t('Service coverage (comma-separated)')}<input value={coverageAreas} onChange={(event) => setCoverageAreas(event.target.value)} placeholder={t('e.g. Bulacan, Plaridel, Malolos')} /><small className="branch-coverage-help">{t('Customer addresses are matched only against these configured areas. Unmatched addresses cannot be checked out.')}</small></label>
        <button type="submit" disabled={saving || loading}>{t(saving ? 'Saving…' : 'Save coverage')}</button>
      </form>
      {message ? <p className="branch-success">{message}</p> : null}{error ? <p className="branch-error">{t(error)}</p> : null}
    </section>
    <section className="branch-directory" aria-label={t('Branch assignments')}><header><div><p>{t('Branch directory')}</p><h2>{t('Current ownership')}</h2></div></header>{loading ? <p className="branch-empty">{t('Loading branch assignments…')}</p> : <div>{branchNames.map((name) => { const admin = assignmentByBranch[name]; const areas = coverage.find((item) => item.name === name)?.coverageAreas || []; return <article key={name}><div><strong>{name}</strong><span>{t(admin ? 'Assigned' : 'Needs an administrator')}</span></div>{admin ? <div className="branch-admin-detail"><b>{admin.name || t('Administrator')}</b><small>{admin.email || t('No email recorded')} · {lastActive(admin.lastLogin, t)}</small></div> : <p>{t('Choose this branch above to assign an administrator.')}</p>}<small className="branch-coverage-list">{t('Coverage')}: {areas.join(', ') || t('Not configured')}</small></article>; })}</div>}</section>
    <section className="branch-directory branch-email-directory" aria-label={t('Administrator email management')}><header><div><p>{t('Administrator accounts')}</p><h2>{t('Contact email addresses')}</h2><span>{t("Editing an email does not change the administrator's account ID, branch, permissions, password, or session ownership.")}</span></div></header>{loading ? <p className="branch-empty">{t('Loading administrator accounts…')}</p> : <div>{admins.map((admin) => <article key={admin.id}><div><strong>{admin.name || t('Administrator')}</strong><span>{admin.assignedBranch || t('Unassigned')}</span></div><label>{t('Email address')}<input type="email" value={admin.email || ''} onChange={(event) => setAdmins((current) => current.map((item) => item.id === admin.id ? { ...item, email: event.target.value } : item))} placeholder="name@example.com" disabled={savingEmailId === admin.id} /></label><button type="button" onClick={() => saveAdminEmail(admin)} disabled={Boolean(savingEmailId)}>{t(savingEmailId === admin.id ? 'Saving…' : 'Save email')}</button></article>)}</div>}</section>
  </SuperAdminLayout>;
};

export default SuperAdminBranches;
