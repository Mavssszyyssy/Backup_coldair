import React, { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import AdminSidebar from './AdminSidebar';
import AdminNotificationsBell from './AdminNotificationsBell';
import SuperAdminLayout from '../../SUPERADMIN/Common/SuperAdminLayout';
import '../adminShared.css';
import './styles.css';
import '../../common/operationsDesignSystem.css';

const AdminLayout = ({ title, subtitle, children, embedded = false }) => {
  const { user } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const initials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return 'A';
    return name.charAt(0).toUpperCase();
  }, [user?.name]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    if (isSidebarOpen && window.innerWidth < 768) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [isSidebarOpen]);

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
    <div className="admin-layout">
      <a className="ops-skip-link" href="#admin-main-content">Skip to main content</a>
      <button
        className={`burger-button ${isSidebarOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
        aria-label="Toggle menu"
        aria-expanded={isSidebarOpen}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`admin-sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
        role="presentation"
      />

      <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <main className="admin-main-content" id="admin-main-content">
        <div className="admin-content-wrapper">
          {(title || subtitle) && (
            <header className="admin-header">
              <div className="admin-header-left">
                <div>
                  {title && <h1>{title}</h1>}
                  {subtitle && <p>{subtitle}</p>}
                </div>
              </div>
              <div className="admin-header-user">
                <AdminNotificationsBell />
                <div className="admin-user-avatar">{initials}</div>
                <div className="admin-header-identity">
                  <strong>{user?.name || 'Admin'}</strong>
                  <small>Branch administrator</small>
                </div>
              </div>
            </header>
          )}

          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
