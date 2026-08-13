import { useState } from 'react';

const SERVICE_OPTIONS = [
  { id: 'cleaning_inspection', label: 'Cleaning and inspection', price: 899 },
  { id: 'diagnosis_repair', label: 'Diagnosis and repair', price: 1499 },
  { id: 'location_transfer', label: 'Location transfer', price: 0, disabled: true, disabledReason: 'Not offered in your area (demo)' }
];

function ScheduleServiceModal({ unit, onClose, onSchedule }) {
  const [serviceTypeId, setServiceTypeId] = useState(SERVICE_OPTIONS[0].id);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [faults, setFaults] = useState('');
  const [technician, setTechnician] = useState('any');

  const selected = SERVICE_OPTIONS.find((o) => o.id === serviceTypeId) || SERVICE_OPTIONS[0];
  const basePrice = selected.disabled ? 0 : selected.price;

  const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const handleSubmit = () => {
    if (selected.disabled) {
      alert(selected.disabledReason || 'This service is not available.');
      return;
    }
    if (!date || !time) {
      alert('Please select date and time');
      return;
    }
    if (date < today) {
      alert('Please select today or a future date.');
      return;
    }
    onSchedule(unit, {
      serviceType: selected.label,
      serviceTypeId,
      date,
      time,
      notes: faults.trim() || undefined,
      technician
    });
  };

  const addOn = technician === 'senior' ? 200 : technician === 'express' ? 500 : 0;
  const total = basePrice + addOn;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="unit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Schedule service — {unit.brand} {unit.model}</h3>
          <button type="button" className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {unit.ampereNextServiceLabel && (
            <p className="schedule-ampere-hint">
              AMPERE suggested window: <strong>{unit.ampereNextServiceLabel}</strong>
            </p>
          )}

          <div className="form-group">
            <label>Type of service</label>
            <select
              value={serviceTypeId}
              onChange={(e) => setServiceTypeId(e.target.value)}
            >
              {SERVICE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                  {opt.label}
                  {opt.disabled ? ` — ${opt.disabledReason}` : ` — ₱${opt.price.toLocaleString()}`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Time</label>
              <select value={time} onChange={(e) => setTime(e.target.value)}>
                <option value="">Select time</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Preferred technician</label>
            <select value={technician} onChange={(e) => setTechnician(e.target.value)}>
              <option value="any">Any available</option>
              <option value="senior">Senior (+₱200)</option>
              <option value="express">Express (+₱500)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Unit faults or conditions (optional)</label>
            <textarea
              rows={3}
              placeholder="Describe issues; leave blank if none"
              value={faults}
              onChange={(e) => setFaults(e.target.value)}
            />
          </div>

          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', marginTop: '15px' }}>
            <div className="info-row">
              <span>Service price:</span>
              <span>₱{basePrice.toLocaleString()}</span>
            </div>
            {addOn > 0 && (
              <div className="info-row">
                <span>Add-on:</span>
                <span>₱{addOn.toLocaleString()}</span>
              </div>
            )}
            <div
              className="info-row"
              style={{ fontWeight: 'bold', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}
            >
              <span>Total:</span>
              <span>₱{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="confirm-btn" onClick={handleSubmit}>
            Confirm booking
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScheduleServiceModal;
