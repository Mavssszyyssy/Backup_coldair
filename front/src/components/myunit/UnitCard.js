import { useState } from "react";
import DynamicServiceSticker from "./DynamicServiceSticker";
import UnitKebabMenu from "./UnitKebabMenu";
import UnitProductVisual from "./UnitProductVisual";
import { formatUnitHorsepower } from "../../domain/myunit/unitDisplay";

function UnitCard({
  unit,
  onClick,
  onViewHistory,
  onWarrantyStatus,
  position,
  isNewest = false,
}) {
  const [expanded, setExpanded] = useState(false);
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
        <div className="unit-identity-badges">
          <span>AC Unit {position}</span>
          {isNewest ? <span className="unit-newest-badge">Newest purchase</span> : null}
        </div>
        <div className="unit-brand-model">{unit.unitName || unit.brand || "Installed AC Unit"}</div>
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
            <span className="info-label">Horsepower</span>
            <span className="info-value">{formatUnitHorsepower(unit)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Status</span>
            <span className={`unit-status ${getStatusClass()}`}>
              {unit.status}
            </span>
          </div>
          {expanded ? <div className="unit-more-details" aria-label="Additional AC unit details">
            <div className="info-row"><span className="info-label">Serial Number</span><span className="info-value">{unit.serialNumber || "Not recorded"}</span></div>
            <div className="info-row"><span className="info-label">Installation Date</span><span className="info-value">{unit.installationDate || "Not recorded"}</span></div>
            <div className="info-row"><span className="info-label">Order Number</span><span className="info-value">{unit.orderCode || "Not recorded"}</span></div>
            <div className="info-row"><span className="info-label">Ordered On</span><span className="info-value">{unit.purchaseDate || "Not recorded"}</span></div>
            <div className="info-row"><span className="info-label">Responsible Branch</span><span className="info-value">{unit.serviceBranch || "Not recorded"}</span></div>
            <div className="info-row"><span className="info-label">Installed At</span><span className="info-value">{[unit.placementArea, unit.installationEnvironment].filter(Boolean).join(", ") || "Not recorded"}</span></div>
            <div className="info-row"><span className="info-label">Warranty</span><span className="info-value">{warrantyLabel}</span></div>
          </div> : null}
        </div>
        {expanded ? <DynamicServiceSticker unit={unit} /> : null}
      </div>
      <div className="unit-footer">
        <button
          type="button"
          className="unit-btn view-more-btn"
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
        >
          {expanded ? "View Less" : "View More"}
        </button>
        <button
          type="button"
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
