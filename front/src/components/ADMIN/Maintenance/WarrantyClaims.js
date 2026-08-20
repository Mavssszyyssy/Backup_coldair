import React from 'react';

const readable = (value) => String(value || 'submitted').replace(/_/g, ' ');

const WarrantyClaims = ({ claims = [], busyClaimId, onReview }) => {
  const activeClaims = claims.filter((claim) => ['submitted', 'under_review'].includes(String(claim.status || '').toLowerCase()));

  return (
    <section className="maintenance-queue-panel" aria-label="Warranty claims">
      <div className="maintenance-panel-heading">
        <div><p className="maintenance-eyebrow">Warranty management</p><h2>Claims awaiting review</h2></div>
        <span className="maintenance-task-chip">{activeClaims.length} open</span>
      </div>
      {!activeClaims.length ? <div className="maintenance-empty"><strong>No warranty claims awaiting review</strong><span>New customer claims will appear here.</span></div> : (
        <div className="maintenance-request-list">
          {activeClaims.map((claim) => {
            const busy = String(busyClaimId) === `${claim.unitId}:${claim.claimId}`;
            return <div className="maintenance-request-item" key={`${claim.unitId}:${claim.claimId}`}>
              <span className="maintenance-request-main">
                <strong>{claim.unitName}</strong>
                <span>{claim.serialNumber} · {claim.branch}</span>
                <small>{claim.issue}</small>
              </span>
              <span className="maintenance-request-meta">
                <span className={`maintenance-status maintenance-status-${readable(claim.status).replace(/\s+/g, '-')}`}>{readable(claim.status)}</span>
                <div className="maintenance-action-row">
                  {claim.status === 'submitted' ? <button type="button" className="maintenance-button maintenance-button--secondary" disabled={busy} onClick={() => onReview(claim, 'under_review')}>Review</button> : null}
                  <button type="button" className="maintenance-button" disabled={busy} onClick={() => onReview(claim, 'approved')}>{busy ? 'Saving…' : 'Approve repair'}</button>
                  <button type="button" className="maintenance-filter-reset" disabled={busy} onClick={() => onReview(claim, 'rejected')}>Reject</button>
                </div>
              </span>
            </div>;
          })}
        </div>
      )}
    </section>
  );
};

export default WarrantyClaims;
