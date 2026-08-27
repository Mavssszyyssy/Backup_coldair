import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminMaintenance from '../../ADMIN/Maintenance/AdminMaintenance';
import AdminOrders from '../../ADMIN/Orders/AdminOrders';
import AdminTechnician from '../../ADMIN/Technicians/AdminTechnician';
import AdminContactMessages from '../../ADMIN/ContactMessages/AdminContactMessages';
import '../../ADMIN/Inventory/styles.css';
import SuperAdminLayout from '../Common/SuperAdminLayout';

const TABS = [
  { id: 'orders', label: 'Customer Orders' },
  { id: 'service-requests', label: 'Service Requests' },
  { id: 'technicians', label: 'Technicians' },
  { id: 'customer-messages', label: 'Customer Messages' },
];

const SuperAdminServices = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab : 'orders';

  const selectTab = (tab) => {
    setSearchParams(tab === 'orders' ? {} : { tab }, { replace: true });
  };

  return (
    <SuperAdminLayout
      title="Services"
      subtitle="Monitor customer orders, service requests, customer messages, and technician operations in one executive workspace."
    >
      <div className="module-tabs" role="tablist" aria-label="Super Admin service management sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'orders' ? <AdminOrders embedded /> : null}
      {activeTab === 'service-requests' ? <AdminMaintenance embedded /> : null}
      {activeTab === 'technicians' ? <AdminTechnician embedded /> : null}
      {activeTab === 'customer-messages' ? <AdminContactMessages /> : null}
    </SuperAdminLayout>
  );
};

export default SuperAdminServices;
