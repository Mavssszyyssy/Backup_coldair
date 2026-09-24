import React, { useEffect, useState } from 'react';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { useUser } from '../../../context/UserContext';
import AccountSecurityManagement from '../../security/AccountSecurityManagement';
import './SuperAdminAccount.css';

const SuperAdminProfile = () => {
  const { user, updateProfile, changePassword } = useUser();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setProfile({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' }), [user]);
  const saveProfile = async (event) => {
    event.preventDefault(); setSavingProfile(true); setError(''); setProfileNotice('');
    try { await updateProfile(profile); setProfileNotice('Profile updated successfully.'); } catch (requestError) { setError(requestError.message || 'Unable to update profile.'); } finally { setSavingProfile(false); }
  };
  return <SuperAdminLayout title="My SuperAdmin Profile" subtitle="Personal account details and security for HQ access">
    <section className="hq-profile-hero"><div className="hq-profile-avatar">{(user?.name || 'S').slice(0, 1).toUpperCase()}</div><div><p>HQ identity</p><h2>{user?.name || 'Super Admin'}</h2><span>{user?.email || 'No email recorded'} · SuperAdmin</span></div><div className="hq-profile-status"><b>Company-wide access</b><small>Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Not recorded'}</small></div></section>
    <div className="hq-account-grid hq-profile-grid">
      <form className="hq-account-card" onSubmit={saveProfile}><div className="hq-card-heading"><p>Personal details</p><h3>Profile information</h3></div><label>Full name<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" /></label><label>Email address<input type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" required /><small>This changes your contact email only. Your account ID, role, sessions, and permissions remain separate.</small></label><label>Mobile number<input value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} placeholder="09XXXXXXXXX" inputMode="tel" /></label><button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>{profileNotice ? <span className="hq-success" role="status">{profileNotice}</span> : null}</form>
      <section className="hq-account-card">
        <AccountSecurityManagement
          user={user}
          onChangePassword={changePassword}
        />
      </section>
    </div>{error ? <p className="hq-error hq-page-error">{error}</p> : null}
  </SuperAdminLayout>;
};

export default SuperAdminProfile;
