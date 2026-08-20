import React, { useEffect, useMemo, useState } from 'react';
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
  lastServiceDate: today(),
  placementArea: '',
  usageHoursPerDay: 8,
  environmentDustLevel: 'moderate',
  occupancyLoad: 'normal',
  filterCondition: 'normal',
  coilCondition: 'normal',
  drainageCondition: 'clear',
  voltageStability: 'stable',
  conditionRating: 'good',
  notes: '',
  defectReason: ''
};

const requiredSerials = (task) => task?.registrationProgress?.requiredSerials || [];
const registrationFor = (task, serial) => task?.ampRegistrations?.[serial] || null;

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
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState('');

  const currentRegistration = useMemo(
    () => registrationFor(context.task, serialNumber),
    [context.task, serialNumber],
  );

  const loadContext = async (serial) => {
    if (!serial) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest(`/tasks/registration-context/${encodeURIComponent(serial)}`);
      setContext({ task: response.task, unit: response.unit });
      const previous = response.unit?.ampRegistration?.ampParameters || response.task?.ampRegistrations?.[serial]?.ampParameters;
      if (previous) {
        setForm((prev) => ({ ...prev, ...previous, lastServiceDate: today() }));
      }
    } catch (err) {
      setContext({ task: null, unit: null });
      setError(err.message || 'Unable to load QR registration context.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (querySerial) {
      loadContext(querySerial);
      return;
    }
    if (queryQr) {
      const parsed = parseQrInstallPayload(queryQr);
      if (parsed.ok) {
        const serial = parsed.data.serialNumber || parsed.data.serial || '';
        setSerialNumber(serial);
        setRawQr(queryQr);
        loadContext(serial);
      }
    }
  }, [querySerial, queryQr]);

  const handleParseQr = () => {
    const parsed = parseQrInstallPayload(rawQr);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const serial = parsed.data.serialNumber || parsed.data.serial || '';
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
    if (!defectiveHold && !String(form.placementArea || '').trim()) {
      setError('Add the unit placement area before registering it.');
      return;
    }
    if (defectiveHold && !String(form.defectReason || '').trim()) {
      setError('Add a defect reason before putting this unit on hold.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    setResult(null);
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
      setResult(response.registration);
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
          <h3>Required AMP Parameters</h3>
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
              Last service date
              <input type="date" value={form.lastServiceDate} onChange={(event) => updateField('lastServiceDate', event.target.value)} />
            </label>
            <label>
              Placement area
              <input value={form.placementArea} onChange={(event) => updateField('placementArea', event.target.value)} placeholder="Living room, office bay, bedroom..." />
            </label>
            <label>
              Daily usage hours
              <input type="number" min="1" max="24" value={form.usageHoursPerDay} onChange={(event) => updateField('usageHoursPerDay', event.target.value)} />
            </label>
            <label>
              Dust exposure
              <select value={form.environmentDustLevel} onChange={(event) => updateField('environmentDustLevel', event.target.value)}>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="severe">Severe</option>
              </select>
            </label>
            <label>
              Occupancy load
              <select value={form.occupancyLoad} onChange={(event) => updateField('occupancyLoad', event.target.value)}>
                <option value="light">Light</option>
                <option value="normal">Normal</option>
                <option value="heavy">Heavy</option>
              </select>
            </label>
            <label>
              Filter condition
              <select value={form.filterCondition} onChange={(event) => updateField('filterCondition', event.target.value)}>
                <option value="clean">Clean</option>
                <option value="normal">Normal</option>
                <option value="dusty">Dusty</option>
                <option value="clogged">Clogged</option>
              </select>
            </label>
            <label>
              Coil condition
              <select value={form.coilCondition} onChange={(event) => updateField('coilCondition', event.target.value)}>
                <option value="clean">Clean</option>
                <option value="normal">Normal</option>
                <option value="dusty">Dusty</option>
                <option value="iced">Iced</option>
              </select>
            </label>
            <label>
              Drainage
              <select value={form.drainageCondition} onChange={(event) => updateField('drainageCondition', event.target.value)}>
                <option value="clear">Clear</option>
                <option value="slow">Slow</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
            <label>
              Voltage stability
              <select value={form.voltageStability} onChange={(event) => updateField('voltageStability', event.target.value)}>
                <option value="stable">Stable</option>
                <option value="fluctuating">Fluctuating</option>
                <option value="unstable">Unstable</option>
              </select>
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
            Technician notes
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows={3} />
          </label>
          <label>
            Defect reason
            <textarea value={form.defectReason} onChange={(event) => updateField('defectReason', event.target.value)} rows={3} placeholder="Required only when holding completion" />
          </label>
          <div className="field-registration-actions">
            <button type="button" onClick={() => submitRegistration(false)} disabled={saving || !serialNumber}>
              {saving ? 'Submitting...' : 'Submit AMP Registration'}
            </button>
            <button type="button" className="field-registration-hold" onClick={() => submitRegistration(true)} disabled={saving || !serialNumber}>
              Mark Defective and Hold
            </button>
          </div>

          {result?.ampServicePlan ? (
            <div className="field-registration-result">
              <strong>Next ideal service: {result.ampServicePlan.label}</strong>
              <p>{result.ampServicePlan.monthsUntil} month service interval saved for this unit.</p>
            </div>
          ) : null}
        </section>
      </div>

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
