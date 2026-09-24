import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import BoutiqueAuthLayout from './boutique/BoutiqueAuthLayout';
import BoutiqueAuthHeader from './boutique/BoutiqueAuthHeader';
import BoutiqueCard from './boutique/BoutiqueCard';
import AccountSecurityManagement from '../security/AccountSecurityManagement';

export default function TechnicianMobileNotice() {
  const { user, isAuthenticated, logout, changePassword, resetAuthenticator } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const authenticatorSetupComplete = Boolean(location.state?.authenticatorSetupComplete);
  const returnToLogin = () => {
    if (isAuthenticated) logout();
    navigate('/login', { replace: true });
  };
  const handleResetAuthenticator = async (payload) => {
    const result = await resetAuthenticator(payload);
    navigate('/security/setup-authenticator', { replace: true });
    return result;
  };
  return <BoutiqueAuthLayout>
    <main style={{ width: '100%', maxWidth: 720, margin: 'auto', padding: 24 }}>
      <BoutiqueAuthHeader title="Technician Account Management" subtitle="Work orders remain mobile-only. You can review and secure your account here." />
      {authenticatorSetupComplete ? (
        <div role="status" style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: '#d1fae5', color: '#065f46', fontWeight: 700 }}>
          Authenticator setup completed. Your account is protected.
        </div>
      ) : null}
      <BoutiqueCard padding={28} style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Profile / Account Information</h2>
        <p><strong>Name:</strong> {[user?.name_first, user?.name_last].filter(Boolean).join(' ') || user?.name || 'Technician'}</p>
        <p><strong>Login ID:</strong> {user?.alias || user?.username || 'Not recorded'}</p>
        <p><strong>Email:</strong> {user?.email || 'Not recorded'}</p>
        <p><strong>Phone:</strong> {user?.phone || 'Not recorded'}</p>
        <p><strong>Branch:</strong> {user?.assignedBranch || user?.activeBranch || 'Not assigned'}</p>
      </BoutiqueCard>
      <BoutiqueCard padding={28}>
        <AccountSecurityManagement
          user={user}
          onChangePassword={changePassword}
          onResetAuthenticator={handleResetAuthenticator}
          onBeginAuthenticatorSetup={() => navigate('/security/setup-authenticator')}
        />
      </BoutiqueCard>
      <p style={{ lineHeight: 1.7, marginTop: 20 }}>Assigned work, QR scanning, location check-in, installation, and maintenance reports remain available only in the Cold Air mobile app.</p>
      <button type="button" onClick={returnToLogin} style={{ marginTop: 24, padding: '14px 20px', borderRadius: 12, background: '#111827', color: '#fff', border: 0, cursor: 'pointer', fontWeight: 600 }}>
        Sign out and use another account
      </button>
    </main>
  </BoutiqueAuthLayout>;
}
