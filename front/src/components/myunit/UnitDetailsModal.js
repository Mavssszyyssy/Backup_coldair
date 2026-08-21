import DynamicServiceSticker from "./DynamicServiceSticker";

// import icons from '../common/icons';
const icons = {}; // BOUTIQUE MIGRATION STUB

function UnitDetailsModal({ unit, onClose, onEdit, onDelete }) {
  const getStatusClass = () => {
    switch (unit.status) {
      case "Good":
        return "status-good";
      case "Needs Service":
        return "status-needs-service";
      case "Critical":
        return "status-critical";
      default:
        return "";
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="unit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Unit Details</h3>
          <button className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ marginBottom: "8px" }}>
              <img
                src={icons.temperatureFrigid}
                alt=""
                style={{ width: 56, height: 56, objectFit: "contain" }}
              />
            </div>
            <h2>
              {unit.brand} {unit.model}
            </h2>
          </div>

          <div className="info-row">
            <span className="info-label">Serial Number</span>
            <span className="info-value">{unit.serialNumber}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Installation Date</span>
            <span className="info-value">{unit.installationDate}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Status</span>
            <span className={`unit-status ${getStatusClass()}`}>
              {unit.status}
            </span>
          </div>
          {unit.ampereNextServiceLabel && (
            <div className="info-row">
              <span className="info-label">Next service (AMPERE)</span>
              <span className="info-value">{unit.ampereNextServiceLabel}</span>
            </div>
          )}
          <DynamicServiceSticker unit={unit} />
          {unit.technicianReportSummary && (
            <div className="info-row">
              <span className="info-label">Latest report</span>
              <span className="info-value">{unit.technicianReportSummary}</span>
            </div>
          )}
          {unit.installEnvironmentNotes && (
            <div className="info-row">
              <span className="info-label">Install environment</span>
              <span className="info-value">{unit.installEnvironmentNotes}</span>
            </div>
          )}
          {unit.notes && (
            <div className="info-row">
              <span className="info-label">Notes</span>
              <span className="info-value">{unit.notes}</span>
            </div>
          )}

          {unit.serviceHistory && unit.serviceHistory.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h4>Service History</h4>
              <div className="history-list">
                {unit.serviceHistory.map((service, idx) => (
                  <div key={idx} className="history-item">
                    <div className="history-date">{service.date}</div>
                    <div className="history-service">{service.serviceType}</div>
                    <div className="history-details">{service.details}</div>
                    <div className="history-price">
                      ₱{service.price.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnitDetailsModal;
