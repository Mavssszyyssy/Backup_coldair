import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAuthSessionItem } from '../../utils/authSession';
import { ACTIVE_BRANCH_KEY } from '../../domain/branches/branches';

const roleHome = (role) => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'superadmin') return '/superadmin/dashboard';
  return '/home';
};

function GoogleAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const encodedUser = params.get('user');
    if (!token || !encodedUser) {
      navigate('/login?google_error=missing_payload', { replace: true });
      return;
    }

    try {
      const parsedUser = JSON.parse(decodeURIComponent(encodedUser));
      setAuthSessionItem('accessToken', token);
      setAuthSessionItem('currentUser', JSON.stringify(parsedUser));
      setAuthSessionItem('userRole', parsedUser.role || 'customer');
      const branch = parsedUser.activeBranch || parsedUser.assignedBranch || '';
      if (branch) setAuthSessionItem(ACTIVE_BRANCH_KEY, branch);
      window.location.replace(roleHome(parsedUser.role));
    } catch (_error) {
      navigate('/login?google_error=invalid_payload', { replace: true });
    }
  }, [navigate, params]);

  return <div className="loading-screen">Finalizing Google sign-in...</div>;
}

export default GoogleAuthCallback;
