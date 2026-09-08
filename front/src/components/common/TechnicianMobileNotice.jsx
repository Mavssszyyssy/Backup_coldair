import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import BoutiqueAuthLayout from './boutique/BoutiqueAuthLayout';
import BoutiqueAuthHeader from './boutique/BoutiqueAuthHeader';

export default function TechnicianMobileNotice() {
  const { isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  const returnToLogin = () => {
    if (isAuthenticated) logout();
    navigate('/login', { replace: true });
  };
  return <BoutiqueAuthLayout>
    <main style={{ width: '100%', maxWidth: 480, margin: 'auto', padding: 24 }}>
      <BoutiqueAuthHeader title="Technician access is mobile-only" subtitle="Open the Cold Air mobile app and sign in with your technician username and password." />
      <p style={{ lineHeight: 1.7 }}>Your assigned work, QR scanning, location check-in, installation, maintenance reports, and profile are available in the mobile app. The old technician website is no longer available.</p>
      <button type="button" onClick={returnToLogin} style={{ marginTop: 24, padding: '14px 20px', borderRadius: 12, background: '#111827', color: '#fff', border: 0, cursor: 'pointer', fontWeight: 600 }}>
        {isAuthenticated ? 'Sign out and use another account' : 'Back to website sign-in'}
      </button>
    </main>
  </BoutiqueAuthLayout>;
}
