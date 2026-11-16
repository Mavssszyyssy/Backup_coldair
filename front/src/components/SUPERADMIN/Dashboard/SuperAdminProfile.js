import React, { useCallback, useEffect, useState } from 'react';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { useUser } from '../../../context/UserContext';
import AccountSecurityManagement from '../../security/AccountSecurityManagement';
import { validateEmailForSubmission } from '../../../domain/emailPolicy';
import { validateFullName } from '../../../domain/personNameValidation';
import { sanitizeLocalPhMobileInput, validateLocalPhMobile } from '../../../utils/phMobileValidation';
import { formatBusinessDateTime } from '../../../utils/dateTime';
import { translateText } from '../../../utils/customerI18n';
import useAutoDismissMessage from '../../../hooks/useAutoDismissMessage';
import useUnsavedProfileChanges from '../../../hooks/useUnsavedProfileChanges';
import './SuperAdminAccount.css';

const SuperAdminProfile = () => {
  const { user, updateProfile, changePassword, currentLanguage } = useUser();
  const t = useCallback((value) => translateText(value, currentLanguage), [currentLanguage]);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [error, setError] = useState('');
  const dirty = profile.name !== (user?.name || '') || profile.email !== (user?.email || '') || profile.phone !== (user?.phone || '');
  useUnsavedProfileChanges(dirty, savingProfile, t);
  useAutoDismissMessage(profileNotice, setProfileNotice);

  const { name = '', email = '', phone = '' } = user || {};
  useEffect(() => setProfile({ name, email, phone }), [name, email, phone]);
  const saveProfile = async (event) => {
    event.preventDefault(); setError(''); setProfileNotice('');
    if (savingProfile) return;
    const nameError = profile.name === name ? '' : validateFullName(profile.name);
    if (nameError) { setError(nameError); return; }
    const phoneError = validateLocalPhMobile(profile.phone);
    if (phoneError) { setError(phoneError); return; }
    setSavingProfile(true);
    try {
      const emailError = await validateEmailForSubmission(profile.email);
      if (emailError) { setError(emailError); return; }
      await updateProfile({
        ...(profile.name === name ? {} : { name: profile.name }),
        phone: profile.phone,
        email: profile.email.trim().toLowerCase(),
      });
      setProfileNotice('Saved Changes');
    } catch (requestError) {
      setError(requestError.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };
  return <SuperAdminLayout title={t('My SuperAdmin Profile')} subtitle={t('Personal account details and security for HQ access')}>
    <section className="hq-profile-hero"><div className="hq-profile-avatar">{(user?.name || 'S').slice(0, 1).toUpperCase()}</div><div><p>{t('HQ identity')}</p><h2>{user?.name || t('Super Admin')}</h2><span>{user?.email || t('No email recorded')} · {t('SuperAdmin')}</span></div><div className="hq-profile-status"><b>{t('Company-wide access')}</b><small>{t('Last login')}: {user?.lastLogin ? formatBusinessDateTime(user.lastLogin) : t('Not recorded')}</small></div></section>
    <div className="hq-account-grid hq-profile-grid">
      <form className="hq-account-card" onSubmit={saveProfile}><div className="hq-card-heading"><p>{t('Personal details')}</p><h3>{t('Profile information')}</h3></div><label>{t('Full name')}<input maxLength={41} value={profile.name} disabled={savingProfile} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} placeholder={t('Full name')} /></label><label>{t('Email address')}<input maxLength={254} type="email" value={profile.email} disabled={savingProfile} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" required /><small>{t('This changes your contact email only. Your account ID, role, sessions, and permissions remain separate.')}</small></label><label>{t('Mobile number')}<input type="tel" value={profile.phone} disabled={savingProfile} onChange={(event) => { setProfile((current) => ({ ...current, phone: sanitizeLocalPhMobileInput(event.target.value) })); setError(''); }} placeholder="09XXXXXXXXX" inputMode="numeric" autoComplete="tel-national" maxLength={11} /><small>{t('Use exactly 11 digits (09XXXXXXXXX).')}</small></label><button type="submit" disabled={savingProfile}>{savingProfile ? t('Saving…') : t('Save Changes')}</button>{profileNotice ? <span className="hq-success" role="status">{t(profileNotice)}</span> : null}</form>
      <section className="hq-account-card">
        <AccountSecurityManagement
          user={user}
          onChangePassword={changePassword}
        />
      </section>
    </div>{error ? <p className="hq-error hq-page-error">{t(error)}</p> : null}
  </SuperAdminLayout>;
};

export default SuperAdminProfile;
