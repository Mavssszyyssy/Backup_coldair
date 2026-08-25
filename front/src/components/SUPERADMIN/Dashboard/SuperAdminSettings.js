import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { useUser } from '../../../context/UserContext';
import './SuperAdminAccount.css';

const DEFAULT_PREFERENCES = { language: 'English', currency: 'PHP', timezone: 'Asia/Manila' };
const DEFAULT_NOTIFICATIONS = { email: true, inApp: true, push: true, sms: false, accountUpdates: true, systemAlerts: true };

const SuperAdminSettings = () => {
  const navigate = useNavigate();
  const { user, updateSettings } = useUser();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPreferences({ ...DEFAULT_PREFERENCES, ...(user?.preferences || {}) });
    setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(user?.notifications || {}) });
  }, [user]);

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

  return <SuperAdminLayout title="SuperAdmin Settings" subtitle="Manage your HQ workspace, alerts, and executive preferences">
    <section className="hq-settings-intro"><div><p>HQ account controls</p><h2>Executive workspace settings</h2><span>These settings apply to your SuperAdmin account and the alerts delivered to you.</span></div><button type="button" onClick={() => navigate('/superadmin/profile')}>Open my profile</button></section>
    <form className="hq-account-grid" onSubmit={save}>
      <section className="hq-account-card"><div className="hq-card-heading"><p>Workspace</p><h3>Display preferences</h3></div><label>Language<select value={preferences.language} onChange={(event) => setPreferences((current) => ({ ...current, language: event.target.value }))}><option value="English">English</option><option value="Filipino">Filipino</option></select></label><label>Currency<select value={preferences.currency} onChange={(event) => setPreferences((current) => ({ ...current, currency: event.target.value }))}><option value="PHP">PHP — Philippine Peso</option><option value="USD">USD — US Dollar</option></select></label><label>Time zone<select value={preferences.timezone} onChange={(event) => setPreferences((current) => ({ ...current, timezone: event.target.value }))}><option value="Asia/Manila">Asia/Manila (PHT)</option><option value="UTC">UTC</option></select></label></section>
      <section className="hq-account-card"><div className="hq-card-heading"><p>Alert delivery</p><h3>Notification preferences</h3></div>{[
        ['inApp', 'In-app alerts', 'Show HQ orders, inventory, and customer-support alerts in the notification bell.'],
        ['push', 'Push notifications', 'Receive important HQ alerts on registered devices.'],
        ['email', 'Email notifications', 'Send important account and operational updates to your email.'],
        ['sms', 'SMS notifications', 'Use SMS for critical SuperAdmin alerts.'],
        ['accountUpdates', 'Account security', 'Receive password and account-related updates.'],
        ['systemAlerts', 'System alerts', 'Receive inventory, branch, and operational alerts.'],
      ].map(([key, title, description]) => <label key={key} className="hq-toggle-row"><span><b>{title}</b><small>{description}</small></span><input type="checkbox" checked={Boolean(notifications[key])} onChange={() => setNotifications((current) => ({ ...current, [key]: !current[key] }))} /></label>)}</section>
      <section className="hq-account-card hq-authority-card"><div className="hq-card-heading"><p>Authority</p><h3>SuperAdmin access</h3></div><p>You have company-wide visibility and can manage branch ownership, inventory, staff, transactions, and reorders.</p><div className="hq-quick-links"><button type="button" onClick={() => navigate('/superadmin/branches')}>Manage branches</button><button type="button" onClick={() => navigate('/superadmin/inventory?tab=reorders')}>Review reorders</button><button type="button" onClick={() => navigate('/superadmin/alerts')}>View support alerts</button></div></section>
      <section className="hq-save-row">{notice ? <span className="hq-success">{notice}</span> : null}{error ? <span className="hq-error">{error}</span> : null}<button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></section>
    </form>
  </SuperAdminLayout>;
};

export default SuperAdminSettings;
