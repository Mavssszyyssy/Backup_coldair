import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../config/api';
import { TECHNICIAN_TIME_SLOTS } from '../../../domain/technicianTimeSlots';
import { technicianHasConflict } from '../../../domain/scheduleConflicts';
import { confirmDialog } from '../../../utils/dialog';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import './styles.css';
import ServicePaymentPanel from './ServicePaymentPanel';
import VisitFollowUpPanel from '../Common/VisitFollowUpPanel';

const getDisplayName = (user) => user?.name || `${user?.name_first || ''} ${user?.name_last || ''}`.trim() || user?.email || 'Technician';
const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila', timeZoneName: 'short' });
};
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dateValue = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : '';
const SERVICE_QUOTA_REQUIRED_MESSAGE = 'A Service Quota is required before this technician can be assigned to a warranty claim.';

const RequestDetails = ({ request, onUpdated }) => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [current, setCurrent] = useState(request);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [linkedTask, setLinkedTask] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [scheduledTasks, setScheduledTasks] = useState([]);

  useEffect(() => {
    if (message?.type !== 'success') return undefined;
    const timer = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

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
  }, [current]);
  useEffect(() => {
    setScheduledDate(dateValue(current?.scheduledDate || linkedTask?.scheduledDate || current?.preferredDate));
    const time = current?.timeSlot || linkedTask?.timeSlot || current?.preferredSchedule || '';
    setTimeSlot(time === 'TBD' ? '' : time);
  }, [current?.id, current?.scheduledDate, current?.preferredDate, current?.timeSlot, current?.preferredSchedule, linkedTask?.scheduledDate, linkedTask?.timeSlot]);
  useEffect(() => {
    let active = true;
    if (!scheduledDate) { setScheduledTasks([]); return () => { active = false; }; }
    apiRequest(`/tasks?scheduled_date=${encodeURIComponent(scheduledDate)}&limit=200`)
      .then((result) => { if (active) setScheduledTasks(Array.isArray(result.tasks) ? result.tasks : []); })
      .catch(() => { if (active) setScheduledTasks([]); });
    return () => { active = false; };
  }, [scheduledDate, current?.updatedAt]);

  const proof = linkedTask?.proof || null;
  const checkIn = linkedTask?.checkIn || linkedTask?.payload?.checkIn;
  const hasCheckIn = Boolean(checkIn?.checkedInAt) && Number.isFinite(checkIn?.latitude) && Number.isFinite(checkIn?.longitude);
  const hasProof = Boolean(proof?.submittedAt || proof?.customerSignature?.name) || (proof?.beforePhotos || []).some((photo) => photo?.uri) || (proof?.afterPhotos || []).some((photo) => photo?.uri);
  const isClosed = ['Completed', 'Cancelled'].includes(current?.status);
  const taskStatus = String(linkedTask?.status || '').replace(/-/g, ' ');
  const priority = String(current?.priority || current?.payload?.priority || linkedTask?.priority || 'medium');
  const appointmentDate = linkedTask?.scheduledDate || current?.scheduledDate || current?.preferredDate || 'Not set';
  const appointmentTime = linkedTask?.timeSlot || current?.timeSlot || 'Not set';
  const appointmentDateIsLocked = Boolean(dateValue(linkedTask?.scheduledDate || current?.scheduledDate || current?.preferredDate));
  const customerSelectedAppointment = Boolean(
    current?.preferredDate && dateValue(current.preferredDate) === dateValue(appointmentDate),
  );
  const assignmentLocked = Boolean(current?.assignedTechnicianId);
  const slotConflicts = (slot) => technicianHasConflict(scheduledTasks, {
    technicianId: selectedTechnicianId,
    scheduledDate,
    timeSlot: slot,
    excludeTaskId: linkedTask?.id,
  });
  const availableTimeSlots = TECHNICIAN_TIME_SLOTS.filter((slot) => !slotConflicts(slot));
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
      // A weak connection can lose the PATCH response after MongoDB already
      // saved the request (and its linked task). Verify the authoritative
      // record once instead of reporting failure or replaying the write.
      if (Number(error?.status) === 0) {
        try {
          const result = await apiRequest('/service-requests?limit=200', {
            timeoutMs: 10000,
            silentConnection: true,
          });
          const saved = (result.requests || []).find(item => String(item.id) === String(current.id));
          const expectedStatus = String(payload.status || '').trim().toLowerCase();
          const statusMatches = !expectedStatus || String(saved?.status || '').trim().toLowerCase() === expectedStatus;
          const technicianMatches = !payload.assignedTechnicianId
            || String(saved?.assignedTechnicianId || '') === String(payload.assignedTechnicianId);
          if (saved && statusMatches && technicianMatches) {
            setCurrent(saved);
            onUpdated?.(saved);
            setMessage({ type: 'success', text: `${t(successText)} ${t('Connection restored and the saved result was verified.')}` });
            return;
          }
        } catch {
          // Keep the original error when the verification read also fails.
        }
      }
      setMessage({ type: 'error', text: error?.message || 'Request update failed.' });
    } finally { setBusy(false); }
  };

  const assignTechnician = () => {
    if (assignmentLocked) { setMessage({ type: 'error', text: 'This technician assignment is already saved and permanently locked.' }); return; }
    const technician = technicians.find((item) => String(item.id) === String(selectedTechnicianId));
    if (!technician) { setMessage({ type: 'error', text: 'Choose a technician before assigning this request.' }); return; }
    if (current?.warrantyClaimId && (!Number.isSafeInteger(Number(technician.serviceQuota)) || Number(technician.serviceQuota) < 1)) {
      setMessage({ type: 'error', text: SERVICE_QUOTA_REQUIRED_MESSAGE });
      return;
    }
    if (!scheduledDate || scheduledDate < today() || !timeSlot.trim()) { setMessage({ type: 'error', text: 'Choose today or a future appointment date and a time slot.' }); return; }
    if (slotConflicts(timeSlot)) { setMessage({ type: 'error', text: 'This technician already has an overlapping job during the selected time. Choose an available time slot.' }); return; }
    updateRequest(
      { status: 'In Progress', assignedTechnicianId: technician.id, assignedTechnicianName: getDisplayName(technician), scheduledDate, timeSlot: timeSlot.trim() },
      'Technician and appointment saved. The customer and technician receive the updated schedule.',
    );
  };

  const cancelRequest = async () => {
    const confirmed = await confirmDialog({
      title: t('Cancel Service Request?'),
      message: t('The request will be cancelled, but its service history will be kept.'),
      confirmText: t('Cancel Request'),
      destructive: true,
    });
    if (!confirmed) return;
    await updateRequest({ status: 'Cancelled', description: 'Cancelled by an administrator.' }, 'Service request cancelled.');
  };

  if (!current) return <aside className="maintenance-details maintenance-details--empty"><div className="maintenance-empty-icon">⌁</div><h2>{t('Select a request')}</h2><p>{t('Choose an item from the service queue to review the customer details and manage its assignment.')}</p></aside>;

  return <aside className="maintenance-details" aria-live="polite">
    <div className="maintenance-detail-header"><div><p className="maintenance-eyebrow">{t('Request details')}</p><h2>{current.unitName || t('Service request')}</h2><p className="maintenance-request-id">{t('Request')} #{current.requestNumber || current.id}</p></div><span className={`maintenance-status maintenance-status-${String(current.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{t(current.status || 'Submitted')}</span></div>
    {message ? <div className={`maintenance-message maintenance-message--${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{t(message.text)}</div> : null}
    <div className="maintenance-detail-section"><h3>{t('Customer & request')}</h3><dl className="maintenance-detail-grid"><div><dt>{t('Customer')}</dt><dd>{current.customerName || current.customer || t('Not provided')}</dd></div><div><dt>{t('AC unit')}</dt><dd>{current.unitName || t('Not provided')}</dd></div><div><dt>{t('Service type')}</dt><dd>{t(current.issueType || current.serviceType || 'Service request')}</dd></div><div><dt>{t('Priority')}</dt><dd>{t(priority)}</dd></div>{isClosed ? <><div><dt>{t('Appointment date')}</dt><dd>{t(appointmentDate)}</dd></div><div><dt>{t('Time slot')}</dt><dd>{t(appointmentTime)}</dd></div></> : null}<div><dt>{t('Branch')}</dt><dd>{current.branch || t('Unassigned')}</dd></div><div className="maintenance-detail-grid--wide"><dt>{t('Issue')}</dt><dd>{current.issueDescription || current.issue || t('No description provided')}</dd></div><div className="maintenance-detail-grid--wide"><dt>{t('Service address')}</dt><dd>{current.address || t('Not provided')}</dd></div></dl></div>
    {!isClosed ? <div className="maintenance-detail-section"><h3>{t('Service appointment')}</h3><p>{t(assignmentLocked ? 'The saved appointment and assigned technician are locked. Use Visit follow-up only when a new visit is required.' : appointmentDateIsLocked ? 'The appointment date is already recorded. Choose the technician and an available time slot.' : 'Choose the appointment date and time slot before assigning a technician.')}</p>{appointmentDateIsLocked || assignmentLocked ? <div className="maintenance-locked-field"><span>{t('Appointment date')}</span><strong>{scheduledDate}</strong><small>{t(customerSelectedAppointment ? 'Selected by customer' : 'Confirmed appointment date')}</small></div> : <label className="maintenance-assignment-field"><span>{t('Appointment date')}</span><input type="date" min={today()} value={scheduledDate} onChange={event => setScheduledDate(event.target.value)} disabled={busy} /></label>}{assignmentLocked ? <div className="maintenance-locked-field"><span>{t('Time slot')}</span><strong>{timeSlot || appointmentTime}</strong><small>{t('Saved with this assignment')}</small></div> : <label className="maintenance-assignment-field"><span>{t('Available time slot')}</span><select value={timeSlot} onChange={event => setTimeSlot(event.target.value)} disabled={busy || !selectedTechnicianId} required><option value="">{t(selectedTechnicianId ? 'Select available time slot' : 'Choose a technician first')}</option>{timeSlot && !TECHNICIAN_TIME_SLOTS.includes(timeSlot) && !slotConflicts(timeSlot) ? <option value={timeSlot}>{timeSlot} ({t('Current appointment')})</option> : null}{availableTimeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}</select>{selectedTechnicianId && availableTimeSlots.length === 0 ? <small className="maintenance-conflict-note">{t('This technician has no available standard time slots on this date.')}</small> : null}</label>}</div> : null}
    <div className="maintenance-detail-section"><div className="maintenance-section-heading"><div><h3>{t('Technician assignment')}</h3><p>{current.assignedTechnicianName ? `${current.assignedTechnicianName} ${t('is permanently assigned to this request.')}` : t('No technician has been assigned yet.')}</p></div>{linkedTask ? <span className="maintenance-task-chip">{t('Work order')}: {linkedTask.taskCode || linkedTask.id} · {t(taskStatus || 'pending')}</span> : null}</div>{assignmentLocked ? <div className="maintenance-assignment-lock" role="status"><strong>{t('Assignment saved')}</strong><span>{current.assignedTechnicianName || t('Assigned technician')}</span><small>{t('The assigned technician cannot be replaced through the normal assignment flow.')}</small></div> : <label className="maintenance-assignment-field"><span>{t('Choose technician')}</span><select value={selectedTechnicianId} disabled={busy || isClosed} onChange={(event) => setSelectedTechnicianId(event.target.value)}><option value="">{t('Select technician')}</option>{branchTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{getDisplayName(technician)}{(technician.assignedBranch || technician.activeBranch) ? ` · ${technician.assignedBranch || technician.activeBranch}` : ''}{current?.warrantyClaimId ? technician.serviceQuota ? ` · ${t('Service Quota')} ${technician.serviceQuota}` : ` · ${t('Service Quota required')}` : ''}</option>)}</select></label>}{current?.warrantyClaimId ? <p className="maintenance-muted">{t('A defined Service Quota is required for warranty assignment.')}</p> : null}<div className="maintenance-action-row">{!assignmentLocked ? <button type="button" className="maintenance-button" onClick={assignTechnician} disabled={busy || isClosed || !selectedTechnicianId}>{t(busy ? 'Saving…' : 'Assign technician')}</button> : null}{!isClosed && current.status === 'Submitted' ? <button type="button" className="maintenance-button maintenance-button--secondary" onClick={() => updateRequest({ status: 'Reviewed' }, 'Request marked as reviewed.')} disabled={busy}>{t('Mark reviewed')}</button> : null}</div></div>
    <ServicePaymentPanel request={current} onUpdated={updated => { setCurrent(updated); onUpdated?.(updated); }} />
    <VisitFollowUpPanel task={linkedTask} onUpdated={async () => {
      const result = await apiRequest(`/tasks/${encodeURIComponent(linkedTask.id || linkedTask.taskCode)}`);
      setLinkedTask(result.task);
      setCurrent(value => ({ ...value, status: 'In Progress', scheduledDate: result.task.scheduledDate, timeSlot: result.task.timeSlot }));
      onUpdated?.({ ...current, status: 'In Progress', scheduledDate: result.task.scheduledDate, timeSlot: result.task.timeSlot });
    }} />
    <div className="maintenance-completion-note"><strong>{t('Completion workflow')}</strong><span>{t(completionNote)}</span></div>
    <div className="maintenance-detail-section"><h3>{t('Technician arrival')}</h3>{hasCheckIn ? <><p>{t('Checked in')}: {formatDateTime(checkIn.checkedInAt)}</p><p>{checkIn.latitude}, {checkIn.longitude}</p><a href={`https://www.google.com/maps?q=${checkIn.latitude},${checkIn.longitude}`} target="_blank" rel="noreferrer">{t('Open check-in map')}</a></> : <p>{t('No GPS check-in recorded yet.')}</p>}</div>
    {hasProof ? <div className="maintenance-detail-section"><h3>{t('Technician proof of work')}</h3><dl className="maintenance-detail-grid"><div><dt>{t('Before condition')}</dt><dd>{linkedTask.beforeCondition || t('Not recorded')}</dd></div><div><dt>{t('After condition')}</dt><dd>{linkedTask.afterCondition || t('Not recorded')}</dd></div><div><dt>{t('Findings')}</dt><dd>{linkedTask.findings || t('Not recorded')}</dd></div><div><dt>{t('Resolution')}</dt><dd>{linkedTask.resolution || t('Not recorded')}</dd></div><div><dt>{t('Submitted')}</dt><dd>{t(formatDateTime(proof.submittedAt || linkedTask.proofSubmittedAt))}</dd></div></dl><div className="maintenance-proof-images">{[...(proof.beforePhotos || []).slice(0, 1), ...(proof.afterPhotos || []).slice(0, 1)].map((photo, index) => <a key={`${photo.uri}-${index}`} href={photo.uri} target="_blank" rel="noreferrer"><img src={photo.uri} alt={photo.label || t('Service proof')} /><span>{photo.label || t('Service proof')}</span></a>)}</div></div> : null}
    <div className="maintenance-detail-section"><h3>{t('Status history')}</h3><div className="maintenance-timeline">{(current.timeline || []).length ? (current.timeline || []).map((event) => <div key={event.id || `${event.title}-${event.timestamp}`} className="maintenance-timeline-item"><strong>{event.title || t('Request updated')}</strong><span>{event.description || t('No description provided.')}</span><small>{event.actor || t('System')} · {t(formatDateTime(event.timestamp))}</small></div>) : <p className="maintenance-muted">{t('No status history yet.')}</p>}</div></div>
    {!isClosed ? <div className="maintenance-danger-zone"><button type="button" onClick={cancelRequest} disabled={busy}>{t('Cancel request')}</button></div> : null}
  </aside>;
};

export default RequestDetails;
