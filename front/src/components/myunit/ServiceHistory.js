import { useEffect, useMemo, useRef, useState } from 'react';
import HistoryPagination from './HistoryPagination';
import ServiceHistoryFilters from './ServiceHistoryFilters';
import ServiceFollowUp from './ServiceFollowUp';
import { serviceLabel, serviceDateLabel, serviceDetails, servicePriceLabel } from '../../domain/myunit/serviceHistoryDisplay';

function ServiceHistory({ unit, onClose }) {
  const [sortBy, setSortBy] = useState('newest');
  const [filterType, setFilterType] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const historyListRef = useRef(null);

  const serviceTypes = useMemo(() => {
    const list = unit.unitHistory || unit.serviceHistory || [];
    const types = [...new Set(list.map((s) => s.serviceType).filter(Boolean))];
    return types.sort();
  }, [unit.unitHistory, unit.serviceHistory]);

  const filteredSorted = useMemo(() => {
    let list = [...(unit.unitHistory || unit.serviceHistory || [])];
    if (filterType !== 'all') {
      list = list.filter((s) => s.serviceType === filterType);
    }
    list.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortBy === 'newest' ? db - da : da - db;
    });
    return list;
  }, [unit.unitHistory, unit.serviceHistory, filterType, sortBy]);

  const historyPages = filteredSorted.length;
  const visibleHistory = filteredSorted.slice(historyPage - 1, historyPage);
  const modelName = unit?.model || unit?.productSku || 'AC unit';
  const unitName = unit?.brand && !modelName.toLowerCase().startsWith(unit.brand.toLowerCase())
    ? `${unit.brand} ${modelName}`
    : modelName;

  useEffect(() => {
    setHistoryPage(1);
  }, [filterType, sortBy, unit.id, unit.serialNumber]);

  useEffect(() => {
    setHistoryPage((page) => Math.min(Math.max(page, 1), Math.max(historyPages, 1)));
  }, [historyPages]);

  const changeHistoryPage = (page) => {
    setHistoryPage(page);
    historyListRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="modal-overlay service-history-overlay" onClick={onClose}>
      <section
        className="unit-modal service-history-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-history-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header service-history-header">
          <div>
            <span className="service-history-eyebrow">Complete AC unit history</span>
            <h3 id="service-history-title">Service history</h3>
            <p>{unitName}</p>
          </div>
          <button
            type="button"
            className="close-modal service-history-close"
            onClick={onClose}
            aria-label="Close service history"
          >
            ×
          </button>
        </header>
        <div className="modal-body service-history-body">
          <section className="service-history-toolbar" aria-label="Service history filters">
            <div className="service-history-toolbar-heading">
              <div>
                <h4>Service records</h4>
                <p>Review completed visits and technician findings for this unit.</p>
              </div>
              <span>{filteredSorted.length} {filteredSorted.length === 1 ? 'record' : 'records'}</span>
            </div>
            <ServiceHistoryFilters
              sortBy={sortBy}
              onSortBy={setSortBy}
              filterType={filterType}
              onFilterType={setFilterType}
              serviceTypes={serviceTypes}
            />
          </section>

          {filteredSorted.length > 0 ? (
            <section className="service-history-results" aria-label="Filtered service records">
              <HistoryPagination
                currentPage={historyPage}
                totalPages={historyPages}
                onPageChange={changeHistoryPage}
              />
              <div ref={historyListRef} className="history-list">
                {visibleHistory.map((service) => (
                  <article key={service.id || `${service.date}-${service.serviceType}`} className="history-item service-history-record">
                    <header className="service-history-record-header">
                      <div>
                        <time className="history-date" dateTime={service.date}>{serviceDateLabel(service.date)}</time>
                        <h4 className="history-service">{serviceLabel(service.serviceType)}</h4>
                      </div>
                      {service.technicianStatus ? (
                        <span className="service-history-status">
                          {String(service.technicianStatus).replaceAll('_', ' ')}
                        </span>
                      ) : null}
                    </header>

                    <div className="service-history-record-content">
                      <p className="history-details service-history-description">{serviceDetails(service)}</p>
                      <ServiceFollowUp interpretation={service.aiInterpretation} />
                      {(servicePriceLabel(service) || service.evidence?.eligible === false || service.technician) && (
                        <footer className="service-history-record-meta">
                          {servicePriceLabel(service) ? <strong className="history-price">{servicePriceLabel(service)}</strong> : null}
                          {service.technician && <span>Technician: {service.technician}</span>}
                          {service.evidence?.eligible === false ? <p>{service.evidence.reason}</p> : null}
                        </footer>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="service-history-empty">
              <strong>No matching service records</strong>
              No service history matches these filters.
            </div>
          )}
        </div>
        <footer className="modal-footer service-history-footer">
          <button type="button" className="confirm-btn service-history-done" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

export default ServiceHistory;
