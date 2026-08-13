import React from 'react';
import { useUser } from '../../../context/UserContext';
import SuperAdminNotificationsBell from './SuperAdminNotificationsBell';

const SuperAdminHeader = ({ title = 'Super Admin', subtitle = 'Executive control' }) => {
  const { user } = useUser();

  return (
    <header className="super-header">
      <div className="super-header-left">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="super-header-actions">
        <SuperAdminNotificationsBell />
        <strong>{user?.name || 'Super Admin'}</strong>
      </div>
    </header>
  );
};

export default SuperAdminHeader;
