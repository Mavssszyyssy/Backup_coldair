import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TechLayout from '../Common/TechLayout';
import UpdateTaskStatus from './UpdateTaskStatus';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
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
  const { user } = useUser();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    apiRequest(`/tasks/${taskId}`)
      .then((response) => setTask(response.task))
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleAccept = async () => {
    if (!task?.id) return;
    setAccepting(true);
    try {
      const response = await apiRequest(`/tasks/${task.id}/accept`, { method: 'PATCH' });
      setTask(response.task);
      alert('Task accepted. You can now begin work on it.');
    } catch (error) {
      alert(error.message || 'Unable to accept task.');
    } finally {
      setAccepting(false);
    }
  };

  const serials = task?.registrationProgress?.requiredSerials || [];
  const registrations = task?.ampRegistrations || {};

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
              <div className="task-registration-list">
                {serials.map((serial) => {
                  const registration = registrations[serial];
                  return (
                    <button
                      type="button"
                      key={serial}
                      className={`task-registration-item ${registration?.status || 'pending'}`}
                      onClick={() => navigate(`/tech/field-registration?serial=${encodeURIComponent(serial)}`)}
                    >
                      <span>{serial}</span>
                      <strong>{registration?.status || 'pending'}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {user?.role === 'technician' && task.status === 'pending' && !task.assignedTechnicianId ? (
            <button type="button" onClick={handleAccept} disabled={accepting}>
              {accepting ? 'Accepting...' : 'Accept Task'}
            </button>
          ) : null}
          <button type="button" onClick={() => navigate(`/tech/field-registration${serials[0] ? `?serial=${encodeURIComponent(serials[0])}` : ''}`)}>
            Open AMP Registration
          </button>
          <button type="button" onClick={() => navigate('/tech/tasks')}>Back to Tasks</button>
        </div>
        <TaskProofPanel proof={task.proof || {}} task={task} />
        <UpdateTaskStatus task={task} onTaskChange={(nextTask) => setTask(nextTask)} />
      </div>
      )}
    </TechLayout>
  );
};

export default TaskDetails;
