import SearchableSelect from "../../common/SearchableSelect";
import LoadingSkeleton from "../../common/LoadingSkeleton";
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { apiRequest } from '../../../config/api';
import { loadPageRequests } from '../../../config/loadPageRequests';
import { BRANCHES } from '../../../domain/branches/branches';
import { EMAIL_FORMAT_MESSAGE, isValidEmailFormat, validateEmailForSubmission } from '../../../domain/emailPolicy';
import { PERSON_NAME_MAX_LENGTH, validatePersonName } from '../../../domain/personNameValidation';
import {
  COVERAGE_MAX_LENGTH, LOCATION_MAX_LENGTH, validateBranchName, validateServiceAreas,
} from '../../../domain/branches/branchInputValidation';
import { formatBusinessDate } from '../../../utils/dateTime';
import { confirmDialog } from '../../../utils/dialog';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import useAutoDismissMessage from '../../../hooks/useAutoDismissMessage';
import '../superAdminShared.css';
import './SuperAdminBranches.css';

const lastActive = (value, t) => value ? formatBusinessDate(value) : t('Never signed in');

function BranchTextField({ label, error, help, className, ...props }) {
  const id = useId();
  const descriptionId = help || error ? `${id}-description` : undefined;
  return <div className={className}>
    <label htmlFor={id}>{label}</label>
    <input {...props} id={id} aria-invalid={error ? true : undefined} aria-describedby={descriptionId} />
    {descriptionId && <small id={descriptionId} role={error ? 'alert' : undefined} className={error ? 'branch-field-error' : 'branch-coverage-help'}>{error || help}</small>}
  </div>;
}

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
  const [validatedFields, setValidatedFields] = useState({});
  const [oneTimePassword, setOneTimePassword] = useState('');
  const [createdLoginId, setCreatedLoginId] = useState('');
  const branchNames = useMemo(() => coverage.length ? coverage.map((item) => item.name) : BRANCHES, [coverage]);
  const knownLocations = useMemo(() => coverage.flatMap((item) => [item.name, ...(item.coverageAreas || [])]), [coverage]);
  const fieldErrors = {
    branchName: validateBranchName(newBranchName).error,
    newCoverage: validateServiceAreas(newBranchCoverage, knownLocations).error,
    savedCoverage: validateServiceAreas(coverageAreas, knownLocations).error,
    firstName: validatePersonName(adminDraft.name_first, 'First name'),
    lastName: validatePersonName(adminDraft.name_last, 'Last name'),
    email: isValidEmailFormat(adminDraft.email) ? '' : EMAIL_FORMAT_MESSAGE,
  };
  const checkFields = (...keys) => {
    setValidatedFields((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, true])) }));
    return keys.every((key) => !fieldErrors[key]);
  };
  const fieldFeedback = (key) => ({
    onBlur: () => checkFields(key),
    error: validatedFields[key] && fieldErrors[key] ? t(fieldErrors[key]) : '',
  });
  const resetFieldFeedback = (...keys) => {
    setValidatedFields((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, false])) }));
  };

  const loadRevision = useRef(0);
  const load = useCallback(async (fresh = false) => {
    const revision = ++loadRevision.current;
    setLoading(true);
    setError('');
    const showBranches = ([usersResult, coverageResult]) => {
      if (revision !== loadRevision.current) return;
      setAdmins(Array.isArray(usersResult.users) ? usersResult.users : []);
      setCoverage(Array.isArray(coverageResult.branches) ? coverageResult.branches : []);
      setLoading(false);
    };
    try {
      showBranches(await loadPageRequests(['/users?role=admin', '/branches'], { fresh, onCached: showBranches }));
    } catch (requestError) {
      if (revision !== loadRevision.current) return;
      setAdmins([]);
      setCoverage([]);
      setError(requestError.message || 'Unable to load branch administrators.');
    } finally { if (revision === loadRevision.current) setLoading(false); }
  }, []);
  useEffect(() => { load(); return () => { loadRevision.current += 1; }; }, [load]);

  useEffect(() => {
    if (branchNames.length && !branchNames.includes(branch)) setBranch(branchNames[0]);
  }, [branch, branchNames]);

  const branchOf = (admin) => branchNames.includes(admin.activeBranch) ? admin.activeBranch : admin.assignedBranch;
  const activeAdmins = admins.filter((admin) => !["disabled", "deleted"].includes(admin.accountStatus));
  const assignmentByBranch = Object.fromEntries(branchNames.map((name) => [name, activeAdmins.find((admin) => branchOf(admin) === name) || null]));
  const selectedAssignment = assignmentByBranch[branch];
  useEffect(() => { setAdminId(selectedAssignment?.id || ''); }, [branch, selectedAssignment?.id]);
  useEffect(() => {
    const currentCoverage = coverage.find((item) => item.name === branch);
    setCoverageAreas((currentCoverage?.coverageAreas || []).join(', '));
    setValidatedFields((current) => ({ ...current, savedCoverage: false }));
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

  const removeAssignment = async () => {
    if (!selectedAssignment || saving || loading) return;
    const ownerName = selectedAssignment.name || selectedAssignment.email || t('Administrator');
    const confirmation = t('Remove {administrator} from {branch}? This administrator will lose branch access and be signed out.')
      .replace(/\{(administrator|branch)\}/g, (_, key) => key === 'administrator' ? ownerName : branch);
    await confirmDialog({
      title: t('Remove branch assignment?'),
      message: confirmation,
      confirmText: t('Remove assignment'),
      pendingText: t('Removing assignment…'),
      destructive: true,
      errorMessage: t('Unable to remove the branch assignment.'),
      onConfirm: async () => {
        setMessage('');
        setError('');
        setSaving(true);
        try {
          const result = await apiRequest(`/users/${selectedAssignment.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ unassignBranch: branch }),
          });
          setAdmins((current) => current.map((admin) => admin.id === result.user.id ? result.user : admin));
          setMessage(t('Branch assignment removed.'));
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const saveCoverage = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (saving || !branch || !checkFields('savedCoverage')) return;
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
    if (saving) return;
    setMessage(''); setError('');
    if (!checkFields('branchName', 'newCoverage')) return;
    setSaving(true);
    try {
      const result = await apiRequest('/branches', { method: 'POST', body: JSON.stringify({ name: newBranchName, coverageAreas: newBranchCoverage }) });
      setCoverage((current) => [...current, result.branch].sort((a, b) => a.name.localeCompare(b.name)));
      setBranch(result.branch.name);
      setAdminDraft((current) => ({ ...current, branch: result.branch.name }));
      setNewBranchName(''); setNewBranchCoverage('');
      resetFieldFeedback('branchName', 'newCoverage');
      setMessage(`${result.branch.name} ${t('was created with no inventory, orders, or administrator assigned.')}`);
    } catch (requestError) { setError(requestError.message || 'Unable to create branch.'); }
    finally { setSaving(false); }
  };

  const createAdministrator = async (event) => {
    event.preventDefault();
    if (saving) return;
    setMessage(''); setError(''); setOneTimePassword(''); setCreatedLoginId('');
    if (!checkFields('firstName', 'lastName', 'email')) return;
    if (!branchNames.includes(adminDraft.branch)) { setError('Select branch'); return; }
    if (assignmentByBranch[adminDraft.branch]) { setError('This branch already has an active administrator.'); return; }
    setSaving(true);
    try {
      const emailError = await validateEmailForSubmission(adminDraft.email);
      if (emailError) { setError(emailError); return; }
      const result = await apiRequest('/users/staff', { method: 'POST', body: JSON.stringify({ ...adminDraft, role: 'admin' }) });
      setAdmins((current) => [...current, result.user]);
      setOneTimePassword(result.tempPassword || '');
      setCreatedLoginId(result.loginIdentifier || '');
      if (result.deliveryWarning) setError(result.deliveryWarning);
      else setMessage(`${result.user.name || t('Administrator')} ${t('was assigned to')} ${adminDraft.branch}.`);
      setAdminDraft({ name_first: '', name_last: '', email: '', branch: '' });
      resetFieldFeedback('firstName', 'lastName', 'email');
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
      <form className="branch-assignment-form branch-create-form" noValidate onSubmit={createBranch}>
        <BranchTextField className="branch-text-field" label={t('Branch name')} value={newBranchName}
          maxLength={LOCATION_MAX_LENGTH} required onChange={(event) => setNewBranchName(event.target.value)} {...fieldFeedback('branchName')} />
        <BranchTextField className="branch-text-field branch-coverage-field" label={t('Service areas (comma-separated)')}
          maxLength={COVERAGE_MAX_LENGTH} value={newBranchCoverage} required onChange={(event) => setNewBranchCoverage(event.target.value)}
          placeholder={t('City or province names')} {...fieldFeedback('newCoverage')} />
        <button type="submit" disabled={saving || loading}>{t(saving ? 'Saving…' : 'Add branch')}</button>
      </form>
      <div className="branch-workspace-heading"><div><h2>{t('Create branch administrator')}</h2><span>{t('Only branches without an active administrator can be assigned.')}</span></div></div>
      <form className="branch-assignment-form branch-admin-form" noValidate onSubmit={createAdministrator}>
        <BranchTextField className="branch-text-field" label={t('First name')} value={adminDraft.name_first}
          maxLength={PERSON_NAME_MAX_LENGTH} autoComplete="given-name" required onChange={(event) => setAdminDraft((current) => ({ ...current, name_first: event.target.value }))} {...fieldFeedback('firstName')} />
        <BranchTextField className="branch-text-field" label={t('Last name')} value={adminDraft.name_last}
          maxLength={PERSON_NAME_MAX_LENGTH} autoComplete="family-name" required onChange={(event) => setAdminDraft((current) => ({ ...current, name_last: event.target.value }))} {...fieldFeedback('lastName')} />
        <BranchTextField className="branch-text-field branch-admin-email" label={t('Email')} maxLength={254} type="email" value={adminDraft.email}
          autoComplete="email" required onChange={(event) => setAdminDraft((current) => ({ ...current, email: event.target.value }))} {...fieldFeedback('email')} />
        <label>{t('Eligible branch')}<SearchableSelect value={adminDraft.branch} required onChange={(event) => setAdminDraft((current) => ({ ...current, branch: event.target.value }))}><option value="">{t('Select branch')}</option>{branchNames.filter((name) => !assignmentByBranch[name]).map((name) => <option key={name} value={name}>{name}</option>)}</SearchableSelect></label>
        <button type="submit" disabled={saving || loading || !adminDraft.branch}>{t(saving ? 'Creating…' : 'Create administrator')}</button>
      </form>
      {oneTimePassword ? <p className="branch-success" role="status">{t('Invitation email was unavailable. Share this one-time temporary password securely:')} <strong>{oneTimePassword}</strong>. {t('It will disappear when you leave this page.')}</p> : null}
      {createdLoginId ? <p className="branch-success" role="status">{t('Account Login ID:')} <strong>{createdLoginId}</strong>. {t('Use this Login ID to sign in with the shared demo email account.')}</p> : null}
    </section>
    <section className="branch-workspace">
      <div className="branch-workspace-heading"><div><p>{t('HQ branch control')}</p><h2>{t('Assign branch accountability')}</h2><span>{t('Remove the current assignment to free the branch and make the administrator available for reassignment.')}</span></div><button type="button" onClick={() => load(true)} disabled={loading || saving}>{t(loading ? 'Loading…' : 'Refresh')}</button></div>
      <form className="branch-assignment-form branch-owner-form" onSubmit={save}>
        <label>{t('Branch')}<SearchableSelect value={branch} disabled={saving || loading} onChange={(event) => setBranch(event.target.value)}>{branchNames.map((name) => <option key={name} value={name}>{name}</option>)}</SearchableSelect></label>
        <label>{t('Responsible administrator')}<SearchableSelect value={adminId} onChange={(event) => setAdminId(event.target.value)} disabled={saving || loading || Boolean(selectedAssignment)}><option value="">{t('Select an administrator')}</option>{activeAdmins.filter((admin) => !branchOf(admin) || admin.id === selectedAssignment?.id).map((admin) => <option key={admin.id} value={admin.id}>{admin.name || admin.email} {t(branchOf(admin) ? '— current owner' : '— unassigned')}</option>)}</SearchableSelect></label>
        {selectedAssignment
          ? <button type="button" className="branch-remove-assignment" disabled={saving || loading} onClick={removeAssignment}>{t('Remove assignment')}</button>
          : <button type="submit" disabled={saving || loading || !adminId}>{t(saving ? 'Saving…' : 'Save assignment')}</button>}
      </form>
      <form className="branch-assignment-form" onSubmit={saveCoverage}>
        <BranchTextField className="branch-text-field branch-coverage-field" label={t('Service coverage (comma-separated)')}
          maxLength={COVERAGE_MAX_LENGTH} value={coverageAreas} onChange={(event) => setCoverageAreas(event.target.value)}
          placeholder={t('e.g. Bulacan, Plaridel, Malolos')}
          help={t('Customer addresses are matched only against these configured areas. Unmatched addresses cannot be checked out.')}
          {...fieldFeedback('savedCoverage')} />
        <button type="submit" disabled={saving || loading}>{t(saving ? 'Saving…' : 'Save coverage')}</button>
      </form>
      {message ? <p className="branch-success" role="status">{message}</p> : null}{error ? <p className="branch-error" role="alert">{t(error)}</p> : null}
    </section>
    <section className="branch-directory" aria-label={t('Branch assignments')}><header><div><p>{t('Branch directory')}</p><h2>{t('Current ownership')}</h2></div></header>{loading ? <LoadingSkeleton label={t('Loading branch assignments…')} variant="table" /> : <div>{branchNames.map((name) => { const admin = assignmentByBranch[name]; const areas = coverage.find((item) => item.name === name)?.coverageAreas || []; return <article key={name}><div><strong>{name}</strong><span>{t(admin ? 'Assigned' : 'Needs an administrator')}</span></div>{admin ? <div className="branch-admin-detail"><b>{admin.name || t('Administrator')}</b><small>{admin.email || t('No email recorded')} · {lastActive(admin.lastLogin, t)}</small></div> : <p>{t('Choose this branch above to assign an administrator.')}</p>}<small className="branch-coverage-list">{t('Coverage')}: {areas.join(', ') || t('Not configured')}</small></article>; })}</div>}</section>
    <section className="branch-directory branch-email-directory" aria-label={t('Administrator email management')}><header><div><p>{t('Administrator accounts')}</p><h2>{t('Contact email addresses')}</h2><span>{t("Editing an email does not change the administrator's account ID, branch, permissions, password, or session ownership.")}</span></div></header>{loading ? <LoadingSkeleton label={t('Loading administrator accounts…')} variant="table" /> : <div>{admins.map((admin) => <article key={admin.id}><div><strong>{admin.name || t('Administrator')}</strong><span>{admin.assignedBranch || t('Unassigned')}</span></div><label>{t('Email address')}<input maxLength={254} type="email" value={admin.email || ''} onChange={(event) => setAdmins((current) => current.map((item) => item.id === admin.id ? { ...item, email: event.target.value } : item))} placeholder="name@example.com" disabled={savingEmailId === admin.id} /></label><button type="button" onClick={() => saveAdminEmail(admin)} disabled={Boolean(savingEmailId)}>{t(savingEmailId === admin.id ? 'Saving…' : 'Save email')}</button></article>)}</div>}</section>
  </SuperAdminLayout>;
};

export default SuperAdminBranches;
