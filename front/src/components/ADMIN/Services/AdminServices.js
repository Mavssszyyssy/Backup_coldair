import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../Common/AdminLayout';
import AdminMaintenance from '../Maintenance/AdminMaintenance';
import AdminOrders from '../Orders/AdminOrders';
import AdminTechnician from '../Technicians/AdminTechnician';
import '../Inventory/styles.css';

const TABS = [
  { id: 'orders', label: 'Customer Orders' },
  { id: 'service-requests', label: 'Service Requests' },
  { id: 'technicians', label: 'Technicians' },
];

const AdminServices = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab : 'orders';

  const selectTab = (tab) => {
    setSearchParams(tab === 'orders' ? {} : { tab }, { replace: true });
  };

  return (
    <AdminLayout title="Services" subtitle="Manage customer orders, service requests, and field technicians in one operational workspace.">
      <div className="module-tabs" role="tablist" aria-label="Service management sections">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => selectTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'orders' ? <AdminOrders embedded /> : null}
      {activeTab === 'service-requests' ? <AdminMaintenance embedded /> : null}
      {activeTab === 'technicians' ? <AdminTechnician embedded /> : null}
    </AdminLayout>
  );
};

export default AdminServices;
