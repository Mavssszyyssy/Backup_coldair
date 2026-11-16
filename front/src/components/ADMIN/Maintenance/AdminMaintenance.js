import SearchableSelect from "../../common/SearchableSelect";
import LoadingSkeleton from "../../common/LoadingSkeleton";
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import AdminLayout from '../Common/AdminLayout';
import ServiceRequests from './ServiceRequests';
import RequestDetails from './RequestDetails';
import WarrantyClaims from './WarrantyClaims';
import { apiRequest } from '../../../config/api';
import { loadPageRequests } from '../../../config/loadPageRequests';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import { matchesServiceRequestStatus, serviceRequestSummary } from '../../../domain/serviceRequestSummary';
import '../adminShared.css';
import './styles.css';

const STATUS_OPTIONS = ['Submitted', 'Reviewed', 'Assigned', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
const SUMMARY_CARDS = [
  { filter: 'all', count: 'total', label: 'All requests', description: 'Recorded service requests' },
  { filter: 'unassigned', count: 'unassigned', tone: 'attention', label: 'Needs assignment', description: 'Waiting for a technician' },
  { filter: 'active', count: 'active', tone: 'active', label: 'In progress', description: 'Technician work underway' },
  { filter: 'On Hold', count: 'onHold', tone: 'hold', label: 'On hold', description: 'Admin follow-up needed' },
  { filter: 'Completed', count: 'completed', tone: 'complete', label: 'Completed', description: 'Work and proof finalized' },
  { filter: 'Cancelled', count: 'cancelled', tone: 'cancelled', label: 'Cancelled work', description: 'Cancelled service requests' },
];

const AdminMaintenance = ({ embedded = false, recordId = '' }) => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
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
  const [claimDecision, setClaimDecision] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const queueId = useId();
  const queueHeading = useRef(null);
  const loadVersion = useRef(0);

  const load = useCallback(async ({ quiet = false, fresh = false } = {}) => {
    const version = ++loadVersion.current;
    if (!quiet) { setError(''); setLoading(true); }
    const showRequests = ([result, claimResult]) => {
      if (version !== loadVersion.current) return;
      const nextRequests = Array.isArray(result.requests) ? result.requests : [];
      setRequests(nextRequests);
      setSelected((previous) => {
        const targetId = recordId || previous?.id || previous?._id;
        if (!targetId) return null;
        const latest = nextRequests.find((item) => String(item.id || item._id) === String(targetId)) || null;
        if (latest && previous && latest.status === previous.status && latest.updatedAt === previous.updatedAt) return previous;
        return latest;
      });
      setWarrantyClaims(Array.isArray(claimResult.claims) ? claimResult.claims : []);
      setLoading(false);
    };
    try {
      showRequests(await loadPageRequests(['/service-requests', '/warranties/claims'], {
        fresh, silentConnection: quiet, onCached: showRequests,
      }));
    } catch (requestError) {
      if (version !== loadVersion.current) return;
      if ([401, 403].includes(requestError.status)) showRequests([{}, {}]);
      if (!quiet) setError(requestError.message || 'Unable to load service requests.');
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    load();
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') load({ quiet: true });
    };
    document.addEventListener('visibilitychange', refreshVisible);
    window.addEventListener('focus', refreshVisible);
    const interval = window.setInterval(() => {
      refreshVisible();
    }, 30000);
    apiRequest('/users?role=technician')
      .then((result) => setTechnicians(Array.isArray(result.users) ? result.users : []))
      .catch(() => setTechnicians([]));
    return () => {
      loadVersion.current += 1;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshVisible);
      window.removeEventListener('focus', refreshVisible);
    };
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
      const statusMatches = matchesServiceRequestStatus(request, statusFilter);
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

  const summary = useMemo(() => serviceRequestSummary(requests), [requests]);

  const selectSummaryFilter = (filter) => {
    setStatusFilter(filter);
    queueHeading.current?.focus({ preventScroll: true });
    queueHeading.current?.scrollIntoView?.({ block: 'center' });
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTechnicianFilter('all');
  };

  const openClaimReview = (claim, status, coveredComponent = '') => {
    setClaimDecision({ claim, status, coveredComponent });
    setDecisionNote('');
    setDecisionError('');
  };

  const reviewWarrantyClaim = async (event) => {
    event.preventDefault();
    if (!claimDecision) return;
    const { claim, status, coveredComponent } = claimDecision;
    const key = `${claim.unitId}:${claim.claimId}`;
    setBusyClaimId(key);
    try {
      const result = await apiRequest(`/warranties/units/${encodeURIComponent(claim.unitId)}/claims/${encodeURIComponent(claim.claimId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, decisionNote, coveredComponent }),
      });
      setWarrantyClaims((items) => items.map((item) => (
        String(item.unitId) === String(claim.unitId) && String(item.claimId) === String(claim.claimId)
          ? { ...item, ...result.claim, warrantyStatus: result.warranty?.status }
          : item
      )));
      if (status === 'approved') await load();
      setClaimDecision(null);
    } catch (claimError) {
      setDecisionError(claimError.message || 'Unable to update the warranty claim.');
    } finally {
      setBusyClaimId('');
    }
  };

  return (
    <AdminLayout title={t("Maintenance Operations")} subtitle={t("Review service requests, assign technicians, and monitor proof of work")} embedded={embedded}>
      <section className="maintenance-page">
        <div className="maintenance-overview" role="group" aria-label={t("Maintenance summary")}>
          {SUMMARY_CARDS.map(({ filter, count, tone, label, description }) => (
            <button
              key={filter}
              type="button"
              className={tone ? `maintenance-summary-card maintenance-summary-card--${tone}` : 'maintenance-summary-card'}
              aria-controls={queueId}
              aria-pressed={statusFilter === filter}
              onClick={() => selectSummaryFilter(filter)}
            >
              <span>{t(label)}</span><strong>{summary[count]}</strong><small>{t(description)}</small>
            </button>
          ))}
        </div>

        {error ? <div className="maintenance-alert" role="alert">{t(error)}<button type="button" onClick={() => load({ fresh: true })}>{t("Try again")}</button></div> : null}

        <WarrantyClaims claims={warrantyClaims} busyClaimId={busyClaimId} onReview={openClaimReview} />

        {claimDecision ? <div className="maintenance-decision-backdrop">
          <section className="maintenance-decision-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-decision-title" onKeyDown={(event) => {
            if (event.key === 'Escape' && !busyClaimId) setClaimDecision(null);
          }}>
            <div className="maintenance-decision-heading">
              <div><p className="maintenance-eyebrow">{t("Warranty claim")}</p><h2 id="maintenance-decision-title">{t(claimDecision.status === 'approved' ? 'Approve repair' : claimDecision.status === 'rejected' ? 'Reject claim' : 'Mark for review')}</h2></div>
              <button type="button" className="maintenance-decision-close" aria-label={t("Close claim decision")} disabled={Boolean(busyClaimId)} onClick={() => setClaimDecision(null)}>×</button>
            </div>
            <p className="maintenance-decision-copy">{claimDecision.claim.unitName || t('AC unit')} · {claimDecision.claim.claimId}</p>
            {claimDecision.coveredComponent ? <p className="maintenance-decision-component">{t("Covered component:")} <strong>{claimDecision.coveredComponent}</strong></p> : null}
            <form onSubmit={reviewWarrantyClaim}>
              <label htmlFor="maintenance-decision-note">{t("Decision note")} <span>{t("(optional)")}</span></label>
              <textarea id="maintenance-decision-note" autoFocus value={decisionNote} maxLength={500} onChange={(event) => setDecisionNote(event.target.value)} placeholder={t("Add context for the claim record")} disabled={Boolean(busyClaimId)} />
              {decisionError ? <p className="maintenance-decision-error" role="alert">{t(decisionError)}</p> : null}
              <div className="maintenance-decision-actions">
                <button type="button" className="maintenance-button maintenance-button--secondary" disabled={Boolean(busyClaimId)} onClick={() => setClaimDecision(null)}>{t("Cancel")}</button>
                <button type="submit" className="maintenance-button" disabled={Boolean(busyClaimId)}>{t(busyClaimId ? 'Saving…' : 'Save decision')}</button>
              </div>
            </form>
          </section>
        </div> : null}

        <div className="maintenance-workspace">
          <div id={queueId} className="maintenance-queue-panel">
            <div className="maintenance-panel-heading">
              <div><p className="maintenance-eyebrow">{t("Service queue")}</p><h2 ref={queueHeading} tabIndex={-1}>{t("Requests")}</h2></div>
              <button type="button" className="maintenance-button maintenance-button--secondary" onClick={() => load({ fresh: true })} disabled={loading}>
                {t(loading ? 'Refreshing…' : 'Refresh')}
              </button>
            </div>
            <div className="maintenance-filters">
              <label className="maintenance-search-field"><span>{t("Search")}</span><input maxLength={160} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Customer, unit, issue, address")} /></label>
              <label>
                <span>{t("Status")}</span>
                <SearchableSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">{t("All statuses")}</option>
                  <option value="unassigned">{t("Needs assignment")}</option>
                  <option value="active">{t("Assigned")} / {t("In Progress")}</option>
                  {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{t(status)}</option>)}
                </SearchableSelect>
              </label>
              <label><span>{t("Technician")}</span><SearchableSelect value={technicianFilter} onChange={(event) => setTechnicianFilter(event.target.value)}><option value="all">{t("All technicians")}</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name || `${technician.name_first || ''} ${technician.name_last || ''}`.trim() || technician.email}</option>)}</SearchableSelect></label>
              <button type="button" className="maintenance-filter-reset" onClick={resetFilters} disabled={!search && statusFilter === 'all' && technicianFilter === 'all'}>{t("Clear filters")}</button>
            </div>
            {loading ? <LoadingSkeleton label={t("Loading service requests…")} /> : <ServiceRequests requests={filteredRequests} selectedId={selected?.id} onSelect={setSelected} />}
          </div>
          <RequestDetails request={selected} onUpdated={handleUpdated} />
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminMaintenance;
