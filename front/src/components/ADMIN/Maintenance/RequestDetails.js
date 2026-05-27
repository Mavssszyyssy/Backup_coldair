import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';

const getDisplayName = (user) =>
  user?.name ||
  `${user?.name_first || ''} ${user?.name_last || ''}`.trim() ||
  user?.email ||
  'Technician';

const formatDateTime = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const RequestDetails = ({ request, onUpdated }) => {
  const [current, setCurrent] = useState(request);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [linkedTask, setLinkedTask] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setCurrent(request);
    setSelectedTechnicianId(request?.assignedTechnicianId || '');
    setMessage('');
  }, [request]);

  useEffect(() => {
    let active = true;
    apiRequest('/users?role=technician')
      .then((result) => {
        if (!active) return;
        setTechnicians(result.users || []);
      })
      .catch(() => {
        if (active) setTechnicians([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const linkedTaskId = current?.linkedTaskId || current?.taskCode;
    if (!linkedTaskId) {
      setLinkedTask(null);
      return () => {
        active = false;
      };
    }
    apiRequest(`/tasks/${encodeURIComponent(linkedTaskId)}`)
      .then((result) => {
        if (active) setLinkedTask(result.task || null);
      })
      .catch(() => {
        if (active) setLinkedTask(null);
      });
    return () => {
      active = false;
    };
  }, [current?.linkedTaskId, current?.taskCode]);

  const updateRequest = async (payload, successText) => {
    if (!current?.id) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await apiRequest(`/service-requests/${current.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setCurrent(result.request);
      onUpdated?.(result.request);
      setMessage(successText);
    } catch (error) {
      setMessage(error?.message || 'Request update failed.');
    } finally {
      setBusy(false);
    }
  };

  const markCompleted = () => {
    updateRequest({ status: 'Completed' }, 'Request marked completed.');
  };

  const assignTechnician = () => {
    const technician = technicians.find((item) => String(item.id) === String(selectedTechnicianId));
    if (!technician) {
      setMessage('Choose a technician first.');
      return;
    }
    updateRequest(
      {
        status: 'Assigned',
        assignedTechnicianId: technician.id,
        assignedTechnicianName: getDisplayName(technician),
      },
      'Technician assigned and task created.',
    );
  };

  if (!current) {
    return (
      <div className="admin-card">
        <h3>Request Details</h3>
        <p>Select a request to view full details.</p>
      </div>
    );
  }

  const proof = linkedTask?.proof || null;
  const hasProof =
    Boolean(proof?.submittedAt || proof?.customerSignature?.name) ||
    (proof?.beforePhotos || []).some((photo) => photo?.uri) ||
    (proof?.afterPhotos || []).some((photo) => photo?.uri);

  return (
    <div className="admin-card">
      <h3>Request #{current.id}</h3>
      <p><strong>Customer:</strong> {current.customer}</p>
      <p><strong>Unit:</strong> {current.unitName || 'N/A'}</p>
      <p><strong>Issue:</strong> {current.issue}</p>
      <p><strong>Preferred Schedule:</strong> {current.preferredDate || current.preferredSchedule || 'Not set'}</p>
      <p><strong>Address:</strong> {current.address}</p>
      <p><strong>Status:</strong> {current.status}</p>
      {current.assignedTechnicianName ? (
        <p><strong>Assigned Technician:</strong> {current.assignedTechnicianName}</p>
      ) : (
        <p><strong>Assigned Technician:</strong> <span style={{ color: '#9ca3af' }}>Waiting for technician to accept...</span></p>
      )}
      {current.linkedTaskId ? (
        <p><strong>Linked Task:</strong> {current.taskCode || current.linkedTaskId}</p>
      ) : null}

      {hasProof ? (
        <div style={{ marginTop: 18 }}>
          <h4 style={{ marginBottom: 8 }}>Technician Service Proof</h4>
          <p><strong>Before:</strong> {linkedTask.beforeCondition || 'No before condition submitted.'}</p>
          <p><strong>Findings:</strong> {linkedTask.findings || 'No findings submitted.'}</p>
          <p><strong>Resolution:</strong> {linkedTask.resolution || 'No resolution submitted.'}</p>
          <p><strong>After:</strong> {linkedTask.afterCondition || 'No after condition submitted.'}</p>
          <p><strong>Customer Sign-off:</strong> {proof.customerSignature?.name || linkedTask.customerSignatureName || 'No sign-off yet.'}</p>
          <p><strong>Submitted By:</strong> {proof.technicianName || linkedTask.assignedTechnicianName || 'Technician'}</p>
          <p><strong>Submitted At:</strong> {formatDateTime(proof.submittedAt || linkedTask.proofSubmittedAt)}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 10 }}>
            {(proof.beforePhotos || []).slice(0, 1).map((photo, index) => (
              <a key={`before-${index}`} href={photo.uri} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}>
                <img src={photo.uri} alt={photo.label || 'Before service'} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #d1d5db' }} />
                <span>{photo.label || 'Before service'}</span>
              </a>
            ))}
            {(proof.afterPhotos || []).slice(0, 1).map((photo, index) => (
              <a key={`after-${index}`} href={photo.uri} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}>
                <img src={photo.uri} alt={photo.label || 'After service'} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #d1d5db' }} />
                <span>{photo.label || 'After service'}</span>
              </a>
            ))}
          </div>
          {(proof.beforePhotos || []).length === 0 && (proof.afterPhotos || []).length === 0 ? (
            <p style={{ color: '#64748b' }}>No proof photos submitted yet.</p>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 18 }}>
        <h4 style={{ marginBottom: 8 }}>Status History</h4>
        <div className="maintenance-timeline">
          {(current.timeline || []).length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>No status history yet.</p>
          ) : null}
          {(current.timeline || []).map((event) => (
            <div key={event.id || `${event.title}-${event.timestamp}`} className="maintenance-timeline-item">
              <strong>{event.title || 'Request Updated'}</strong>
              <span>{event.description || 'No description provided.'}</span>
              <small>{`${event.actor || 'System'} - ${formatDateTime(event.timestamp)}`}</small>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 18, maxWidth: 360 }}>
        <label htmlFor="technician-select" style={{ fontWeight: 700 }}>Assign Technician</label>
        <select
          id="technician-select"
          value={selectedTechnicianId}
          onChange={(event) => setSelectedTechnicianId(event.target.value)}
          style={{
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            background: '#fff',
          }}
        >
          <option value="">Select technician</option>
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {getDisplayName(technician)}
            </option>
          ))}
        </select>
        <button type="button" onClick={assignTechnician} disabled={busy || !selectedTechnicianId} style={{
          padding: '10px 20px',
          background: '#0f172a',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: busy || !selectedTechnicianId ? 'not-allowed' : 'pointer',
          fontWeight: 700
        }}>
          {busy ? 'Saving...' : 'Assign Technician'}
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <button type="button" onClick={markCompleted} disabled={busy} style={{ 
          padding: '10px 20px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 700
        }}>
          {busy ? 'Saving…' : 'Mark Completed'}
        </button>
      </div>

      {message ? <p style={{ marginTop: 12, color: '#1f2937', fontWeight: 600 }}>{message}</p> : null}
    </div>
  );
};

export default RequestDetails;
