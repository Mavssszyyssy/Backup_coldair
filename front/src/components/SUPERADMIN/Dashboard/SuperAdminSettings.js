import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { useUser } from '../../../context/UserContext';
import { apiRequest } from '../../../config/api';
import {
  clearEmailPolicyCache,
  isValidDomainFormat,
  normalizeDomain,
} from '../../../domain/emailPolicy';
import './SuperAdminAccount.css';

const DEFAULT_PREFERENCES = { language: 'English', currency: 'PHP', timezone: 'Asia/Manila' };
const DEFAULT_NOTIFICATIONS = { email: true, inApp: true, push: true, sms: false, accountUpdates: true, orderUpdates: true, serviceUpdates: true, systemAlerts: true };

const SuperAdminSettings = () => {
  const navigate = useNavigate();
  const { user, updateSettings } = useUser();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [emailDomains, setEmailDomains] = useState([]);
  const [domainMenuOpen, setDomainMenuOpen] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyNotice, setPolicyNotice] = useState('');
  const [policyError, setPolicyError] = useState('');

  useEffect(() => {
    setPreferences({ ...DEFAULT_PREFERENCES, ...(user?.preferences || {}) });
    setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(user?.notifications || {}), sms: false });
  }, [user]);

  useEffect(() => {
    let active = true;
    const loadEmailDomains = async () => {
      setPolicyLoading(true);
      setPolicyError('');
      try {
        const result = await apiRequest('/system-settings/email-domains');
        if (active) setEmailDomains(Array.isArray(result.domains) ? result.domains : []);
      } catch (requestError) {
        if (active) setPolicyError(requestError.message || 'Unable to load the email domain whitelist.');
      } finally {
        if (active) setPolicyLoading(false);
      }
    };
    loadEmailDomains();
    return () => { active = false; };
  }, []);

  const addEmailDomain = () => {
    const domain = normalizeDomain(customDomain);
    setPolicyNotice('');
    if (!isValidDomainFormat(domain)) {
      setPolicyError('Enter a valid domain such as company.com or school.edu.ph.');
      return;
    }
    if (emailDomains.some((entry) => entry.domain === domain)) {
      setPolicyError('That email domain is already in the whitelist.');
      return;
    }
    setEmailDomains((current) => [...current, { domain, enabled: true, source: 'custom' }]
      .sort((left, right) => left.domain.localeCompare(right.domain)));
    setCustomDomain('');
    setPolicyError('');
    setDomainMenuOpen(true);
  };

  const toggleEmailDomain = (domain) => {
    setPolicyNotice('');
    setPolicyError('');
    setEmailDomains((current) => current.map((entry) => (
      entry.domain === domain ? { ...entry, enabled: !entry.enabled } : entry
    )));
  };

  const removeEmailDomain = (domain) => {
    setPolicyNotice('');
    setPolicyError('');
    setEmailDomains((current) => current.filter((entry) => entry.domain !== domain));
  };

  const saveEmailDomains = async () => {
    setPolicySaving(true);
    setPolicyNotice('');
    setPolicyError('');
    try {
      const result = await apiRequest('/system-settings/email-domains', {
        method: 'PUT',
        body: JSON.stringify({ domains: emailDomains }),
      });
      setEmailDomains(Array.isArray(result.domains) ? result.domains : []);
      clearEmailPolicyCache();
      setPolicyNotice(result.message || 'Email domain whitelist saved and applied system-wide.');
    } catch (requestError) {
      setPolicyError(requestError.message || 'Unable to save the email domain whitelist.');
    } finally {
      setPolicySaving(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setNotice(''); setError('');
    try {
      await updateSettings({ preferences, notifications });
      setNotice('SuperAdmin settings saved.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to save settings.');
    } finally { setSaving(false); }
  };

  return <SuperAdminLayout title="SuperAdmin Settings" subtitle="Manage your HQ workspace, notifications, and executive preferences">
    <section className="hq-settings-intro"><div><p>HQ account controls</p><h2>Executive workspace settings</h2><span>These settings apply to your SuperAdmin account and the notifications delivered to you.</span></div><button type="button" onClick={() => navigate('/superadmin/profile')}>Open my profile</button></section>
    <form className="hq-account-grid" onSubmit={save}>
      <section className="hq-account-card"><div className="hq-card-heading"><p>Workspace</p><h3>Display preferences</h3></div><label>Language<select value={preferences.language} onChange={(event) => setPreferences((current) => ({ ...current, language: event.target.value }))}><option value="English">English</option><option value="Filipino">Filipino</option></select></label><label>Currency<select value={preferences.currency} onChange={(event) => setPreferences((current) => ({ ...current, currency: event.target.value }))}><option value="PHP">PHP — Philippine Peso</option><option value="USD">USD — US Dollar</option></select></label><label>Time zone<select value={preferences.timezone} onChange={(event) => setPreferences((current) => ({ ...current, timezone: event.target.value }))}><option value="Asia/Manila">Asia/Manila (PHT)</option><option value="UTC">UTC</option></select></label></section>
      <section className="hq-account-card"><div className="hq-card-heading"><p>Notification delivery</p><h3>Notification preferences</h3></div>{[
        ['inApp', 'In-app notifications', 'Show transactions, requests, maintenance, and inventory notifications in the notification bell.'],
        ['push', 'Push notifications', 'Receive important HQ notifications on registered devices.'],
        ['email', 'Email notifications', 'Send important account and operational updates to your email.'],
        ['accountUpdates', 'Account security', 'Receive password and account-related updates.'],
        ['orderUpdates', 'Transactions', 'Receive customer orders, payments, and delivery updates.'],
        ['serviceUpdates', 'Requests and maintenance', 'Receive service requests, warranty claims, and technician updates.'],
        ['systemAlerts', 'System notifications', 'Receive inventory, branch, and operational notifications.'],
      ].map(([key, title, description]) => <label key={key} className="hq-toggle-row"><span><b>{title}</b><small>{description}</small></span><input type="checkbox" checked={Boolean(notifications[key])} onChange={() => setNotifications((current) => ({ ...current, [key]: !current[key] }))} /></label>)}</section>
      <section className="hq-account-card hq-domain-policy-card">
        <div className="hq-card-heading"><p>Account protection</p><h3>Email Domain Whitelist</h3></div>
        <p>Only active domains can be used for new accounts, email changes, and other submitted user email addresses. Disposable providers remain blocked by the server.</p>
        <div className="hq-domain-selector">
          <button type="button" className="hq-domain-selector-button" aria-expanded={domainMenuOpen} onClick={() => setDomainMenuOpen((current) => !current)} disabled={policyLoading}>
            <span>{policyLoading ? 'Loading domains…' : `${emailDomains.filter((entry) => entry.enabled).length} active of ${emailDomains.length} domains`}</span>
            <b aria-hidden="true">{domainMenuOpen ? '▲' : '▼'}</b>
          </button>
          {domainMenuOpen ? <div className="hq-domain-menu" role="group" aria-label="Allowed email domains">
            {emailDomains.length ? emailDomains.map((entry) => <div className="hq-domain-option" key={entry.domain}>
              <label><input type="checkbox" checked={Boolean(entry.enabled)} onChange={() => toggleEmailDomain(entry.domain)} /><span><b>{entry.domain}</b><small>{entry.source === 'default' ? 'Common provider' : 'Custom domain'}</small></span></label>
              <button type="button" onClick={() => removeEmailDomain(entry.domain)} aria-label={`Remove ${entry.domain}`}>Remove</button>
            </div>) : <p className="hq-domain-empty">No domains are configured.</p>}
          </div> : null}
        </div>
        <div className="hq-domain-add-row">
          <label>Company, organization, or school domain<input value={customDomain} onChange={(event) => { setCustomDomain(event.target.value); setPolicyError(''); }} placeholder="example.edu.ph" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addEmailDomain(); } }} /></label>
          <button type="button" onClick={addEmailDomain}>Add domain</button>
        </div>
        <button type="button" className="hq-domain-save-button" onClick={saveEmailDomains} disabled={policyLoading || policySaving}>{policySaving ? 'Saving whitelist…' : 'Save email whitelist'}</button>
        {policyNotice ? <span className="hq-success" role="status">{policyNotice}</span> : null}
        {policyError ? <span className="hq-error" role="alert">{policyError}</span> : null}
      </section>
      <section className="hq-account-card hq-authority-card"><div className="hq-card-heading"><p>Authority</p><h3>SuperAdmin access</h3></div><p>You have company-wide visibility and can manage branch ownership, inventory, staff, transactions, and reorders.</p><div className="hq-quick-links"><button type="button" onClick={() => navigate('/superadmin/branches')}>Manage branches</button><button type="button" onClick={() => navigate('/superadmin/inventory?tab=reorders')}>Review reorders</button><button type="button" onClick={() => navigate('/superadmin/alerts')}>View operations alerts</button></div></section>
      <section className="hq-save-row">{notice ? <span className="hq-success">{notice}</span> : null}{error ? <span className="hq-error">{error}</span> : null}<button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></section>
    </form>
  </SuperAdminLayout>;
};

export default SuperAdminSettings;
