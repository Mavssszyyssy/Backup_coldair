import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';

const List = ({ title, values, render }) => Array.isArray(values) && values.length ? <div className="maintenance-ai-group"><strong>{title}</strong><ul>{values.map((value, index) => <li key={`${title}-${index}`}>{render ? render(value) : value}</li>)}</ul></div> : null;
const TextRow = ({ label, value }) => value ? <p className="maintenance-ai-row"><strong>{label}</strong><span>{value}</span></p> : null;
const Evidence = ({ assessment }) => assessment?.evidence?.length ? <details className="maintenance-ai-evidence"><summary>Recorded evidence used</summary><ul>{assessment.evidence.map((entry) => <li key={entry.id}><strong>{entry.label}:</strong> {entry.text}</li>)}</ul></details> : null;

function AssessmentCard({ title, value, available, buttonLabel, busy, onGenerate, highlights, children }) {
  return <section className="maintenance-ai-card">
    <div className="maintenance-ai-heading"><div><h4>{title}</h4><small>AI-assisted decision support · technician verification required</small></div>
      {available ? <button type="button" className="maintenance-button maintenance-button--secondary" onClick={onGenerate} disabled={busy}>{busy ? 'Generating…' : buttonLabel}</button> : null}
    </div>
    {value?.status === 'completed' ? <><p className="maintenance-ai-meta">Generated {new Date(value.generatedAt).toLocaleString()} · Technician review: {value.review?.decision || 'pending'}</p>{highlights}<details className="maintenance-ai-evidence"><summary>Interpretation and supporting details</summary>{children}<Evidence assessment={value} /></details></>
      : <p className="maintenance-muted">{value?.error || (available ? 'No assessment generated yet.' : 'Available when the maintenance record reaches this stage.')}</p>}
  </section>;
}

export default function MaintenanceDecisionSupport({ request, task, initialPost = null, onPreUpdated, onPostUpdated }) {
  const [pre, setPre] = useState(request?.aiPreAssessment || null);
  const [post, setPost] = useState(initialPost);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setPre(request?.aiPreAssessment || null); setPost(initialPost); setError(''); }, [request?.id, request?.aiPreAssessment, task?.id, initialPost]);
  useEffect(() => {
    let active = true;
    if (task?.id && task.status === 'completed') apiRequest(`/amp/tasks/${encodeURIComponent(task.id)}/decision-support`)
      .then((result) => { if (active) setPost(result.futurePrediction || null); })
      .catch(() => { if (active && !initialPost) setError('Could not load the saved future-issue assessment.'); });
    return () => { active = false; };
  }, [task?.id, task?.status, initialPost]);

  const generate = async (phase) => {
    setBusy(phase); setError('');
    try {
      const path = phase === 'pre' ? `/amp/requests/${encodeURIComponent(request.id)}/pre-assessment` : `/amp/tasks/${encodeURIComponent(task.id)}/future-prediction`;
      const result = await apiRequest(path, { method: 'POST' });
      if (phase === 'pre') { setPre(result.preAssessment); onPreUpdated?.(result.preAssessment); }
      else { setPost(result.futurePrediction); onPostUpdated?.(result.futurePrediction); }
    } catch (failure) {
      setError(failure?.message || 'AI assessment is unavailable. Existing records were not changed.');
      if (phase === 'post' && task?.id) {
        try { const saved = await apiRequest(`/amp/tasks/${encodeURIComponent(task.id)}/decision-support`); setPost(saved.futurePrediction || null); } catch { /* Preserve the original error. */ }
      }
    } finally { setBusy(''); }
  };

  const preResult = pre?.assessment;
  const postResult = post?.assessment;
  return <div className="maintenance-detail-section"><h3>Parts and future-issue assessment</h3>
    <p>AI suggestions use saved records, including Tagalog or Taglish notes. Original wording is preserved. They do not confirm a fault or reserve stock.</p>
    {error ? <p className="maintenance-message maintenance-message--error" role="alert">{error}</p> : null}
    {request ? <AssessmentCard title="Before maintenance · parts to prepare" value={pre} available={Boolean(request.id) && !['Completed', 'Cancelled'].includes(request.status)} buttonLabel={pre ? 'Regenerate AI assessment' : 'Generate AI assessment'} busy={busy === 'pre'} onGenerate={() => generate('pre')} highlights={<>
      <TextRow label="Possible problem" value={preResult?.possible_problem} />
      <List title="Parts to bring for inspection" values={preResult?.parts_to_bring} render={part => <>{part.name} — {part.reason}</>} />
      <List title="Use only if diagnosis confirms it" values={preResult?.replace_only_after_diagnosis} render={part => <>{part.name} — {part.only_if}</>} />
    </>}>
      <TextRow label="Original reported issue" value={pre?.evidence?.find(entry => entry.id === 'reported_issue')?.text} />
      <TextRow label="English interpretation" value={preResult?.english_interpretation} />
      <TextRow label="Reason" value={preResult?.reason_for_recommendation} />
      <TextRow label="Priority / confidence" value={`${preResult?.priority || ''} · ${preResult?.confidence || ''}`} />
      <List title="Tools and materials" values={preResult?.tools_and_materials} render={tool => <>{tool.name} — {tool.reason}</>} />
      <List title="Diagnostic steps" values={preResult?.diagnostic_actions} />
      <List title="Safety flags" values={preResult?.safety_flags} />
      <List title="Missing evidence" values={preResult?.missing_evidence} />
    </AssessmentCard> : null}
    {task ? <AssessmentCard title="After maintenance · what to monitor next" value={post} available={task.status === 'completed'} buttonLabel={post ? 'Regenerate future-issue assessment' : 'Generate future-issue assessment'} busy={busy === 'post'} onGenerate={() => generate('post')} highlights={<>
      <TextRow label="Possible next issue" value={postResult?.possible_future_issue} />
      <TextRow label="Part to monitor" value={postResult?.component_to_monitor} />
      <TextRow label="Risk / confidence" value={postResult ? `${postResult.risk_level} · ${postResult.confidence}` : ''} />
    </>}>
      <TextRow label="Original technician findings" value={post?.evidence?.find(entry => entry.id === 'current_findings')?.text} />
      <TextRow label="English interpretation" value={postResult?.english_interpretation} />
      <List title="Supporting findings" values={postResult?.supporting_findings} />
      <List title="Preventive actions" values={postResult?.preventive_actions} />
      <TextRow label="Follow-up" value={postResult?.follow_up} />
      <List title="Safety flags" values={postResult?.safety_flags} />
      <List title="Missing evidence" values={postResult?.missing_evidence} />
    </AssessmentCard> : null}
  </div>;
}
