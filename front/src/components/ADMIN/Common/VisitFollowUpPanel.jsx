import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';
import { TECHNICIAN_TIME_SLOTS } from '../../../domain/technicianTimeSlots';
import { formatBusinessDateKey, formatBusinessDateTime } from '../../../utils/dateTime';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import useAutoDismissMessage from '../../../hooks/useAutoDismissMessage';
import './VisitFollowUpPanel.css';

export default function VisitFollowUpPanel({ task, onUpdated }) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const summary = task?.visitAttempt || task?.payload?.visitAttempt;
  const taskId = task?.id || task?._id || task?.taskCode;
  const [attempt, setAttempt] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useAutoDismissMessage(message.startsWith('Next visit confirmed and synchronized.') ? message : '', setMessage);
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
    if (!date || date < formatBusinessDateKey()) {
      setMessage('Choose today or a future visit date.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      await apiRequest(`/tasks/${encodeURIComponent(taskId)}/next-visit`, { method: 'PATCH', body: JSON.stringify({ attemptId: summary.id, scheduledDate: date, timeSlot: time }) });
      setConfirmed(true); setMessage('Next visit confirmed and synchronized. The technician must check in and confirm someone is available before installation starts.');
      await onUpdated?.();
    } catch (error) { setMessage(error.message || 'Unable to confirm the next visit.'); }
    finally { setBusy(false); }
  };
  const checkedIn = attempt?.checkIn;
  const paymentStatus = summary.payment?.paidAt || ['paid', 'verified', 'completed', 'succeeded'].includes(String(summary.payment?.status || '').toLowerCase())
    ? 'Paid'
    : String(summary.payment?.status || 'pending').replace(/_/g, ' ');
  return <section className="visit-follow-up" aria-label={t('Visit follow-up')}>
    <div className="visit-follow-up-heading"><h3>{t(summary.installationFailed ? 'Failed installation follow-up' : 'Visit follow-up')}</h3><span>{t(summary.awaitingAdmin && !confirmed ? (summary.nextWorkflowStatus === 'to_dispatch' ? 'To Dispatch' : summary.installationFailed ? 'For Rescheduling' : 'Admin action needed') : 'Next visit confirmed')}</span></div>
    <p><strong>{t(summary.installationFailed ? 'Failed to Install' : summary.outcome === 'reschedule' ? 'Technician requested a reschedule' : 'Technician closed this attempt')}</strong> — {t('no one was available. The')} {t(summary.installationFailed ? 'installation' : 'customer request')} {t('has not been completed.')}</p>
    <p>{summary.note}</p>
    <p className="visit-follow-up-meta">{t('Recorded')}: {formatBusinessDateTime(summary.submittedAt)}{attempt?.technicianName ? ` · ${attempt.technicianName}` : ''}</p>
    {summary.payment ? <div className="visit-follow-up-payment"><strong>{t('Payment on ticket')}: {t(paymentStatus)}</strong><span>{String(summary.payment.method || 'Payment').toUpperCase()} · PHP {Number(summary.payment.amount || 0).toFixed(2)}</span>{summary.payment.paidAt ? <small>{t('Confirmed')} {formatBusinessDateTime(summary.payment.paidAt)}</small> : null}</div> : null}
    {checkedIn ? <a href={`https://www.google.com/maps?q=${checkedIn.latitude},${checkedIn.longitude}`} target="_blank" rel="noreferrer">{t('View this attempt’s GPS check-in')}</a> : null}
    {attempt?.photo?.uri ? <a href={attempt.photo.uri} target="_blank" rel="noreferrer"><img className="visit-follow-up-photo" src={attempt.photo.uri} alt={t('Technician proof of unattended visit')} /></a> : <button type="button" onClick={() => setReload(value => value + 1)}>{t('Reload proof photo')}</button>}
    {summary.awaitingAdmin && !confirmed && !['completed', 'cancelled'].includes(task.status) ? <form onSubmit={save}>
      <p>{t('Contact the customer, then confirm the next date and time. This requires a fresh GPS arrival.')}</p>
      <div className="visit-follow-up-fields"><label>{t('Next visit date')}<input required type="date" min={formatBusinessDateKey()} value={date} onChange={e => setDate(e.target.value)} disabled={busy} /></label>
        <label>{t('Time slot')}<select required value={time} onChange={e => setTime(e.target.value)} disabled={busy}><option value="">{t('Choose time slot')}</option>{TECHNICIAN_TIME_SLOTS.map(slot => <option key={slot}>{slot}</option>)}</select></label></div>
      <button className="visit-follow-up-confirm" disabled={busy || !date || !time}>{t(busy ? 'Confirming…' : 'Confirm next visit')}</button>
    </form> : null}
    {summary.resolution ? <p>{t('Next visit')}: {summary.resolution.scheduledDate} · {summary.resolution.timeSlot}</p> : null}
    {message ? <p role="status">{t(message)}</p> : null}
  </section>;
}
