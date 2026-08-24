import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../config/api';
import './styles.css';

const getDisplayName = (user) => user?.name || `${user?.name_first || ''} ${user?.name_last || ''}`.trim() || user?.email || 'Technician';
const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const RequestDetails = ({ request, onUpdated }) => {
  const [current, setCurrent] = useState(request);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [linkedTask, setLinkedTask] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setCurrent(request);
    setSelectedTechnicianId(request?.assignedTechnicianId || '');
    setMessage(null);
  }, [request]);

  useEffect(() => {
    let active = true;
    apiRequest('/users?role=technician').then((result) => {
      if (active) setTechnicians(Array.isArray(result.users) ? result.users : []);
    }).catch(() => { if (active) setTechnicians([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const linkedTaskId = current?.linkedTaskId || current?.taskCode;
    if (!linkedTaskId) { setLinkedTask(null); return () => { active = false; }; }
    apiRequest(`/tasks/${encodeURIComponent(linkedTaskId)}`).then((result) => {
      if (active) setLinkedTask(result.task || null);
    }).catch(() => { if (active) setLinkedTask(null); });
    return () => { active = false; };
  }, [current?.linkedTaskId, current?.taskCode]);

  const proof = linkedTask?.proof || null;
  const hasProof = Boolean(proof?.submittedAt || proof?.customerSignature?.name) || (proof?.beforePhotos || []).some((photo) => photo?.uri) || (proof?.afterPhotos || []).some((photo) => photo?.uri);
  const isClosed = ['Completed', 'Cancelled'].includes(current?.status);
  const taskStatus = String(linkedTask?.status || '').replace(/-/g, ' ');
  const priority = String(current?.priority || current?.payload?.priority || linkedTask?.priority || 'medium');
  const appointmentDate = linkedTask?.scheduledDate || current?.scheduledDate || current?.preferredDate || 'Not set';
  const appointmentTime = linkedTask?.timeSlot || current?.timeSlot || 'Not set';
  const branchTechnicians = technicians.filter((technician) => {
    const technicianBranch = technician.assignedBranch || technician.activeBranch || '';
    return !current?.branch || !technicianBranch || technicianBranch === current.branch;
  });
  const completionNote = useMemo(() => linkedTask?.status === 'completed'
    ? 'The technician completed this work. The request status is synchronized automatically.'
    : (current?.linkedTaskId || current?.taskCode) ? 'This request can only be completed after the technician submits the required proof of work.' : 'Assign a technician to create the work order.', [current?.linkedTaskId, current?.taskCode, linkedTask?.status]);

  const updateRequest = async (payload, successText) => {
    if (!current?.id) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await apiRequest(`/service-requests/${current.id}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
      setCurrent(result.request);
      onUpdated?.(result.request);
      const linkedTaskId = result.request?.linkedTaskId || result.request?.taskCode;
      if (linkedTaskId) {
        try {
          const taskResult = await apiRequest(`/tasks/${encodeURIComponent(linkedTaskId)}`);
          setLinkedTask(taskResult.task || null);
        } catch {
          // The request update succeeded. A later refresh can retry the
          // non-critical work-order preview without reporting a false failure.
        }
      }
      setMessage({ type: 'success', text: successText });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Request update failed.' });
    } finally { setBusy(false); }
  };

  const assignTechnician = () => {
    const technician = technicians.find((item) => String(item.id) === String(selectedTechnicianId));
    if (!technician) { setMessage({ type: 'error', text: 'Choose a technician before assigning this request.' }); return; }
    updateRequest(
      { status: 'In Progress', assignedTechnicianId: technician.id, assignedTechnicianName: getDisplayName(technician) },
      'Technician assigned and work order activated. It is ready in their Work Orders list.',
    );
  };

  const cancelRequest = () => {
    if (!window.confirm('Cancel this service request? This does not delete its history.')) return;
    updateRequest({ status: 'Cancelled', description: 'Cancelled by an administrator.' }, 'Service request cancelled.');
  };

  if (!current) return <aside className="maintenance-details maintenance-details--empty"><div className="maintenance-empty-icon">⌁</div><h2>Select a request</h2><p>Choose an item from the service queue to review the customer details and manage its assignment.</p></aside>;

  return <aside className="maintenance-details" aria-live="polite">
    <div className="maintenance-detail-header"><div><p className="maintenance-eyebrow">Request details</p><h2>{current.unitName || 'Service request'}</h2><p className="maintenance-request-id">Request #{current.requestNumber || current.id}</p></div><span className={`maintenance-status maintenance-status-${String(current.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{current.status || 'Submitted'}</span></div>
    {message ? <div className={`maintenance-message maintenance-message--${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div> : null}
    <div className="maintenance-detail-section"><h3>Customer & request</h3><dl className="maintenance-detail-grid"><div><dt>Customer</dt><dd>{current.customerName || current.customer || 'Not provided'}</dd></div><div><dt>AC unit</dt><dd>{current.unitName || 'Not provided'}</dd></div><div><dt>Service type</dt><dd>{current.issueType || current.serviceType || 'Service request'}</dd></div><div><dt>Priority</dt><dd>{priority}</dd></div><div><dt>Appointment date</dt><dd>{appointmentDate}</dd></div><div><dt>Time slot</dt><dd>{appointmentTime}</dd></div><div><dt>Branch</dt><dd>{current.branch || 'Unassigned'}</dd></div><div className="maintenance-detail-grid--wide"><dt>Issue</dt><dd>{current.issueDescription || current.issue || 'No description provided'}</dd></div><div className="maintenance-detail-grid--wide"><dt>Service address</dt><dd>{current.address || 'Not provided'}</dd></div></dl></div>
    <div className="maintenance-detail-section"><div className="maintenance-section-heading"><div><h3>Technician assignment</h3><p>{current.assignedTechnicianName ? `Currently assigned to ${current.assignedTechnicianName}.` : 'No technician has been assigned yet.'}</p></div>{linkedTask ? <span className="maintenance-task-chip">Work order: {linkedTask.taskCode || linkedTask.id} · {taskStatus || 'pending'}</span> : null}</div><label className="maintenance-assignment-field"><span>Choose technician</span><select value={selectedTechnicianId} disabled={busy || isClosed} onChange={(event) => setSelectedTechnicianId(event.target.value)}><option value="">Select technician</option>{branchTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{getDisplayName(technician)}{(technician.assignedBranch || technician.activeBranch) ? ` · ${technician.assignedBranch || technician.activeBranch}` : ''}</option>)}</select></label><div className="maintenance-action-row"><button type="button" className="maintenance-button" onClick={assignTechnician} disabled={busy || isClosed || !selectedTechnicianId}>{busy ? 'Saving…' : current.assignedTechnicianId ? 'Reassign technician' : 'Assign technician'}</button>{!isClosed && current.status === 'Submitted' ? <button type="button" className="maintenance-button maintenance-button--secondary" onClick={() => updateRequest({ status: 'Reviewed' }, 'Request marked as reviewed.')} disabled={busy}>Mark reviewed</button> : null}</div></div>
    <div className="maintenance-completion-note"><strong>Completion workflow</strong><span>{completionNote}</span></div>
    {hasProof ? <div className="maintenance-detail-section"><h3>Technician proof of work</h3><dl className="maintenance-detail-grid"><div><dt>Before condition</dt><dd>{linkedTask.beforeCondition || 'Not recorded'}</dd></div><div><dt>After condition</dt><dd>{linkedTask.afterCondition || 'Not recorded'}</dd></div><div><dt>Findings</dt><dd>{linkedTask.findings || 'Not recorded'}</dd></div><div><dt>Resolution</dt><dd>{linkedTask.resolution || 'Not recorded'}</dd></div><div><dt>Customer sign-off</dt><dd>{proof.customerSignature?.name || linkedTask.customerSignatureName || 'Not submitted'}</dd></div><div><dt>Submitted</dt><dd>{formatDateTime(proof.submittedAt || linkedTask.proofSubmittedAt)}</dd></div></dl><div className="maintenance-proof-images">{[...(proof.beforePhotos || []).slice(0, 1), ...(proof.afterPhotos || []).slice(0, 1)].map((photo, index) => <a key={`${photo.uri}-${index}`} href={photo.uri} target="_blank" rel="noreferrer"><img src={photo.uri} alt={photo.label || 'Service proof'} /><span>{photo.label || 'Service proof'}</span></a>)}</div></div> : null}
    <div className="maintenance-detail-section"><h3>Status history</h3><div className="maintenance-timeline">{(current.timeline || []).length ? (current.timeline || []).map((event) => <div key={event.id || `${event.title}-${event.timestamp}`} className="maintenance-timeline-item"><strong>{event.title || 'Request updated'}</strong><span>{event.description || 'No description provided.'}</span><small>{event.actor || 'System'} · {formatDateTime(event.timestamp)}</small></div>) : <p className="maintenance-muted">No status history yet.</p>}</div></div>
    {!isClosed ? <div className="maintenance-danger-zone"><button type="button" onClick={cancelRequest} disabled={busy}>Cancel request</button></div> : null}
  </aside>;
};

export default RequestDetails;
