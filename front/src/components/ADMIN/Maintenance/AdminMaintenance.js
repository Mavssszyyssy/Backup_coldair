import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Common/AdminLayout';
import ServiceRequests from './ServiceRequests';
import RequestDetails from './RequestDetails';
import WarrantyClaims from './WarrantyClaims';
import { apiRequest } from '../../../config/api';
import '../adminShared.css';
import './styles.css';

const STATUS_OPTIONS = ['Submitted', 'Reviewed', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

const AdminMaintenance = () => {
  const [selected, setSelected] = useState(null);
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warrantyClaims, setWarrantyClaims] = useState([]);
  const [busyClaimId, setBusyClaimId] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [result, claimResult] = await Promise.all([
        apiRequest('/service-requests'),
        apiRequest('/warranties/claims'),
      ]);
      setRequests(Array.isArray(result.requests) ? result.requests : []);
      setWarrantyClaims(Array.isArray(claimResult.claims) ? claimResult.claims : []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load service requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    apiRequest('/users?role=technician')
      .then((result) => setTechnicians(Array.isArray(result.users) ? result.users : []))
      .catch(() => setTechnicians([]));
  }, [load]);

  const handleUpdated = (updatedRequest) => {
    setRequests((items) => items.map((item) => (
      String(item.id) === String(updatedRequest.id) ? updatedRequest : item
    )));
    setSelected(updatedRequest);
  };

  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return requests.filter((request) => {
      const statusMatches = statusFilter === 'all' || String(request.status || '') === statusFilter;
      const technicianMatches = technicianFilter === 'all' || String(request.assignedTechnicianId || '') === technicianFilter;
      const textMatches = !needle || [
        request.customer,
        request.customerName,
        request.unitName,
        request.issue,
        request.issueDescription,
        request.address,
        request.taskCode,
      ].filter(Boolean).join(' ').toLowerCase().includes(needle);
      return statusMatches && technicianMatches && textMatches;
    });
  }, [requests, search, statusFilter, technicianFilter]);

  const summary = useMemo(() => ({
    total: requests.length,
    unassigned: requests.filter((request) => !request.assignedTechnicianId && !['Completed', 'Cancelled'].includes(request.status)).length,
    active: requests.filter((request) => ['Assigned', 'In Progress'].includes(request.status)).length,
    completed: requests.filter((request) => request.status === 'Completed').length,
  }), [requests]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTechnicianFilter('all');
  };

  const reviewWarrantyClaim = async (claim, status) => {
    const key = `${claim.unitId}:${claim.claimId}`;
    const decisionNote = window.prompt(`Optional note for this ${status.replace('_', ' ')} decision:`, '') || '';
    setBusyClaimId(key);
    try {
      const result = await apiRequest(`/warranties/units/${encodeURIComponent(claim.unitId)}/claims/${encodeURIComponent(claim.claimId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, decisionNote }),
      });
      setWarrantyClaims((items) => items.map((item) => (
        String(item.unitId) === String(claim.unitId) && String(item.claimId) === String(claim.claimId)
          ? { ...item, ...result.claim, warrantyStatus: result.warranty?.status }
          : item
      )));
      if (status === 'approved') await load();
    } catch (claimError) {
      setError(claimError.message || 'Unable to update the warranty claim.');
    } finally {
      setBusyClaimId('');
    }
  };

  return (
    <AdminLayout title="Maintenance Operations" subtitle="Review service requests, assign technicians, and monitor proof of work">
      <section className="maintenance-page">
        <div className="maintenance-overview" aria-label="Maintenance summary">
          <div className="maintenance-summary-card">
            <span>All requests</span><strong>{summary.total}</strong><small>Recorded service requests</small>
          </div>
          <div className="maintenance-summary-card maintenance-summary-card--attention">
            <span>Needs assignment</span><strong>{summary.unassigned}</strong><small>Waiting for a technician</small>
          </div>
          <div className="maintenance-summary-card maintenance-summary-card--active">
            <span>In progress</span><strong>{summary.active}</strong><small>Technician work underway</small>
          </div>
          <div className="maintenance-summary-card maintenance-summary-card--complete">
            <span>Completed</span><strong>{summary.completed}</strong><small>Work and proof finalized</small>
          </div>
        </div>

        {error ? <div className="maintenance-alert" role="alert">{error}<button type="button" onClick={load}>Try again</button></div> : null}

        <WarrantyClaims claims={warrantyClaims} busyClaimId={busyClaimId} onReview={reviewWarrantyClaim} />

        <div className="maintenance-workspace">
          <div className="maintenance-queue-panel">
            <div className="maintenance-panel-heading">
              <div><p className="maintenance-eyebrow">Service queue</p><h2>Requests</h2></div>
              <button type="button" className="maintenance-button maintenance-button--secondary" onClick={load} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            <div className="maintenance-filters">
              <label className="maintenance-search-field"><span>Search</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Customer, unit, issue, address" /></label>
              <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label><span>Technician</span><select value={technicianFilter} onChange={(event) => setTechnicianFilter(event.target.value)}><option value="all">All technicians</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name || `${technician.name_first || ''} ${technician.name_last || ''}`.trim() || technician.email}</option>)}</select></label>
              <button type="button" className="maintenance-filter-reset" onClick={resetFilters} disabled={!search && statusFilter === 'all' && technicianFilter === 'all'}>Clear</button>
            </div>
            {loading ? <div className="maintenance-loading">Loading service requests…</div> : <ServiceRequests requests={filteredRequests} selectedId={selected?.id} onSelect={setSelected} />}
          </div>
          <RequestDetails request={selected} onUpdated={handleUpdated} />
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminMaintenance;
