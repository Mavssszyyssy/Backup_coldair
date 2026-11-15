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
        </div>
      </div>
      <div className="unit-footer">
        <button
          type="button"
          className="unit-btn history-btn"
          aria-haspopup="dialog"
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
