import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';
import './styles.css';

const UpdateTaskStatus = ({ task, onTaskChange }) => {
  const [status, setStatus] = useState(task?.status || 'pending');
  const [report, setReport] = useState({
    beforeCondition: '',
    findings: '',
    resolution: '',
    afterCondition: '',
    beforePhotoUri: '',
    afterPhotoUri: '',
    customerSignatureName: '',
    customerSignature: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(task?.status || 'pending');
    setReport({
      beforeCondition: task?.beforeCondition || '',
      findings: task?.findings || '',
      resolution: task?.resolution || '',
      afterCondition: task?.afterCondition || '',
      beforePhotoUri: task?.beforePhotoUri || task?.proof?.beforePhotos?.[0]?.uri || '',
      afterPhotoUri: task?.afterPhotoUri || task?.proof?.afterPhotos?.[0]?.uri || '',
      customerSignatureName: task?.customerSignatureName || task?.proof?.customerSignature?.name || '',
      customerSignature: task?.customerSignature || task?.proof?.customerSignature?.signature || '',
      notes: task?.notes || task?.proof?.notes || '',
    });
  }, [task]);

  const setField = (field, value) => {
    setReport((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    if (!task?.id) return;
    const proofSubmittedAt = new Date().toISOString();
    const isCompleting = status === 'completed';
    if (isCompleting && !report.customerSignatureName.trim()) {
      alert('Enter the customer name/sign-off before completing this task.');
      return;
    }

    setSaving(true);
    apiRequest(`/tasks/${task.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        ...report,
        proofSubmittedAt,
        proof: isCompleting
          ? {
              beforePhotos: report.beforePhotoUri.trim()
                ? [{ uri: report.beforePhotoUri.trim(), label: 'Before service', capturedAt: proofSubmittedAt }]
                : [],
              afterPhotos: report.afterPhotoUri.trim()
                ? [{ uri: report.afterPhotoUri.trim(), label: 'After service', capturedAt: proofSubmittedAt }]
                : [],
              customerSignature: {
                name: report.customerSignatureName.trim(),
                signature: report.customerSignature.trim() || report.customerSignatureName.trim(),
                signedAt: proofSubmittedAt,
              },
              submittedAt: proofSubmittedAt,
              notes: report.notes.trim(),
            }
          : task?.proof || {},
      })
    })
      .then((response) => {
        onTaskChange(response.task);
        alert('Task status updated.');
      })
      .catch((error) => {
        alert(error.message || 'Unable to update task status.');
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="tech-form">
      <h3>Update Task Status</h3>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="on-hold">On Hold</option>
        <option value="completed">Completed</option>
      </select>
      {status === 'completed' ? (
        <div className="tech-proof-form">
          <label>
            Before Condition
            <textarea value={report.beforeCondition} onChange={(e) => setField('beforeCondition', e.target.value)} />
          </label>
          <label>
            Findings
            <textarea value={report.findings} onChange={(e) => setField('findings', e.target.value)} />
          </label>
          <label>
            Resolution
            <textarea value={report.resolution} onChange={(e) => setField('resolution', e.target.value)} />
          </label>
          <label>
            After Condition
            <textarea value={report.afterCondition} onChange={(e) => setField('afterCondition', e.target.value)} />
          </label>
          <label>
            Before Photo URL or Data URL
            <input value={report.beforePhotoUri} onChange={(e) => setField('beforePhotoUri', e.target.value)} />
          </label>
          <label>
            After Photo URL or Data URL
            <input value={report.afterPhotoUri} onChange={(e) => setField('afterPhotoUri', e.target.value)} />
          </label>
          <label>
            Customer Name
            <input value={report.customerSignatureName} onChange={(e) => setField('customerSignatureName', e.target.value)} />
          </label>
          <label>
            Customer Signature
            <input value={report.customerSignature} onChange={(e) => setField('customerSignature', e.target.value)} />
          </label>
          <label>
            Notes
            <textarea value={report.notes} onChange={(e) => setField('notes', e.target.value)} />
          </label>
        </div>
      ) : null}
      <button type="button" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Status'}
      </button>
    </div>
  );
};

export default UpdateTaskStatus;
