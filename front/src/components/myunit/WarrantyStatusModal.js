import { getWarrantyWarnings } from '../../domain/myunit/warrantyWarnings';

function WarrantyStatusModal({ unit, onClose }) {
  const warnings = getWarrantyWarnings(unit);
  const warranty = unit?.warranty || {};
  const status = unit?.warrantyStatus || warranty.status || "pending_activation";
  const valid = status === "active";
  const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "Not recorded";
  const formatLabel = (value) => {
    const label = String(value || "Not recorded").replace(/_/g, " ");
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
  };
  const modelName = unit?.model || unit?.productSku || "AC unit";
  const unitName = unit?.brand && !modelName.toLowerCase().startsWith(unit.brand.toLowerCase())
    ? `${unit.brand} ${modelName}`
    : modelName;
  const claims = warranty.claims || [];
  const serviceRecords = warranty.serviceRecords || [];

  return (
    <div className="modal-overlay warranty-overlay" onClick={onClose}>
      <section
        className="unit-modal warranty-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warranty-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header warranty-dialog-header">
          <div>
            <span className="warranty-eyebrow">Registered AC unit</span>
            <h3 id="warranty-dialog-title">Warranty details</h3>
            <p>{unitName}</p>
          </div>
          <button
            type="button"
            className="close-modal warranty-close"
            onClick={onClose}
            aria-label="Close warranty details"
          >
            ×
          </button>
        </header>
        <div className="modal-body warranty-dialog-body">
          <section className="warranty-summary" aria-label="Warranty summary">
            <div>
              <span>Coverage status</span>
              <strong className={`warranty-status ${valid ? "warranty-status-active" : "warranty-status-pending"}`}>
                {valid ? "Active" : formatLabel(status)}
              </strong>
            </div>
            <div>
              <span>Warranty type</span>
              <strong>{warranty.warrantyType || "Standard manufacturer warranty"}</strong>
            </div>
            <div>
              <span>Coverage start</span>
              <strong>{formatDate(warranty.startDate)}</strong>
            </div>
          </section>

          <p className="warranty-coverage-summary">
            {warranty.coverageSummary || "Shop offer: 1 year parts, 5 years compressor. Confirm this unit’s coverage with the branch."}
          </p>

          {!!warranty.componentCoverage?.length && (
            <section className="warranty-section" aria-labelledby="warranty-periods-title">
              <h4 id="warranty-periods-title">Coverage periods</h4>
              <dl className="warranty-coverage-list">
                {warranty.componentCoverage.map((item) => (
                  <div key={item.component}>
                    <dt>{item.component} coverage</dt>
                    <dd>
                      <strong>{formatDate(item.expirationDate)}</strong>
                      <span>{formatLabel(item.status)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {warnings.length > 0 && (
            <div className="warranty-warnings" role="alert">
              {warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}

          {!!warranty.coverageLimitations?.length && (
            <section className="warranty-section warranty-limitations" aria-labelledby="warranty-limitations-title">
              <h4 id="warranty-limitations-title">Coverage limitations</h4>
              <p>{warranty.coverageLimitations.join(" ")}</p>
            </section>
          )}

          <section className="warranty-section" aria-labelledby="warranty-claims-title">
            <div className="warranty-section-heading">
              <h4 id="warranty-claims-title">Claims</h4>
              <span>{claims.length} recorded</span>
            </div>
            {claims.length > 0 ? (
              <div className="warranty-record-list">
                {claims.map((claim) => (
                  <article key={claim.claimId}>
                    <strong>{claim.claimId}</strong>
                    <p>{formatLabel(claim.status)} — {claim.issue}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="warranty-empty-state">No warranty claims have been recorded for this unit.</p>
            )}
          </section>

          {serviceRecords.length > 0 && (
            <section className="warranty-section" aria-labelledby="warranty-service-title">
              <h4 id="warranty-service-title">Warranty service history</h4>
              <div className="warranty-record-list">
                {serviceRecords.map((record, index) => (
                  <article key={`${record.serviceDate}-${index}`}>
                    <strong>{formatLabel(record.visitType)}</strong>
                    <p>{record.summary}</p>
                    {record.serviceDate && <time dateTime={record.serviceDate}>{formatDate(record.serviceDate)}</time>}
                  </article>
                ))}
              </div>
            </section>
          )}

          <p className="warranty-footnote warranty-help">
            <strong>Need to submit a claim?</strong>
            To submit a claim, open Services in the mobile app and choose Warranty Claim. Our service team reviews your coverage before arranging a repair visit. You can follow the claim and repair updates in the app.
          </p>
        </div>
        <footer className="modal-footer warranty-dialog-footer">
          <button type="button" className="confirm-btn warranty-done" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

export default WarrantyStatusModal;
