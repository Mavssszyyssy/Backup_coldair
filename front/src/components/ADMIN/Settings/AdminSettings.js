import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Common/AdminLayout';
import { useUser } from '../../../context/UserContext';
import { COMPANY_CONTACT, COMPANY_PROFILE, getCompanyBranch } from '../../../config/company';
import { appendAuditLog } from '../../../utils/auditLogs';
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

const roleLabel = (role = '') => {
  if (role === 'admin') return 'Branch administrator';
  if (role === 'superadmin') return 'Super administrator';
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Not assigned';
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
  const { user, updateSettings } = useUser();
  const [currency, setCurrency] = useState('PHP');
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setCurrency(user?.preferences?.currency || 'PHP');
    setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(user?.notifications || {}) });
  }, [
    user?.preferences?.currency,
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
  const permissions = Array.isArray(user?.permissions) ? user.permissions.filter(Boolean) : [];
  const permissionSummary = permissions.length
    ? permissions.join(', ')
    : 'Standard permissions for this role';
  const subtitle = `View company access and configure your authorized account preferences — ${COMPANY_CONTACT.name}`;

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
        preferences: { currency },
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
        details: `Updated authorized account preferences (currency=${currency})`,
      });
      setNotice('Settings saved successfully.');
    } catch (requestError) {
      setError(requestError?.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Settings" subtitle={subtitle}>
      <div className="admin-settings-grid">
        <section className="admin-card admin-settings-company" aria-labelledby="company-information-heading">
          <div className="admin-settings-heading">
            <div>
              <p>Permanent company details</p>
              <h3 id="company-information-heading">Company Information</h3>
            </div>
            <span className="admin-readonly-badge">Read-only</span>
          </div>
          <div className="admin-readonly-list">
            <ReadOnlyDetail label="Company / Store Name" value={COMPANY_PROFILE.name} />
            <ReadOnlyDetail
              label="Assigned Branch"
              value={assignedBranch?.name || user?.assignedBranch || 'No branch assigned'}
              hint="Assigned by SuperAdmin"
            />
            <ReadOnlyDetail
              label="Branch Address"
              value={assignedBranch?.address || 'No saved address for the assigned branch'}
              hint="Matches your assigned branch"
            />
            <ReadOnlyDetail label="Company Contact" value={COMPANY_CONTACT.hotline} />
            <ReadOnlyDetail label="Support Email" value={COMPANY_CONTACT.supportEmail} />
            <ReadOnlyDetail label="Office Hours" value={COMPANY_CONTACT.officeHours} />
          </div>
        </section>

        <section className="admin-card admin-settings-authority" aria-labelledby="role-information-heading">
          <div className="admin-settings-heading">
            <div>
              <p>Account authority</p>
              <h3 id="role-information-heading">Role & Permissions</h3>
            </div>
            <span className="admin-readonly-badge">Read-only</span>
          </div>
          <div className="admin-readonly-list">
            <ReadOnlyDetail label="Current Role" value={roleLabel(user?.role)} hint="Controlled by SuperAdmin" />
            <ReadOnlyDetail label="Permission Level" value={permissionSummary} hint="Controlled by role policy" />
            <ReadOnlyDetail
              label="Branch Assignment"
              value={assignedBranch?.branch || user?.assignedBranch || 'No branch assigned'}
              hint="Controlled by SuperAdmin"
            />
          </div>
        </section>

        <form className="admin-card admin-settings-configurable" onSubmit={onSave} aria-labelledby="configurable-settings-heading">
          <div className="admin-settings-heading">
            <div>
              <p>Your saved account preferences</p>
              <h3 id="configurable-settings-heading">Configurable Settings</h3>
            </div>
          </div>

          <div className="admin-field-group">
            <label>
              Currency
              <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                <option value="PHP">PHP — Philippine Peso</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </label>
          </div>

          <div className="admin-card-section admin-settings-notifications">
            <h3>Notifications</h3>
            {[
              ['inApp', 'In-app notifications'],
              ['push', 'Push notifications'],
              ['email', 'Email notifications'],
              ['accountUpdates', 'Account and security updates'],
              ['orderUpdates', 'Order updates'],
              ['serviceUpdates', 'Service updates'],
              ['systemAlerts', 'System alerts'],
            ].map(([key, label]) => (
              <label key={key} className="admin-settings-toggle">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(notifications[key])}
                  onChange={() => toggleNotification(key)}
                />
              </label>
            ))}
          </div>

          <div className="admin-settings-save-row">
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
            {notice ? <p className="admin-settings-success" role="status">{notice}</p> : null}
            {error ? <p className="admin-settings-error" role="alert">{error}</p> : null}
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default AdminSettings;
