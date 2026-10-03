import { useEffect, useMemo, useRef, useState } from "react";
import DynamicServiceSticker from "./DynamicServiceSticker";
import HistoryPagination from "./HistoryPagination";
import ServiceFollowUp from "./ServiceFollowUp";
import UnitProductVisual from "./UnitProductVisual";
import { formatUnitHorsepower } from "../../domain/myunit/unitDisplay";
import { serviceLabel, serviceDateLabel, serviceDetails, servicePriceLabel } from '../../domain/myunit/serviceHistoryDisplay';

function UnitDetailsModal({ unit, onClose, onEdit, onDelete }) {
  const [historyPage, setHistoryPage] = useState(1);
  const historySectionRef = useRef(null);
  const history = useMemo(
    () => unit.unitHistory || unit.serviceHistory || [],
    [unit.unitHistory, unit.serviceHistory],
  );
  const historyPages = history.length;
  const visibleHistory = history.slice(historyPage - 1, historyPage);

  useEffect(() => {
    setHistoryPage(1);
  }, [unit.id, unit.serialNumber]);

  useEffect(() => {
    setHistoryPage((page) => Math.min(Math.max(page, 1), Math.max(historyPages, 1)));
  }, [historyPages]);

  const changeHistoryPage = (page) => {
    setHistoryPage(page);
    historySectionRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const getStatusClass = () => {
    switch (unit.status) {
      case "Active":
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
    <div className="modal-overlay unit-details-overlay" onClick={onClose}>
      <section
        className="unit-modal unit-details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-details-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header unit-details-header">
          <div>
            <span className="unit-details-eyebrow">Registered AC unit</span>
            <h3 id="unit-details-title">AC Details</h3>
          </div>
          <button
            type="button"
            className="close-modal unit-details-close"
            onClick={onClose}
            aria-label="Close AC details"
          >
            ×
          </button>
        </header>
        <div className="modal-body unit-details-body">
          <section className="unit-details-summary" aria-label="AC unit overview">
            <div className="unit-details-visual">
              <UnitProductVisual unit={unit} size="modal" />
            </div>

            <div className="unit-details-overview">
              <div className="unit-modal-product unit-details-identity">
                <h2>{unit.brand || "Brand not recorded"}</h2>
                <p>{unit.productSku || unit.model || "Model not recorded"}</p>
              </div>

              <dl className="unit-details-facts">
                <div className="unit-details-fact">
                  <dt>Horsepower</dt>
                  <dd>{formatUnitHorsepower(unit)}</dd>
                </div>
                <div className="unit-details-fact">
                  <dt>Serial Number</dt>
                  <dd>{unit.serialNumber || "Not recorded"}</dd>
                </div>
                <div className="unit-details-fact">
                  <dt>Installation Date</dt>
                  <dd>{unit.installationDate || "Not recorded"}</dd>
                </div>
                <div className="unit-details-fact">
                  <dt>Status</dt>
                  <dd>
                    <span className={`unit-status ${getStatusClass()}`}>
                      {unit.status || "Not recorded"}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <DynamicServiceSticker unit={unit} />

          {(unit.technicianReportSummary || unit.installEnvironmentNotes || unit.notes) && (
            <section className="unit-details-records" aria-labelledby="unit-details-records-title">
              <h4 id="unit-details-records-title">Unit information</h4>
              <dl>
                {unit.technicianReportSummary && (
                  <div>
                    <dt>Installation</dt>
                    <dd>{unit.technicianReportSummary}</dd>
                  </div>
                )}
                {unit.installEnvironmentNotes && (
                  <div>
                    <dt>Installed At</dt>
                    <dd>{unit.installEnvironmentNotes}</dd>
                  </div>
                )}
                {unit.notes && (
                  <div>
                    <dt>Registration</dt>
                    <dd>{unit.notes}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {history.length > 0 && (
            <section ref={historySectionRef} className="unit-history-section">
              <h4>Installation &amp; Service History</h4>
              <HistoryPagination
                currentPage={historyPage}
                totalPages={historyPages}
                onPageChange={changeHistoryPage}
              />
              <div className="history-list">
                {visibleHistory.map((service, idx) => (
                  <div key={service.id || `${service.date}-${service.serviceType}-${historyPage}-${idx}`} className="history-item">
                    <div className="history-date">{serviceDateLabel(service.date)}</div>
                    <div className="history-service">{serviceLabel(service.serviceType)}</div>
                    {service.technicianStatus ? <div className="history-details">Technician status: {String(service.technicianStatus).replaceAll('_', ' ')}</div> : null}
                    <div className="history-details">{serviceDetails(service)}</div>
                    <ServiceFollowUp interpretation={service.aiInterpretation} />
                    {servicePriceLabel(service) ? <div className="history-price">{servicePriceLabel(service)}</div> : null}
                    {service.evidence?.eligible === false ? <div className="history-details">{service.evidence.reason}</div> : null}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <footer className="modal-footer unit-details-footer">
          <button type="button" className="cancel-btn unit-details-done" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

export default UnitDetailsModal;
