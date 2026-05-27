import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Common/AdminLayout';
import ServiceRequests from './ServiceRequests';
import RequestDetails from './RequestDetails';
import { apiRequest } from '../../../config/api';
import '../adminShared.css';
import './styles.css';

const AdminMaintenance = () => {
  const [selected, setSelected] = useState(null);
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await apiRequest('/service-requests');
      setRequests(result.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    apiRequest('/users?role=technician')
      .then((result) => setTechnicians(result.users || []))
      .catch(() => setTechnicians([]));
  }, []);

  const handleUpdated = (updatedRequest) => {
    setRequests((items) =>
      items.map((item) => (String(item.id) === String(updatedRequest.id) ? updatedRequest : item)),
    );
    setSelected(updatedRequest);
  };

  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return requests.filter((request) => {
      const statusMatches =
        statusFilter === 'all' || String(request.status || '') === statusFilter;
      const technicianMatches =
        technicianFilter === 'all' ||
        String(request.assignedTechnicianId || '') === technicianFilter;
      const textMatches =
        !needle ||
        [
          request.customer,
          request.customerName,
          request.unitName,
          request.issue,
          request.issueDescription,
          request.address,
          request.taskCode,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return statusMatches && technicianMatches && textMatches;
    });
  }, [requests, search, statusFilter, technicianFilter]);

  return (
    <AdminLayout title="Maintenance" subtitle="Handle service operations">
      <div className="admin-grid-2">
        <div>
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
          {loading ? <p>Loading…</p> : null}
          <div className="maintenance-filters">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, unit, issue, address"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select
              value={technicianFilter}
              onChange={(event) => setTechnicianFilter(event.target.value)}
            >
              <option value="all">All technicians</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name ||
                    `${technician.name_first || ''} ${technician.name_last || ''}`.trim() ||
                    technician.email}
                </option>
              ))}
            </select>
          </div>
          <ServiceRequests requests={filteredRequests} onSelect={setSelected} />
          <button type="button" onClick={load} style={{ marginTop: 10 }}>
            Refresh
          </button>
        </div>
        <RequestDetails request={selected} onUpdated={handleUpdated} />
      </div>
    </AdminLayout>
  );
};

export default AdminMaintenance;
