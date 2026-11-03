import React, { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';

const readable = (value) => String(value || 'submitted').replace(/_/g, ' ');

const WarrantyClaims = ({ claims = [], busyClaimId, onReview }) => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [components, setComponents] = useState({});
  const activeClaims = claims.filter((claim) => ['submitted', 'under_review'].includes(String(claim.status || '').toLowerCase()));

  return (
    <section className="maintenance-queue-panel" aria-label={t("In Warranty Analytics")}>
      <div className="maintenance-panel-heading">
        <div><p className="maintenance-eyebrow">{t("In Warranty Analytics")}</p><h2>{t("Claims awaiting review")}</h2></div>
        <span className="maintenance-task-chip">{activeClaims.length} {t("open")}</span>
      </div>
      {!activeClaims.length ? <div className="maintenance-empty"><strong>{t("No warranty claims awaiting review")}</strong><span>{t("New customer claims will appear here.")}</span></div> : (
        <div className="maintenance-request-list">
          {activeClaims.map((claim) => {
            const busy = String(busyClaimId) === `${claim.unitId}:${claim.claimId}`;
            const componentKey = `${claim.unitId}:${claim.claimId}`;
            const coverage = claim.componentCoverage || [];
            return <div className="maintenance-request-item" key={`${claim.unitId}:${claim.claimId}`}>
              <span className="maintenance-request-main">
                <strong>{claim.unitName}</strong>
                <span>{claim.serialNumber} · {claim.branch}</span>
                <small>{claim.issue}</small>
                {claim.coverageSummary ? <small>{claim.coverageSummary}</small> : null}
                {coverage.length > 0 ? <label>{t("Component covered")}
                  <select aria-label={`${t('Component covered for')} ${claim.claimId}`} value={components[componentKey] || ''} onChange={(event) => setComponents((previous) => ({ ...previous, [componentKey]: event.target.value }))} disabled={busy}>
                    <option value="">{t("Select component")}</option>
                    {coverage.map((item) => <option key={item.component} value={item.component.toLowerCase()} disabled={item.status !== 'active'}>{t(item.component)} — {t(readable(item.status))}</option>)}
                  </select>
                </label> : null}
              </span>
              <span className="maintenance-request-meta">
                <span className={`maintenance-status maintenance-status-${readable(claim.status).replace(/\s+/g, '-')}`}>{t(readable(claim.status))}</span>
                <div className="maintenance-action-row">
                  {claim.status === 'submitted' ? <button type="button" className="maintenance-button maintenance-button--secondary" disabled={busy} onClick={() => onReview(claim, 'under_review')}>{t("Review")}</button> : null}
                  <button type="button" className="maintenance-button" disabled={busy || (coverage.length > 0 && !coverage.some((item) => item.component.toLowerCase() === components[componentKey] && item.status === 'active'))} onClick={() => onReview(claim, 'approved', components[componentKey] || '')}>{t(busy ? 'Saving…' : 'Approve repair')}</button>
                  <button type="button" className="maintenance-filter-reset" disabled={busy} onClick={() => onReview(claim, 'rejected')}>{t("Reject")}</button>
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
