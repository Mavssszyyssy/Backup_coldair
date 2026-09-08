export const TECHNICIAN_MOBILE_NOTICE_PATH = '/technician-mobile';

export const getRoleHomePath = (role) => {
  switch (role) {
    case 'technician': return TECHNICIAN_MOBILE_NOTICE_PATH;
    case 'manager': return '/manager/amp';
    case 'owner': return '/owner/amp';
    case 'admin': return '/admin/dashboard';
    case 'superadmin': return '/superadmin/dashboard';
    default: return '/shop';
  }
};
