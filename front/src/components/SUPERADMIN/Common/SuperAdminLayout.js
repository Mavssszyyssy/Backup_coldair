import React from 'react';
import SuperAdminHeader from './SuperAdminHeader';
import SuperAdminSidebar from './SuperAdminSidebar';
import '../../common/operationsDesignSystem.css';
import '../superAdminShared.css';

const SuperAdminLayout = ({ title, subtitle, children, embedded = false }) => {
  if (embedded) return children;

  return (
    <div className="super-layout">
      <a className="ops-skip-link" href="#superadmin-main-content">Skip to main content</a>
      <SuperAdminSidebar />
      <main className="super-layout-main" id="superadmin-main-content">
        <SuperAdminHeader title={title} subtitle={subtitle} />
        {children}
      </main>
    </div>
  );
};

export default SuperAdminLayout;
