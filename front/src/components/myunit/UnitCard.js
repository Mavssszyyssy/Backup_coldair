import DynamicServiceSticker from "./DynamicServiceSticker";
import UnitKebabMenu from "./UnitKebabMenu";
import UnitProductVisual from "./UnitProductVisual";
import { formatUnitHorsepower } from "../../domain/myunit/unitDisplay";

function UnitCard({
  unit,
  onClick,
  onViewHistory,
  onWarrantyStatus,
}) {
  const warrantyLabel = {
    pending_activation: "Activation in progress",
    under_review: "Claim under review",
    approved: "Claim approved",
    rejected: "Claim not approved",
    expired: "Coverage expired",
    void: "Coverage unavailable",
    active: "Active",
  }[String(unit.warrantyStatus || unit.warranty?.status || "pending_activation").toLowerCase()] || "Status unavailable";
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
        <div className="unit-brand-model">{unit.brand}</div>
        <div className="unit-model-code">{unit.productSku || unit.model || "Model not recorded"}</div>
        <div className="unit-header-actions">
          <UnitKebabMenu
            unit={unit}
            onViewHistory={onViewHistory}
            onWarrantyStatus={onWarrantyStatus}
          />
        </div>
      </div>
      <UnitProductVisual unit={unit} />
      <div className="unit-body">
        <div className="unit-info">
          <div className="info-row">
            <span className="info-label">Model</span>
            <span className="info-value">{unit.productSku || unit.model || "Not recorded"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Horsepower</span>
            <span className="info-value">{formatUnitHorsepower(unit)}</span>
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
          <div className="info-row">
            <span className="info-label">Warranty</span>
            <span className="info-value">{warrantyLabel}</span>
          </div>
          {unit.bestServicedByLabel && (
            <div className="info-row">
              <span className="info-label">Recommended Service Date</span>
              <span className="info-value">{unit.bestServicedByLabel}</span>
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
