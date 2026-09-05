import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TechLayout from '../Common/TechLayout';
import UpdateTaskStatus from './UpdateTaskStatus';
import { apiRequest } from '../../../config/api';
import '../techShared.css';
import './styles.css';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const ProofPhoto = ({ photo }) => {
  if (!photo?.uri) return <span className="task-proof-empty">No photo submitted</span>;
  return (
    <a href={photo.uri} target="_blank" rel="noreferrer" className="task-proof-photo">
      <img src={photo.uri} alt={photo.label || 'Service proof'} />
      <span>{photo.label || 'View photo'}</span>
    </a>
  );
};

const TaskProofPanel = ({ proof = {}, task = {} }) => {
  const beforePhotos = proof.beforePhotos || [];
  const afterPhotos = proof.afterPhotos || [];
  return (
    <div className="tech-card task-proof-panel">
      <h3>Service Proof</h3>
      <p><strong>Customer Sign-off:</strong> {proof.customerSignature?.name || task.customerSignatureName || '-'}</p>
      <p><strong>Technician:</strong> {proof.technicianName || task.assignedTechnicianName || '-'}</p>
      <p><strong>Submitted:</strong> {formatDateTime(proof.submittedAt || task.proofSubmittedAt)}</p>
      <div className="task-proof-grid">
        <div>
          <strong>Before Photo</strong>
          <ProofPhoto photo={beforePhotos[0]} />
        </div>
        <div>
          <strong>After Photo</strong>
          <ProofPhoto photo={afterPhotos[0]} />
        </div>
      </div>
      {proof.notes ? <p><strong>Proof Notes:</strong> {proof.notes}</p> : null}
    </div>
  );
};

const TaskDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState('');

  useEffect(() => {
    apiRequest(`/tasks/${taskId}`)
      .then((response) => {
        setTask(response.task);
        const serials = response.task?.registrationProgress?.requiredSerials || response.task?.serialNumbers || [];
        setSelectedSerial(String(serials[0] || ''));
      })
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [taskId]);

  const checkInWithGps = () => {
    if (!navigator.geolocation) {
      alert('This browser does not provide GPS location. Use the technician mobile app to check in.');
      return;
    }
    setActionBusy(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await apiRequest(`/tasks/${task.id}/check-in`, {
            method: 'PATCH',
            body: JSON.stringify({ coordinates: { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy } }),
          });
          setTask(response.task);
        } catch (error) {
          alert(error.message || 'Unable to check in at this location.');
        } finally {
          setActionBusy(false);
        }
      },
      (error) => {
        setActionBusy(false);
        alert(error.message || 'Location permission is required to check in.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const serials = task?.registrationProgress?.requiredSerials || task?.serialNumbers || [];
  const registrations = task?.ampRegistrations || {};
  const isInstallation = serials.length > 0;
  const hasCheckedIn = Boolean(task?.checkIn?.checkedInAt);

  return (
    <TechLayout title="Task Details" subtitle={`Task #${taskId}`}>
      {loading ? (
        <div className="tech-card">Loading task details...</div>
      ) : !task ? (
        <div className="tech-card">
          <h3>Task not found</h3>
          <button type="button" onClick={() => navigate('/tech/tasks')}>Back to Tasks</button>
        </div>
      ) : (
      <div className="tech-grid-2">
        <div className="tech-card">
          <h3>{task.title}</h3>
          <p><strong>Customer:</strong> {task.customer}</p>
          <p><strong>Address:</strong> {task.address}</p>
          <p><strong>Priority:</strong> {task.priority}</p>
          <p><strong>Status:</strong> {task.status}</p>
          <p><strong>Assigned Technician:</strong> {task.assignedTechnicianName || 'Unassigned'}</p>
          <p><strong>Notes:</strong> {task.notes || '-'}</p>
          {serials.length > 0 ? (
            <div className="task-registration-checklist">
              <strong>AC unit registration</strong>
              <p>
                {task.registrationProgress?.totalRegistered || 0} of {task.registrationProgress?.totalRequired || 0} units registered
                {task.registrationProgress?.totalHeld ? ` / ${task.registrationProgress.totalHeld} held` : ''}
              </p>
              <label className="task-registration-select-label">
                Assigned QR serial
                <select value={selectedSerial} onChange={(event) => setSelectedSerial(event.target.value)}>
                  {serials.map((serial) => <option key={serial} value={serial}>{serial} — {registrations[serial]?.status || 'registration required'}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => navigate(`/tech/field-registration?serial=${encodeURIComponent(selectedSerial)}`)} disabled={!selectedSerial}>Register selected unit</button>
            </div>
          ) : null}
          {task.status === 'pending' ? (
            <p className="task-proof-empty">Awaiting Admin activation. This work order cannot begin until the branch dispatches it.</p>
          ) : null}
          {task.status === 'in-progress' && !hasCheckedIn ? (
            <button type="button" onClick={checkInWithGps} disabled={actionBusy}>{actionBusy ? 'Checking in...' : 'Check in with GPS'}</button>
          ) : null}
          {hasCheckedIn ? (
            <p><strong>GPS check-in:</strong> {formatDateTime(task.checkIn.checkedInAt)}</p>
          ) : null}
          {isInstallation && hasCheckedIn ? <button type="button" onClick={() => navigate(`/tech/field-registration${selectedSerial ? `?serial=${encodeURIComponent(selectedSerial)}` : ''}`)}>Open AMP Registration</button> : null}
          {!isInstallation ? <p className="task-proof-empty">Maintenance and warranty service reports are completed in the Cold Air mobile app, where field evidence and the service type are captured.</p> : null}
          <button type="button" onClick={() => navigate('/tech/tasks')}>Back to Tasks</button>
        </div>
        <TaskProofPanel proof={task.proof || {}} task={task} />
        {isInstallation && hasCheckedIn && !['completed', 'cancelled'].includes(task.status) ? <UpdateTaskStatus task={task} onTaskChange={(nextTask) => setTask(nextTask)} /> : null}
      </div>
      )}
    </TechLayout>
  );
};

export default TaskDetails;
