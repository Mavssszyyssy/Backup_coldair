import React from 'react';
import { useUser } from '../../../context/UserContext';
import SuperAdminNotificationsBell from './SuperAdminNotificationsBell';
import { translateText } from '../../../utils/customerI18n';

const SuperAdminHeader = ({ title = 'Super Admin', subtitle = 'Executive control' }) => {
  const { user, currentLanguage } = useUser();
  const t = (text) => translateText(text, currentLanguage);
  const initial = (user?.name || 'S').charAt(0).toUpperCase();

  return (
    <header className="super-header">
      <div className="super-header-left">
        <div>
          <h1>{t(title)}</h1>
          <p>{t(subtitle)}</p>
        </div>
      </div>
      <div className="super-header-actions">
        <SuperAdminNotificationsBell />
        <span className="super-header-avatar">{initial}</span>
        <span className="super-header-identity"><strong>{user?.name || 'Super Admin'}</strong><small>{t("Company administrator")}</small></span>
      </div>
    </header>
  );
};

export default SuperAdminHeader;
