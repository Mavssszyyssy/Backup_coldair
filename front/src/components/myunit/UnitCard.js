import { useState } from "react";
import DynamicServiceSticker from "./DynamicServiceSticker";
import UnitKebabMenu from "./UnitKebabMenu";
import UnitProductVisual from "./UnitProductVisual";
import { formatUnitHorsepower } from "../../domain/myunit/unitDisplay";
import { useUser } from "../../context/UserContext";
import { translateText } from "../../utils/customerI18n";

function UnitCard({
  unit,
  onClick,
  onViewHistory,
  onWarrantyStatus,
  position,
  isNewest = false,
}) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
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
          <span>{t("AC Unit")} {position}</span>
          {isNewest ? <span className="unit-newest-badge">{t("Newest purchase")}</span> : null}
        </div>
        <div className="unit-brand-model">{unit.unitName || unit.brand || t("Installed AC Unit")}</div>
        <div className="unit-model-code">{unit.productSku || unit.model || t("Model not recorded")}</div>
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
            <span className="info-label">{t("Horsepower")}</span>
            <span className="info-value">{formatUnitHorsepower(unit)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("Status")}</span>
            <span className={`unit-status ${getStatusClass()}`}>
              {t(unit.status)}
            </span>
          </div>
          {expanded ? <div className="unit-more-details" aria-label={t("Additional AC unit details")}>
            <div className="info-row"><span className="info-label">{t("Serial Number")}</span><span className="info-value">{unit.serialNumber || t("Not recorded")}</span></div>
            <div className="info-row"><span className="info-label">{t("Installation Date")}</span><span className="info-value">{unit.installationDate || t("Not recorded")}</span></div>
            <div className="info-row"><span className="info-label">{t("Order Number")}</span><span className="info-value">{unit.orderCode || t("Not recorded")}</span></div>
            <div className="info-row"><span className="info-label">{t("Ordered On")}</span><span className="info-value">{unit.purchaseDate || t("Not recorded")}</span></div>
            <div className="info-row"><span className="info-label">{t("Responsible Branch")}</span><span className="info-value">{unit.serviceBranch || t("Not recorded")}</span></div>
            <div className="info-row"><span className="info-label">{t("Installed At")}</span><span className="info-value">{[unit.placementArea, unit.installationEnvironment].filter(Boolean).join(", ") || t("Not recorded")}</span></div>
            <div className="info-row"><span className="info-label">{t("Warranty")}</span><span className="info-value">{t(warrantyLabel)}</span></div>
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
          {t(expanded ? "View Less" : "View More")}
        </button>
        <button
          type="button"
          className="unit-btn history-btn"
          onClick={(e) => {
            e.stopPropagation();
            onViewHistory(unit);
          }}
        >
          {t("Service History")}
        </button>
      </div>
    </div>
  );
}

export default UnitCard;
