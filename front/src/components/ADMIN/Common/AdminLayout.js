import React, { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import AdminSidebar from './AdminSidebar';
import AdminNotificationsBell from './AdminNotificationsBell';
import SuperAdminLayout from '../../SUPERADMIN/Common/SuperAdminLayout';
import '../adminShared.css';
import './styles.css';
import '../../common/operationsDesignSystem.css';
import { translateText } from '../../../utils/customerI18n';
import { OperationsMenuButton, OperationsMenuOverlay, useOperationsNavigation } from '../../common/OperationsNavigation';

const AdminLayout = ({ title, subtitle, children, embedded = false }) => {
  const { user, currentLanguage } = useUser();
  const t = (text) => translateText(text, currentLanguage);
  const navigation = useOperationsNavigation('admin', !embedded && user?.role !== 'superadmin');

  const initials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return 'A';
    return name.charAt(0).toUpperCase();
  }, [user?.name]);

  // Merged operational pages reuse their existing API-connected components
  // inside one parent screen. Embedded mode prevents a second sidebar/header.
  if (embedded) return children ?? <Outlet />;

  // Operational modules are shared with SuperAdmin, but the surrounding
  // shell stays authoritative: SuperAdmin always keeps the HQ navigation
  // instead of being dropped into the branch-admin sidebar.
  if (user?.role === 'superadmin') {
    return <SuperAdminLayout title={title} subtitle={subtitle}>{children}</SuperAdminLayout>;
  }

  return (
    <div className={`admin-layout ops-navigation-shell ${navigation.isOpen ? 'ops-navigation-open' : 'ops-navigation-closed'}`}>
      <a className="ops-skip-link" href="#admin-main-content">{t('Skip to main content')}</a>
      <OperationsMenuOverlay navigation={navigation} />
      <AdminSidebar isOpen={navigation.isOpen} sidebarId={navigation.sidebarId} onClose={navigation.close} onNavigate={navigation.onNavigate} />

      <main className="admin-main-content" id="admin-main-content">
        <div className="admin-content-wrapper">
          <header className="admin-header">
            <div className="admin-header-left">
              <OperationsMenuButton navigation={navigation} t={t} />
              <div>
                {title && <h1>{t(title)}</h1>}
                {subtitle && <p>{t(subtitle)}</p>}
              </div>
            </div>
            <div className="admin-header-user">
              <AdminNotificationsBell />
              <div className="admin-user-avatar">{initials}</div>
              <div className="admin-header-identity">
                <strong>{user?.name || 'Admin'}</strong>
                <small>{t('Branch administrator')}</small>
              </div>
            </div>
          </header>

          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
