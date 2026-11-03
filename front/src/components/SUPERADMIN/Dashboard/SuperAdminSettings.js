import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { useUser } from '../../../context/UserContext';
import { apiRequest } from '../../../config/api';
import { translateText } from '../../../utils/customerI18n';
import {
  clearEmailPolicyCache,
  isValidDomainFormat,
  normalizeDomain,
} from '../../../domain/emailPolicy';
import './SuperAdminAccount.css';

const DEFAULT_PREFERENCES = { theme: 'light', language: 'English', currency: 'PHP', timezone: 'Asia/Manila' };
const DEFAULT_NOTIFICATIONS = { email: true, inApp: true, push: true, sms: false, accountUpdates: true, orderUpdates: true, serviceUpdates: true, systemAlerts: true };

const SuperAdminSettings = () => {
  const navigate = useNavigate();
  const { user, currentLanguage, updatePreferences, updateSettings } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesNotice, setPreferencesNotice] = useState('');
  const [preferencesError, setPreferencesError] = useState('');
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
    const savedPreferences = user?.preferences || {};
    setPreferences({
      ...DEFAULT_PREFERENCES,
      ...savedPreferences,
      theme: savedPreferences.theme || (savedPreferences.darkMode ? 'dark' : 'light'),
    });
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
      setNotice('System settings saved.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to save system settings.');
    } finally { setSaving(false); }
  };

  const updateDisplayPreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setPreferencesNotice('');
    setPreferencesError('');
  };

  const saveDisplayPreferences = async () => {
    setSavingPreferences(true);
    setPreferencesNotice('');
    setPreferencesError('');
    try {
      await updatePreferences({ ...preferences, darkMode: preferences.theme === 'dark' });
      setPreferencesNotice('Display preferences saved to your account.');
    } catch (requestError) {
      setPreferencesError(requestError.message || 'Unable to save display preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  return <SuperAdminLayout title="System Settings" subtitle="Manage your HQ workspace, alerts, and executive preferences">
    <section className="hq-settings-intro"><div><p>{t('HQ account controls')}</p><h2>{t('Executive workspace settings')}</h2><span>{t('These settings apply to your SuperAdmin account and the alerts delivered to you.')}</span></div><button type="button" onClick={() => navigate('/superadmin/profile')}>{t('Open my profile')}</button></section>
    <form className="hq-account-grid" onSubmit={save}>
      <section className="hq-account-card">
        <div className="hq-card-heading"><p>{t('Workspace')}</p><h3>{t('Display preferences')}</h3></div>
        <p>{t('Choose your account display options, then save them here.')}</p>
        <label>{t('Theme')}<select value={preferences.theme} onChange={(event) => updateDisplayPreference('theme', event.target.value)}><option value="light">{t('Light')}</option><option value="dark">{t('Dark')}</option></select></label>
        <label>{t('Language')}<select value={preferences.language} onChange={(event) => updateDisplayPreference('language', event.target.value)}><option value="English">{t('English')}</option><option value="Filipino">{t('Filipino')}</option></select></label>
        <label>{t('Currency')}<select value={preferences.currency} onChange={(event) => updateDisplayPreference('currency', event.target.value)}><option value="PHP">PHP — Philippine Peso</option><option value="USD">USD — US Dollar</option></select></label>
        <label>{t('Time zone')}<select value={preferences.timezone} onChange={(event) => updateDisplayPreference('timezone', event.target.value)}><option value="Asia/Manila">Asia/Manila (PHT)</option><option value="UTC">UTC</option></select></label>
        <button type="button" className="hq-display-save" onClick={saveDisplayPreferences} disabled={savingPreferences}>{t(savingPreferences ? 'Saving display preferences…' : 'Save display preferences')}</button>
        {preferencesNotice ? <span className="hq-success" role="status">{t(preferencesNotice)}</span> : null}
        {preferencesError ? <span className="hq-error" role="alert">{t(preferencesError)}</span> : null}
      </section>
      <section className="hq-account-card"><div className="hq-card-heading"><p>{t('Alert delivery')}</p><h3>{t('Alert preferences')}</h3></div>{[
        ['inApp', 'In-app alerts', 'Show transactions, requests, maintenance, and inventory alerts in the alert bell.'],
        ['push', 'Push alerts', 'Receive important HQ alerts on registered devices.'],
        ['email', 'Email alerts', 'Send important account and operational updates to your email.'],
        ['accountUpdates', 'Account security', 'Receive password and account-related updates.'],
        ['orderUpdates', 'Transactions', 'Receive customer orders, payments, and delivery updates.'],
        ['serviceUpdates', 'Requests and maintenance', 'Receive service requests, warranty claims, and technician updates.'],
        ['systemAlerts', 'System alerts', 'Receive inventory, branch, and operational alerts.'],
      ].map(([key, title, description]) => <label key={key} className="hq-toggle-row"><span><b>{t(title)}</b><small>{t(description)}</small></span><input type="checkbox" checked={Boolean(notifications[key])} onChange={() => setNotifications((current) => ({ ...current, [key]: !current[key] }))} /></label>)}</section>
      <section className="hq-account-card hq-domain-policy-card">
        <div className="hq-card-heading"><p>{t('Account protection')}</p><h3>{t('Email Domain Whitelist')}</h3></div>
        <p>{t('Only active domains can be used for new accounts, email changes, and other submitted user email addresses. Disposable providers remain blocked by the server.')}</p>
        <div className="hq-domain-selector">
          <button type="button" className="hq-domain-selector-button" aria-expanded={domainMenuOpen} onClick={() => setDomainMenuOpen((current) => !current)} disabled={policyLoading}>
            <span>{policyLoading ? t('Loading domains…') : `${emailDomains.filter((entry) => entry.enabled).length} ${t('active of')} ${emailDomains.length} ${t('domains')}`}</span>
            <b aria-hidden="true">{domainMenuOpen ? '▲' : '▼'}</b>
          </button>
          {domainMenuOpen ? <div className="hq-domain-menu" role="group" aria-label={t('Allowed email domains')}>
            {emailDomains.length ? emailDomains.map((entry) => <div className="hq-domain-option" key={entry.domain}>
              <label><input type="checkbox" checked={Boolean(entry.enabled)} onChange={() => toggleEmailDomain(entry.domain)} /><span><b>{entry.domain}</b><small>{t(entry.source === 'default' ? 'Common provider' : 'Custom domain')}</small></span></label>
              <button type="button" onClick={() => removeEmailDomain(entry.domain)} aria-label={`${t('Remove')} ${entry.domain}`}>{t('Remove')}</button>
            </div>) : <p className="hq-domain-empty">{t('No domains are configured.')}</p>}
          </div> : null}
        </div>
        <div className="hq-domain-add-row">
          <label>{t('Company, organization, or school domain')}<input value={customDomain} onChange={(event) => { setCustomDomain(event.target.value); setPolicyError(''); }} placeholder="example.edu.ph" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addEmailDomain(); } }} /></label>
          <button type="button" onClick={addEmailDomain}>{t('Add domain')}</button>
        </div>
        <button type="button" className="hq-domain-save-button" onClick={saveEmailDomains} disabled={policyLoading || policySaving}>{t(policySaving ? 'Saving whitelist…' : 'Save email whitelist')}</button>
        {policyNotice ? <span className="hq-success" role="status">{t(policyNotice)}</span> : null}
        {policyError ? <span className="hq-error" role="alert">{t(policyError)}</span> : null}
      </section>
      <section className="hq-save-row">{notice ? <span className="hq-success">{t(notice)}</span> : null}{error ? <span className="hq-error">{t(error)}</span> : null}<button type="submit" disabled={saving}>{t(saving ? 'Saving…' : 'Save System Settings')}</button></section>
    </form>
  </SuperAdminLayout>;
};

export default SuperAdminSettings;
