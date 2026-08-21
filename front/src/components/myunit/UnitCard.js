import DynamicServiceSticker from "./DynamicServiceSticker";
import UnitKebabMenu from "./UnitKebabMenu";

// import icons from '../common/icons';
const icons = {}; // BOUTIQUE MIGRATION STUB

function UnitCard({
  unit,
  onClick,
  onViewHistory,
  onWarrantyStatus,
  onRegisterQr,
}) {
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
    <div className="unit-card" onClick={() => onClick(unit)}>
      <div className="unit-header">
        <div className="unit-brand-model">
          {unit.brand} {unit.model}
        </div>
        <div className="unit-header-actions">
          <UnitKebabMenu
            unit={unit}
            onViewHistory={onViewHistory}
            onWarrantyStatus={onWarrantyStatus}
            onRegisterQr={onRegisterQr}
          />
          <div className="unit-icon">
            <img
              src={icons.temperatureFrigid}
              alt=""
              className="inline-icon inline-icon--lg"
            />
          </div>
        </div>
      </div>
      <div className="unit-body">
        <div className="unit-info">
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
          <div className="info-row">
            <span className="info-label">Warranty</span>
            <span className="info-value">{String(unit.warrantyStatus || unit.warranty?.status || "pending activation").replace(/_/g, " ")}</span>
          </div>
          {unit.ampereNextServiceLabel && (
            <div className="info-row">
              <span className="info-label">AMPERE</span>
              <span className="info-value">{unit.ampereNextServiceLabel}</span>
            </div>
          )}
        </div>
        <DynamicServiceSticker unit={unit} />
      </div>
      <div className="unit-footer">
        <button
          className="unit-btn history-btn"
          onClick={(e) => {
            e.stopPropagation();
            onViewHistory(unit);
          }}
        >
          Service History
        </button>
      </div>
    </div>
  );
}

export default UnitCard;
