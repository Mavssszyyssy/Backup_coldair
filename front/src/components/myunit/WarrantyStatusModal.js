import { getWarrantyWarnings } from '../../domain/myunit/warrantyWarnings';

function WarrantyStatusModal({ unit, onClose }) {
  const warnings = getWarrantyWarnings(unit);
  const warranty = unit?.warranty || {};
  const status = unit?.warrantyStatus || warranty.status || "pending_activation";
  const valid = status === "active";
  const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "Not recorded";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="unit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Warranty — {unit.brand} {unit.model}</h3>
          <button type="button" className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="info-row">
            <span className="info-label">Validity</span>
            <span className="info-value">{valid ? "Active" : status.replace(/_/g, " ")}</span>
          </div>
          <div className="info-row"><span className="info-label">Warranty type</span><span className="info-value">{warranty.warrantyType || "Standard manufacturer warranty"}</span></div>
          <div className="info-row"><span className="info-label">Coverage period</span><span className="info-value">{formatDate(warranty.startDate)} – {formatDate(warranty.expirationDate)}</span></div>
          {warnings.length > 0 && (
            <div className="warranty-warnings" role="alert">
              {warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Coverage</span>
            <span className="info-value">{warranty.coveredComponents?.join(", ") || unit.warrantyTerms || "Coverage details pending."}</span>
          </div>
          {!!warranty.coverageLimitations?.length && <div className="info-row"><span className="info-label">Limitations</span><span className="info-value">{warranty.coverageLimitations.join(" ")}</span></div>}
          <div className="info-row"><span className="info-label">Claims</span><span className="info-value">{warranty.claims?.length || 0} recorded</span></div>
          {warranty.claims?.map((claim) => (
            <div className="info-row" key={claim.claimId}>
              <span className="info-label">{claim.claimId}</span>
              <span className="info-value">{claim.status?.replace(/_/g, " ")} — {claim.issue}</span>
            </div>
          ))}
          {warranty.serviceRecords?.map((record, index) => (
            <div className="info-row" key={`${record.serviceDate}-${index}`}>
              <span className="info-label">Warranty service</span>
              <span className="info-value">{record.visitType} — {record.summary}</span>
            </div>
          ))}
          <p className="warranty-footnote">
            Warranty claims are reviewed by the service team. Approved claims create a linked service record and remain visible to AMP.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="confirm-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default WarrantyStatusModal;
