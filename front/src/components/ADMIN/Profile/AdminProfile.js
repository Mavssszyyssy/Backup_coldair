import React, { useCallback, useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import AdminLayout from '../Common/AdminLayout';
import AccountSecurityManagement from '../../security/AccountSecurityManagement';
import { loadBranchNetwork } from '../../../domain/branches/branchNetworkStorage';
import { getSessionActiveBranch } from '../../../utils/authSession';
import { sanitizeLocalPhMobileInput, validateLocalPhMobile } from '../../../utils/phMobileValidation';
import { FULL_NAME_MAX_LENGTH, validateFullName } from '../../../domain/personNameValidation';
import { formatBusinessDateTime } from '../../../utils/dateTime';
import useAutoDismissMessage from '../../../hooks/useAutoDismissMessage';
import useUnsavedProfileChanges from '../../../hooks/useUnsavedProfileChanges';
import '../adminShared.css';
import './styles.css';

const AdminProfile = () => {
  const { user, updateProfile, changePassword, currentLanguage } = useUser();
  const t = useCallback((value) => translateText(value, currentLanguage), [currentLanguage]);
  const roleTitle = user?.role === 'superadmin' ? 'SuperAdmin' : 'Admin';
  const branchName = getSessionActiveBranch() || user?.activeBranch || user?.assignedBranch || '';
  const branchInfo = loadBranchNetwork().find((branch) => branch.name === branchName);
  const adminLocation = branchInfo?.location || branchName || '-';
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const dirty = isEditing && (form.name !== (user?.name || '') || form.phone !== (user?.phone || ''));
  const confirmDiscard = useUnsavedProfileChanges(dirty, saving, t);
  useAutoDismissMessage(notice, setNotice);

  const closeEditor = async () => {
    if (await confirmDiscard()) setIsEditing(false);
  };

  const openEditModal = () => {
    setNotice('');
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
    });
    setPhoneError('');
    setNameError('');
    setIsEditing(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (saving) return;
    const invalidName = form.name === user?.name ? '' : validateFullName(form.name);
    setNameError(invalidName);
    if (invalidName) return;
    const validationError = validateLocalPhMobile(form.phone);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }
    try {
      setSaving(true);
      const changes = form.name === user?.name ? { phone: form.phone } : form;
      await updateProfile(changes);
      setIsEditing(false);
      setNotice('Saved Changes');
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
            {notice && <p role="status">{t(notice)}</p>}
          </div>
          <div className="admin-profile-card">
            <AccountSecurityManagement
              user={user}
              onChangePassword={changePassword}
            />
          </div>
        </div>
        {isEditing && (
          <div className="admin-profile-modal-overlay" onClick={closeEditor}>
            <form className="admin-profile-modal-card" onSubmit={saveProfile} onClick={(event) => event.stopPropagation()}>
              <h3>{t("Edit Admin Profile")}</h3>
              <input maxLength={FULL_NAME_MAX_LENGTH} value={form.name} disabled={saving} aria-label={t("Full name")} aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "admin-profile-name-error" : undefined}
                onChange={(event) => { setForm((prev) => ({ ...prev, name: event.target.value })); setNameError(''); }} placeholder={t("Name")} />
              {nameError && <p id="admin-profile-name-error" className="admin-profile-phone-error" role="alert">{t(nameError)}</p>}
              <input
                aria-label={t("Phone number")}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={11}
                value={form.phone}
                disabled={saving}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, phone: sanitizeLocalPhMobileInput(event.target.value) }));
                  setPhoneError('');
                }}
                placeholder={t("09XXXXXXXXX")}
              />
              {phoneError ? <p className="admin-profile-phone-error" role="alert">{t(phoneError)}</p> : <small className="admin-profile-phone-help">{t("Use exactly 11 digits (09XXXXXXXXX).")}</small>}
              <input value={adminLocation} readOnly disabled placeholder={t("Location")} />
              <div className="admin-profile-modal-actions">
                <button type="button" onClick={closeEditor} disabled={saving}>{t("Cancel")}</button>
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
