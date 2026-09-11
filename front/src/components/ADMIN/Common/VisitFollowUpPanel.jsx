import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';
import { TECHNICIAN_TIME_SLOTS } from '../../../domain/technicianTimeSlots';
import './VisitFollowUpPanel.css';

export default function VisitFollowUpPanel({ task, onUpdated }) {
  const summary = task?.visitAttempt || task?.payload?.visitAttempt;
  const taskId = task?.id || task?._id || task?.taskCode;
  const [attempt, setAttempt] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setAttempt(null); setMessage(''); setConfirmed(false);
    if (summary?.id) apiRequest(`/tasks/${encodeURIComponent(taskId)}/visit-attempt`)
      .then(result => { if (active) setAttempt(result.attempt); })
      .catch(error => { if (active) setMessage(error.message || 'Unable to load visit proof.'); });
    return () => { active = false; };
  }, [taskId, summary?.id, summary?.awaitingAdmin, reload]);
  if (!summary?.id) return null;
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      await apiRequest(`/tasks/${encodeURIComponent(taskId)}/next-visit`, { method: 'PATCH', body: JSON.stringify({ attemptId: summary.id, scheduledDate: date, timeSlot: time }) });
      setConfirmed(true); setMessage('Next visit confirmed. The technician must check in again.');
      await onUpdated?.();
    } catch (error) { setMessage(error.message || 'Unable to confirm the next visit.'); }
    finally { setBusy(false); }
  };
  const checkedIn = attempt?.checkIn;
  return <section className="visit-follow-up" aria-label="Visit follow-up">
    <div className="visit-follow-up-heading"><h3>{summary.installationFailed ? 'Failed installation follow-up' : 'Visit follow-up'}</h3><span>{summary.awaitingAdmin && !confirmed ? (summary.nextWorkflowStatus === 'to_dispatch' ? 'To Dispatch' : summary.installationFailed ? 'For Rescheduling' : 'Admin action needed') : 'Next visit confirmed'}</span></div>
    <p><strong>{summary.installationFailed ? 'Failed to Install' : summary.outcome === 'reschedule' ? 'Technician requested a reschedule' : 'Technician closed this attempt'}</strong> — no one was available. The {summary.installationFailed ? 'installation' : 'customer request'} has not been completed.</p>
    <p>{summary.note}</p>
    <p className="visit-follow-up-meta">Recorded: {new Date(summary.submittedAt).toLocaleString()}{attempt?.technicianName ? ` · ${attempt.technicianName}` : ''}</p>
    {summary.payment ? <div className="visit-follow-up-payment"><strong>Payment on ticket: {String(summary.payment.status || 'pending').replace(/_/g, ' ')}</strong><span>{String(summary.payment.method || 'Payment').toUpperCase()} · PHP {Number(summary.payment.amount || 0).toFixed(2)}</span>{summary.payment.paidAt ? <small>Confirmed {new Date(summary.payment.paidAt).toLocaleString()}</small> : null}</div> : null}
    {checkedIn ? <a href={`https://www.google.com/maps?q=${checkedIn.latitude},${checkedIn.longitude}`} target="_blank" rel="noreferrer">View this attempt’s GPS check-in</a> : null}
    {attempt?.photo?.uri ? <a href={attempt.photo.uri} target="_blank" rel="noreferrer"><img className="visit-follow-up-photo" src={attempt.photo.uri} alt="Technician proof of unattended visit" /></a> : <button type="button" onClick={() => setReload(value => value + 1)}>Reload proof photo</button>}
    {summary.awaitingAdmin && !confirmed && !['completed', 'cancelled'].includes(task.status) ? <form onSubmit={save}>
      <p>Contact the customer, then confirm the next date and time. This requires a fresh GPS arrival.</p>
      <div className="visit-follow-up-fields"><label>Next visit date<input required type="date" value={date} onChange={e => setDate(e.target.value)} disabled={busy} /></label>
        <label>Time slot<select required value={time} onChange={e => setTime(e.target.value)} disabled={busy}><option value="">Choose time slot</option>{TECHNICIAN_TIME_SLOTS.map(slot => <option key={slot}>{slot}</option>)}</select></label></div>
      <button className="visit-follow-up-confirm" disabled={busy || !date || !time}>{busy ? 'Confirming…' : 'Confirm next visit'}</button>
    </form> : null}
    {summary.resolution ? <p>Next visit: {summary.resolution.scheduledDate} · {summary.resolution.timeSlot}</p> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
