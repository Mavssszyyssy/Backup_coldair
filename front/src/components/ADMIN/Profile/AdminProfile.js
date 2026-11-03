import React, { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import AdminLayout from '../Common/AdminLayout';
import AccountSecurityManagement from '../../security/AccountSecurityManagement';
import { loadBranchNetwork } from '../../../domain/branches/branchNetworkStorage';
import { getSessionActiveBranch } from '../../../utils/authSession';
import { sanitizeLocalPhMobileInput, validateLocalPhMobile } from '../../../utils/phMobileValidation';
import { formatBusinessDateTime } from '../../../utils/dateTime';
import '../adminShared.css';
import './styles.css';

const AdminProfile = () => {
  const { user, updateProfile, changePassword, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const roleTitle = user?.role === 'superadmin' ? 'SuperAdmin' : 'Admin';
  const branchName = getSessionActiveBranch() || user?.activeBranch || user?.assignedBranch || '';
  const branchInfo = loadBranchNetwork().find((branch) => branch.name === branchName);
  const adminLocation = branchInfo?.location || branchName || '-';
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const openEditModal = () => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
    });
    setPhoneError('');
    setIsEditing(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const validationError = validateLocalPhMobile(form.phone);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }
    try {
      setSaving(true);
      await updateProfile(form);
      setIsEditing(false);
      alert('Profile updated successfully.');
    } catch (error) {
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title={`${t(roleTitle)} ${t('Profile')}`} subtitle={t('Manage profile and security')}>
      <div className="admin-profile-page">
        <div className="admin-profile-grid">
          <div className="admin-profile-card">
            <h3>{t("Profile")}</h3>
            <p><strong>{t("Name:")}</strong> {user?.name || 'Administrator'}</p>
            <p><strong>{t("Email:")}</strong> {user?.email || 'admin@aeropulse.com'}</p>
            <p><strong>{t("Role:")}</strong> {user?.role || 'admin'}</p>
            <p><strong>{t("Phone:")}</strong> {user?.phone || '-'}</p>
            <p><strong>{t("Location:")}</strong> {adminLocation}</p>
            <p><strong>{t("Last Login:")}</strong> {user?.lastLogin ? formatBusinessDateTime(user.lastLogin) : '-'}</p>
            <button type="button" onClick={openEditModal}>{t("Edit Profile")}</button>
          </div>
          <div className="admin-profile-card">
            <AccountSecurityManagement
              user={user}
              onChangePassword={changePassword}
            />
          </div>
        </div>
        {isEditing && (
          <div className="admin-profile-modal-overlay" onClick={() => setIsEditing(false)}>
            <form className="admin-profile-modal-card" onSubmit={saveProfile} onClick={(event) => event.stopPropagation()}>
              <h3>{t("Edit Admin Profile")}</h3>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder={t("Name")} />
              <input
                aria-label={t("Phone number")}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={11}
                value={form.phone}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, phone: sanitizeLocalPhMobileInput(event.target.value) }));
                  setPhoneError('');
                }}
                placeholder={t("09XXXXXXXXX")}
              />
              {phoneError ? <p className="admin-profile-phone-error" role="alert">{t(phoneError)}</p> : <small className="admin-profile-phone-help">{t("Use exactly 11 digits (09XXXXXXXXX).")}</small>}
              <input value={adminLocation} readOnly disabled placeholder={t("Location")} />
              <div className="admin-profile-modal-actions">
                <button type="button" onClick={() => setIsEditing(false)}>{t("Cancel")}</button>
                <button type="submit" disabled={saving}>{t(saving ? 'Saving...' : 'Save Changes')}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
