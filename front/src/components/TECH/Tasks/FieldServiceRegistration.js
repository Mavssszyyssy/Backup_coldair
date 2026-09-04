import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../../config/api';
import { parseQrInstallPayload } from '../../../domain/myunit/parseQrInstallPayload';
import TechLayout from '../Common/TechLayout';
import '../techShared.css';
import './styles.css';

const today = () => new Date().toISOString().split('T')[0];

const defaultForm = {
  installationDate: today(),
  installationTime: new Date().toTimeString().slice(0, 5),
  roomSizeSqm: '',
  conditionRating: 'good',
  notes: '',
  defectReason: ''
};

const requiredSerials = (task) => task?.registrationProgress?.requiredSerials || [];
const registrationFor = (task, serial) => task?.ampRegistrations?.[serial] || null;

const HistoryTable = ({ columns, rows, values }) => (
  <div style={{ overflowX: 'auto' }}>
    <table className="field-registration-history-table">
      <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>{rows?.length ? rows.map((row, index) => <tr key={row.id || `${row.date}-${index}`}>{values(row).map((value, valueIndex) => <td key={`${row.id || index}-${valueIndex}`}>{value || '—'}</td>)}</tr>) : <tr><td colSpan={columns.length}>No records found.</td></tr>}</tbody>
    </table>
  </div>
);

const FieldServiceRegistration = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const querySerial = searchParams.get('serial') || searchParams.get('serialNumber') || '';
  const queryQr = searchParams.get('qr') || '';
  const [rawQr, setRawQr] = useState(queryQr || querySerial || '');
  const [serialNumber, setSerialNumber] = useState(querySerial);
  const [context, setContext] = useState({ task: null, unit: null });
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState(null);

  const currentRegistration = useMemo(
    () => registrationFor(context.task, serialNumber),
    [context.task, serialNumber],
  );

  const loadContext = useCallback(async (serial) => {
    if (!serial) return;
    setLoading(true);
    setError('');
    setHistory(null);
    setForm({
      ...defaultForm,
      installationDate: today(),
      installationTime: new Date().toTimeString().slice(0, 5),
    });
    try {
      const response = await apiRequest(`/tasks/registration-context/${encodeURIComponent(serial)}`);
      setContext({ task: response.task, unit: response.unit });
      const resolvedSerial = response.unit?.serialNumber || serial;
      if (resolvedSerial !== serial) {
        setSerialNumber(resolvedSerial);
        setRawQr(resolvedSerial);
        setSearchParams({ serial: resolvedSerial });
      }
      apiRequest(`/tasks/unit-history/${encodeURIComponent(resolvedSerial)}?taskId=${encodeURIComponent(response.task?.id || response.task?.taskCode || '')}`)
        .then((historyResponse) => setHistory(historyResponse))
        .catch(() => setHistory(null));
      const previous = response.unit?.ampRegistration?.ampParameters || response.task?.ampRegistrations?.[serial]?.ampParameters;
      if (previous) {
        setForm((current) => ({
          ...current,
          installationDate: previous.installationDate || current.installationDate,
          installationTime: previous.installationTime || current.installationTime,
          roomSizeSqm: previous.roomSizeSqm || current.roomSizeSqm,
          conditionRating: previous.conditionRating || current.conditionRating,
          notes: previous.notes || current.notes,
        }));
      }
    } catch (err) {
      setContext({ task: null, unit: null });
      setError(err.message || 'Unable to load QR registration context.');
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    if (querySerial) {
      loadContext(querySerial);
      return;
    }
    if (queryQr) {
      const parsed = parseQrInstallPayload(queryQr);
      if (parsed.ok) {
        const serial = parsed.data.serialNumber || parsed.data.serial || parsed.data.qrUnitId || '';
        setSerialNumber(serial);
        setRawQr(queryQr);
        loadContext(serial);
      }
    }
  }, [querySerial, queryQr, loadContext]);

  const handleParseQr = () => {
    const parsed = parseQrInstallPayload(rawQr);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const serial = parsed.data.serialNumber || parsed.data.serial || parsed.data.qrUnitId || '';
    setSerialNumber(serial);
    setSearchParams({ serial });
    loadContext(serial);
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitRegistration = async (defectiveHold = false) => {
    if (!context.task?.id) {
      setError('No assigned installation task was found for this QR label.');
      return;
    }
    const roomSizeSqm = Number(form.roomSizeSqm);
    if (!defectiveHold && (!Number.isFinite(roomSizeSqm) || roomSizeSqm <= 0 || roomSizeSqm > 10000)) {
      setError('Enter a valid room size from 1 to 10,000 m² so the AC horsepower can be checked.');
      return;
    }
    if (defectiveHold && !String(form.defectReason || '').trim()) {
      setError('Add a defect reason before putting this unit on hold.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiRequest(`/tasks/${context.task.id}/amp-registration`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          serialNumber,
          defectiveHold
        })
      });
      setContext((prev) => ({ ...prev, task: response.task }));
      const progress = response.registrationProgress || response.task?.registrationProgress;
      const registered = progress?.totalRegistered || 0;
      const required = progress?.totalRequired || 0;
      setNotice(
        defectiveHold
          ? `Unit ${serialNumber} is on hold. The task cannot be completed until the defect is resolved.`
          : `Unit ${serialNumber} registered successfully. ${registered} of ${required} assigned units are now registered.`,
      );
    } catch (err) {
      setError(err.message || 'Unable to submit AMP registration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TechLayout title="AMP Field Registration" subtitle={serialNumber ? `S/N ${serialNumber}` : 'Scan or paste a unit QR'}>
      <div className="tech-grid-2 field-registration-grid">
        <section className="tech-card field-registration-panel">
          <h3>QR Label</h3>
          <label htmlFor="field-qr-input">Scanned QR payload or serial number</label>
          <textarea
            id="field-qr-input"
            value={rawQr}
            onChange={(event) => setRawQr(event.target.value)}
            rows={4}
            placeholder="AC_UNIT:CAACT-... or https://.../tech/field-registration?serial=..."
          />
          <div className="field-registration-actions">
            <button type="button" onClick={handleParseQr} disabled={!rawQr.trim() || loading}>
              {loading ? 'Loading...' : 'Load Unit'}
            </button>
            {context.task?.id ? (
              <button type="button" onClick={() => navigate(`/tech/tasks/${context.task.taskCode || context.task.id}`)}>
                Open Task
              </button>
            ) : null}
          </div>

          {error ? <p className="field-registration-error">{error}</p> : null}
          {notice ? <p className="field-registration-notice" role="status">{notice}</p> : null}

          {context.unit ? (
            <div className="field-registration-summary">
              <strong>{[context.unit.brand, context.unit.productName || context.unit.model].filter(Boolean).join(' ') || 'AC Unit'}</strong>
              <span>{context.unit.status || 'available'}</span>
              <p>{context.unit.branch ? `${context.unit.branch} branch` : 'Branch not specified'}</p>
            </div>
          ) : null}

          {context.task ? (
            <div className="field-registration-summary">
              <strong>{context.task.title}</strong>
              <span>{context.task.status}</span>
              <p>{context.task.customer} / {context.task.address}</p>
              <p>
                Registered {context.task.registrationProgress?.totalRegistered || 0} of {context.task.registrationProgress?.totalRequired || 0}
                {context.task.registrationProgress?.totalHeld ? ` / ${context.task.registrationProgress.totalHeld} held` : ''}
              </p>
            </div>
          ) : null}

          {currentRegistration ? (
            <div className="field-registration-summary success">
              <strong>{currentRegistration.status === 'registered' ? 'AMP registered' : 'Completion on hold'}</strong>
              {currentRegistration.ampServicePlan?.label ? <p>Next ideal service: {currentRegistration.ampServicePlan.label}</p> : null}
              {currentRegistration.defectReason ? <p>Defect: {currentRegistration.defectReason}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="tech-form field-registration-panel">
          <h3>Installation and Room Capacity</h3>
          <p className="amp-muted">Room size is used only to check whether the AC horsepower suits the area. Servicing dates come from completed records for the same model or brand.</p>
          <div className="field-registration-form-grid">
            <label>
              Installation date
              <input type="date" value={form.installationDate} onChange={(event) => updateField('installationDate', event.target.value)} />
            </label>
            <label>
              Installation time
              <input type="time" value={form.installationTime} onChange={(event) => updateField('installationTime', event.target.value)} />
            </label>
            <label>
              Room size (m²) <span aria-hidden="true">*</span>
              <input type="number" min="1" max="10000" step="0.1" required value={form.roomSizeSqm} onChange={(event) => updateField('roomSizeSqm', event.target.value)} placeholder="Required for HP suitability" />
            </label>
            <label>
              Overall condition
              <select value={form.conditionRating} onChange={(event) => updateField('conditionRating', event.target.value)}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </label>
          </div>
          <label>
            Installation notes (optional)
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows={3} placeholder="Add only details relevant to the installation or observed condition." />
          </label>
          <label>
            Defect reason
            <textarea value={form.defectReason} onChange={(event) => updateField('defectReason', event.target.value)} rows={3} placeholder="Required only when holding completion" />
          </label>
          <div className="field-registration-actions">
            <button type="button" onClick={() => submitRegistration(false)} disabled={saving || !serialNumber}>
              {saving ? 'Submitting...' : 'Save Room Capacity and Register'}
            </button>
            <button type="button" className="field-registration-hold" onClick={() => submitRegistration(true)} disabled={saving || !serialNumber}>
              Mark Defective and Hold
            </button>
          </div>

        </section>
      </div>

      {history?.unit ? <section className="tech-card field-registration-panel">
        <h3>AC Unit Service History</h3>
        <p><strong>{history.unit.unitName}</strong> · {history.unit.serialNumber} · {history.unit.branch || 'Branch not recorded'}</p>
        <p>Owner: {history.unit.currentOwner || 'Not recorded'} · Warranty: {String(history.unit.warrantyStatus || 'Not recorded').replace(/_/g, ' ')}</p>
        <h4>Maintenance History</h4>
        <HistoryTable columns={['Date', 'Service Type', 'Technician', 'Findings', 'Action Taken', 'Status']} rows={history.maintenanceHistory} values={(item) => [item.date ? new Date(item.date).toLocaleDateString() : '', item.serviceType, item.technician, item.findings, item.actionTaken, item.status]} />
        <h4 style={{ marginTop: 20 }}>Repair History</h4>
        <HistoryTable columns={['Date', 'Issue', 'Diagnosis', 'Parts Used', 'Technician', 'Status']} rows={history.repairHistory} values={(item) => [item.date ? new Date(item.date).toLocaleDateString() : '', item.issue, item.diagnosis, item.partsUsed, item.technician, item.status]} />
        <h4 style={{ marginTop: 20 }}>Maintenance Recommendations</h4>
        <HistoryTable columns={['Calculated', 'Suggested Servicing Date', 'Recommended Service', 'Historical Basis']} rows={history.ampHistory} values={(item) => [item.date ? new Date(item.date).toLocaleDateString() : '', item.bestServicedBy ? new Date(item.bestServicedBy).toLocaleDateString() : 'Not available', String(item.recommendedService || '').replace(/_/g, ' '), item.recommendationBasis]} />
      </section> : null}

      {requiredSerials(context.task).length > 0 ? (
        <section className="tech-card field-registration-required">
          <h3>Units Required Before Completion</h3>
          <label className="task-registration-select-label">
            Select an assigned serial to register
            <select
              value={serialNumber}
              onChange={(event) => {
                const serial = event.target.value;
                setSerialNumber(serial);
                setRawQr(serial);
                setSearchParams({ serial });
                loadContext(serial);
              }}
            >
              {requiredSerials(context.task).map((serial) => {
                const registration = registrationFor(context.task, serial);
                return <option key={serial} value={serial}>{serial} — {registration?.status || 'registration required'}</option>;
              })}
            </select>
          </label>
        </section>
      ) : null}
    </TechLayout>
  );
};

export default FieldServiceRegistration;
