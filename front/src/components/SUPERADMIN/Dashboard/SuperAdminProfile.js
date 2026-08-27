import React, { useEffect, useState } from 'react';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { useUser } from '../../../context/UserContext';
import './SuperAdminAccount.css';

const SuperAdminProfile = () => {
  const { user, updateProfile, changePassword } = useUser();
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setProfile({ name: user?.name || '', phone: user?.phone || '' }), [user]);
  const saveProfile = async (event) => {
    event.preventDefault(); setSavingProfile(true); setError(''); setProfileNotice('');
    try { await updateProfile(profile); setProfileNotice('Profile updated successfully.'); } catch (requestError) { setError(requestError.message || 'Unable to update profile.'); } finally { setSavingProfile(false); }
  };
  const savePassword = async (event) => {
    event.preventDefault(); setSavingPassword(true); setError(''); setPasswordNotice('');
    if (!passwords.current || !passwords.next || !passwords.confirm) { setError('Complete all password fields.'); setSavingPassword(false); return; }
    if (passwords.next !== passwords.confirm) { setError('New password and confirmation do not match.'); setSavingPassword(false); return; }
    if (passwords.next.length > 25) { setError('New password must not exceed 25 characters.'); setSavingPassword(false); return; }
    try { const result = await changePassword(passwords.current, passwords.next); setPasswordNotice(result.message || 'Password updated successfully.'); setPasswords({ current: '', next: '', confirm: '' }); } catch (requestError) { setError(requestError.message || 'Unable to update password.'); } finally { setSavingPassword(false); }
  };

  return <SuperAdminLayout title="My SuperAdmin Profile" subtitle="Personal account details and security for HQ access">
    <section className="hq-profile-hero"><div className="hq-profile-avatar">{(user?.name || 'S').slice(0, 1).toUpperCase()}</div><div><p>HQ identity</p><h2>{user?.name || 'Super Admin'}</h2><span>{user?.email || 'No email recorded'} · SuperAdmin</span></div><div className="hq-profile-status"><b>Company-wide access</b><small>Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Not recorded'}</small></div></section>
    <div className="hq-account-grid hq-profile-grid">
      <form className="hq-account-card" onSubmit={saveProfile}><div className="hq-card-heading"><p>Personal details</p><h3>Profile information</h3></div><label>Full name<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" /></label><label>Email address<input value={user?.email || ''} readOnly aria-readonly="true" /><small>Your sign-in email is managed through verified account recovery.</small></label><label>Mobile number<input value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} placeholder="09XXXXXXXXX" inputMode="tel" /></label><button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>{profileNotice ? <span className="hq-success">{profileNotice}</span> : null}</form>
      <form className="hq-account-card" onSubmit={savePassword}><div className="hq-card-heading"><p>Security</p><h3>Change password</h3></div><label>Current password<input type="password" value={passwords.current} onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))} autoComplete="current-password" /></label><label>New password<input type="password" maxLength={25} value={passwords.next} onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))} autoComplete="new-password" /><small>Use 8–25 characters, with uppercase, lowercase, number, and special character.</small></label><label>Confirm new password<input type="password" maxLength={25} value={passwords.confirm} onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))} autoComplete="new-password" /></label><button type="submit" disabled={savingPassword}>{savingPassword ? 'Updating…' : 'Update password'}</button>{passwordNotice ? <span className="hq-success">{passwordNotice}</span> : null}</form>
    </div>{error ? <p className="hq-error hq-page-error">{error}</p> : null}
  </SuperAdminLayout>;
};

export default SuperAdminProfile;
