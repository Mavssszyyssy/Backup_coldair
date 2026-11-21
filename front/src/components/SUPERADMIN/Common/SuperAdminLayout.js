import React from 'react';
import SuperAdminHeader from './SuperAdminHeader';
import SuperAdminSidebar from './SuperAdminSidebar';
import '../../common/operationsDesignSystem.css';
import '../superAdminShared.css';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import { OperationsMenuOverlay, useOperationsNavigation } from '../../common/OperationsNavigation';

const SuperAdminLayout = ({ title, subtitle, children, embedded = false, mainClassName = '' }) => {
  const { currentLanguage } = useUser();
  const navigation = useOperationsNavigation('superadmin', !embedded);
  if (embedded) return children;

  return (
    <div className={`super-layout ops-navigation-shell ${navigation.isOpen ? 'ops-navigation-open' : 'ops-navigation-closed'}`}>
      <a className="ops-skip-link" href="#superadmin-main-content">{translateText('Skip to main content', currentLanguage)}</a>
      <OperationsMenuOverlay navigation={navigation} />
      <SuperAdminSidebar isOpen={navigation.isOpen} sidebarId={navigation.sidebarId} onClose={navigation.close} onNavigate={navigation.onNavigate} />
      <main className={`super-layout-main${mainClassName ? ` ${mainClassName}` : ''}`} id="superadmin-main-content">
        <SuperAdminHeader title={title} subtitle={subtitle} navigation={navigation} />
        {children}
      </main>
    </div>
  );
};

export default SuperAdminLayout;
