import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Common/AdminLayout';
import { useUser } from '../../../context/UserContext';
import { COMPANY_CONTACT, COMPANY_PROFILE, getCompanyBranch } from '../../../config/company';
import { appendAuditLog } from '../../../utils/auditLogs';
import { translateText } from '../../../utils/customerI18n';
import useAutoDismissMessage from '../../../hooks/useAutoDismissMessage';
import '../adminShared.css';

const DEFAULT_NOTIFICATIONS = {
  email: true,
  inApp: true,
  push: true,
  accountUpdates: true,
  orderUpdates: true,
  serviceUpdates: true,
  systemAlerts: true,
};

const ReadOnlyDetail = ({ label, value, hint = 'Managed by SuperAdmin' }) => (
  <div className="admin-readonly-detail">
    <span>{label}</span>
    <div>
      <strong>{value || 'Not configured'}</strong>
      <small><span aria-hidden="true">🔒</span> {hint}</small>
    </div>
  </div>
);

function AdminSettings() {
  const { user, updateSettings, currentLanguage } = useUser();
  const t = (text) => translateText(text, currentLanguage);
  const [language, setLanguage] = useState('English');
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useAutoDismissMessage(notice, setNotice);

  useEffect(() => {
    setLanguage(user?.preferences?.language || 'English');
    setTheme(user?.preferences?.theme || (user?.preferences?.darkMode ? 'dark' : 'light'));
    setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(user?.notifications || {}) });
  }, [
    user?.preferences?.language,
    user?.preferences?.theme,
    user?.preferences?.darkMode,
    user?.notifications?.email,
    user?.notifications?.inApp,
    user?.notifications?.push,
    user?.notifications?.accountUpdates,
    user?.notifications?.orderUpdates,
    user?.notifications?.serviceUpdates,
    user?.notifications?.systemAlerts,
  ]);

  // Staff accounts currently store the authoritative relationship as the
  // assigned branch name. Never infer it from the Admin's display name or the
  // browser's active-branch selection.
  const assignedBranch = useMemo(
    () => getCompanyBranch(user?.assignedBranch),
    [user?.assignedBranch],
  );
  const subtitle = `${t('View company access and configure your authorized account preferences')} — ${COMPANY_CONTACT.name}`;

  const toggleNotification = (key) => {
    setNotifications((current) => ({ ...current, [key]: !current[key] }));
  };

  const onSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      // Deliberately send only fields represented by the authenticated user's
      // preference and notification schemas. Company, branch and authority
      // values never enter the update payload.
      await updateSettings({
        preferences: { language, theme, darkMode: theme === 'dark' },
        notifications: {
          email: Boolean(notifications.email),
          inApp: Boolean(notifications.inApp),
          push: Boolean(notifications.push),
          accountUpdates: Boolean(notifications.accountUpdates),
          orderUpdates: Boolean(notifications.orderUpdates),
          serviceUpdates: Boolean(notifications.serviceUpdates),
          systemAlerts: Boolean(notifications.systemAlerts),
        },
      });
      appendAuditLog({
        user: user?.email || user?.name || 'admin',
        action: 'update_settings',
        details: 'Updated authorized account preferences',
      });
      setNotice('System settings saved successfully.');
    } catch (requestError) {
      setError(requestError?.message || 'Unable to save system settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="System Settings" subtitle={subtitle}>
      <div className="admin-settings-grid">
        <section className="admin-card admin-settings-company" aria-labelledby="company-information-heading">
          <div className="admin-settings-heading">
            <div>
              <p>{t('Permanent company details')}</p>
              <h3 id="company-information-heading">{t('Company Information')}</h3>
            </div>
            <span className="admin-readonly-badge">{t('Read-only')}</span>
          </div>
          <div className="admin-readonly-list">
            <ReadOnlyDetail label={t('Company / Store Name')} value={COMPANY_PROFILE.name} hint={t('Managed by SuperAdmin')} />
            <ReadOnlyDetail
              label={t('Assigned Branch')}
              value={assignedBranch?.name || user?.assignedBranch || t('No branch assigned')}
              hint={t('Assigned by SuperAdmin')}
            />
            <ReadOnlyDetail
              label={t('Branch Address')}
              value={assignedBranch?.address || t('No saved address for the assigned branch')}
              hint={t('Matches your assigned branch')}
            />
            <ReadOnlyDetail label={t('Company Contact')} value={COMPANY_CONTACT.hotline} hint={t('Managed by SuperAdmin')} />
            <ReadOnlyDetail label={t('Support Email')} value={COMPANY_CONTACT.supportEmail} hint={t('Managed by SuperAdmin')} />
            <ReadOnlyDetail label={t('Office Hours')} value={COMPANY_CONTACT.officeHours} hint={t('Managed by SuperAdmin')} />
          </div>
        </section>

        <form className="admin-card admin-settings-configurable" onSubmit={onSave} aria-labelledby="configurable-settings-heading">
          <div className="admin-settings-heading">
            <div>
              <p>{t('Your saved account preferences')}</p>
              <h3 id="configurable-settings-heading">{t('Configurable System Settings')}</h3>
            </div>
          </div>

          <div className="admin-field-group">
            <label>{t('Interface language')}
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="English">{t('English')}</option>
                <option value="Filipino">{t('Filipino')}</option>
              </select>
            </label>
            <label>{t('Theme')}
              <select value={theme} onChange={(event) => setTheme(event.target.value)}>
                <option value="light">{t('Light')}</option>
                <option value="dark">{t('Dark')}</option>
              </select>
            </label>
          </div>

          <div className="admin-card-section admin-settings-notifications">
            <h3>{t('Alerts')}</h3>
            {[
              ['inApp', 'In-app alerts'],
              ['push', 'Push alerts'],
              ['email', 'Email alerts'],
              ['accountUpdates', 'Account and security updates'],
              ['orderUpdates', 'Order updates'],
              ['serviceUpdates', 'Service updates'],
              ['systemAlerts', 'System alerts'],
            ].map(([key, label]) => (
              <label key={key} className="admin-settings-toggle">
                <span>{t(label)}</span>
                <input
                  type="checkbox"
                  checked={Boolean(notifications[key])}
                  onChange={() => toggleNotification(key)}
                />
              </label>
            ))}
          </div>

          <div className="admin-settings-save-row">
            <button type="submit" disabled={saving}>{t(saving ? 'Saving…' : 'Save System Settings')}</button>
            {notice ? <p className="admin-settings-success" role="status">{t(notice)}</p> : null}
            {error ? <p className="admin-settings-error" role="alert">{t(error)}</p> : null}
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default AdminSettings;
