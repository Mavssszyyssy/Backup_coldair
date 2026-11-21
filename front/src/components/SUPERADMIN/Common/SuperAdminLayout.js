import React from 'react';
import SuperAdminHeader from './SuperAdminHeader';
import SuperAdminSidebar from './SuperAdminSidebar';
import '../../common/operationsDesignSystem.css';
import '../superAdminShared.css';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';

const SuperAdminLayout = ({ title, subtitle, children, embedded = false, mainClassName = '' }) => {
  const { currentLanguage } = useUser();
  if (embedded) return children;

  return (
    <div className="super-layout">
      <a className="ops-skip-link" href="#superadmin-main-content">{translateText('Skip to main content', currentLanguage)}</a>
      <SuperAdminSidebar />
      <main className={`super-layout-main${mainClassName ? ` ${mainClassName}` : ''}`} id="superadmin-main-content">
        <SuperAdminHeader title={title} subtitle={subtitle} />
        {children}
      </main>
    </div>
  );
};

export default SuperAdminLayout;
