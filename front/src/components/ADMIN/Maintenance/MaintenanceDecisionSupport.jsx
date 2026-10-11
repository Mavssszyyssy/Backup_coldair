import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';

const List = ({ title, values, render }) => Array.isArray(values) && values.length ? <div className="maintenance-ai-group"><strong>{title}</strong><ul>{values.map((value, index) => <li key={`${title}-${index}`}>{render ? render(value) : value}</li>)}</ul></div> : null;
const TextRow = ({ label, value }) => value ? <p className="maintenance-ai-row"><strong>{label}</strong><span>{value}</span></p> : null;
const Evidence = ({ assessment }) => assessment?.evidence?.length ? <details className="maintenance-ai-evidence"><summary>Recorded evidence used</summary><ul>{assessment.evidence.map((entry) => <li key={entry.id}><strong>{entry.label}:</strong> {entry.text}</li>)}</ul></details> : null;

function AssessmentCard({ title, value, available, buttonLabel, busy, onGenerate, children }) {
  return <section className="maintenance-ai-card">
    <div className="maintenance-ai-heading"><div><h4>{title}</h4><small>AI-assisted decision support · technician verification required</small></div>
      {available ? <button type="button" className="maintenance-button maintenance-button--secondary" onClick={onGenerate} disabled={busy}>{busy ? 'Generating…' : buttonLabel}</button> : null}
    </div>
    {value?.status === 'completed' ? <><p className="maintenance-ai-meta">Generated {new Date(value.generatedAt).toLocaleString()} · Technician review: {value.review?.decision || 'pending'}</p>{children}<Evidence assessment={value} /></>
      : <p className="maintenance-muted">{value?.error || (available ? 'No assessment generated yet.' : 'Available when the maintenance record reaches this stage.')}</p>}
  </section>;
}

export default function MaintenanceDecisionSupport({ request, task, onPreUpdated }) {
  const [pre, setPre] = useState(request?.aiPreAssessment || null);
  const [post, setPost] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setPre(request?.aiPreAssessment || null); setPost(null); setError(''); }, [request?.id, request?.aiPreAssessment]);
  useEffect(() => {
    let active = true;
    if (task?.id && task.status === 'completed') apiRequest(`/amp/tasks/${encodeURIComponent(task.id)}/decision-support`)
      .then((result) => { if (active) setPost(result.futurePrediction || null); })
      .catch(() => { if (active) setError('Could not load the saved future-issue assessment.'); });
    return () => { active = false; };
  }, [task?.id, task?.status]);

  const generate = async (phase) => {
    setBusy(phase); setError('');
    try {
      const path = phase === 'pre' ? `/amp/requests/${encodeURIComponent(request.id)}/pre-assessment` : `/amp/tasks/${encodeURIComponent(task.id)}/future-prediction`;
      const result = await apiRequest(path, { method: 'POST' });
      if (phase === 'pre') { setPre(result.preAssessment); onPreUpdated?.(result.preAssessment); }
      else setPost(result.futurePrediction);
    } catch (failure) {
      setError(failure?.message || 'AI assessment is unavailable. Existing records were not changed.');
      if (phase === 'post' && task?.id) {
        try { const saved = await apiRequest(`/amp/tasks/${encodeURIComponent(task.id)}/decision-support`); setPost(saved.futurePrediction || null); } catch { /* Preserve the original error. */ }
      }
    } finally { setBusy(''); }
  };

  const preResult = pre?.assessment;
  const postResult = post?.assessment;
  return <div className="maintenance-detail-section"><h3>AI maintenance assistance</h3>
    <p>Suggestions use saved records, do not confirm a fault, and never reserve or deduct stock.</p>
    {error ? <p className="maintenance-message maintenance-message--error" role="alert">{error}</p> : null}
    <AssessmentCard title="Before maintenance" value={pre} available={!['Completed', 'Cancelled'].includes(request?.status)} buttonLabel={pre ? 'Regenerate AI assessment' : 'Generate AI assessment'} busy={busy === 'pre'} onGenerate={() => generate('pre')}>
      <TextRow label="Original reported issue" value={pre?.evidence?.find(entry => entry.id === 'reported_issue')?.text} />
      <TextRow label="English interpretation" value={preResult?.english_interpretation} />
      <TextRow label="Possible problem" value={preResult?.possible_problem} />
      <TextRow label="Reason" value={preResult?.reason_for_recommendation} />
      <TextRow label="Priority / confidence" value={`${preResult?.priority || ''} · ${preResult?.confidence || ''}`} />
      <List title="Parts to bring for inspection" values={preResult?.parts_to_bring} render={part => <>{part.name} — {part.reason}</>} />
      <List title="Replace only after diagnosis" values={preResult?.replace_only_after_diagnosis} render={part => <>{part.name} — {part.only_if}</>} />
      <List title="Tools and materials" values={preResult?.tools_and_materials} render={tool => <>{tool.name} — {tool.reason}</>} />
      <List title="Diagnostic steps" values={preResult?.diagnostic_actions} />
      <List title="Safety flags" values={preResult?.safety_flags} />
      <List title="Missing evidence" values={preResult?.missing_evidence} />
    </AssessmentCard>
    <AssessmentCard title="After maintenance" value={post} available={task?.status === 'completed'} buttonLabel={post ? 'Regenerate future-issue assessment' : 'Generate future-issue assessment'} busy={busy === 'post'} onGenerate={() => generate('post')}>
      <TextRow label="Original technician findings" value={post?.evidence?.find(entry => entry.id === 'current_findings')?.text} />
      <TextRow label="English interpretation" value={postResult?.english_interpretation} />
      <TextRow label="Possible future issue" value={postResult?.possible_future_issue} />
      <TextRow label="Component to monitor" value={postResult?.component_to_monitor} />
      <TextRow label="Risk / confidence" value={`${postResult?.risk_level || ''} · ${postResult?.confidence || ''}`} />
      <List title="Supporting findings" values={postResult?.supporting_findings} />
      <List title="Preventive actions" values={postResult?.preventive_actions} />
      <TextRow label="Follow-up" value={postResult?.follow_up} />
      <List title="Safety flags" values={postResult?.safety_flags} />
      <List title="Missing evidence" values={postResult?.missing_evidence} />
    </AssessmentCard>
  </div>;
}
