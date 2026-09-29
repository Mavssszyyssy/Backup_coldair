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
    <div className="modal-overlay" onClick={onClose}>
      <div className="unit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Complete AC unit history — {unit.brand} {unit.model}</h3>
          <button type="button" className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <ServiceHistoryFilters
            sortBy={sortBy}
            onSortBy={setSortBy}
            filterType={filterType}
            onFilterType={setFilterType}
            serviceTypes={serviceTypes}
          />
          {filteredSorted.length > 0 ? (
            <>
              <HistoryPagination
                currentPage={historyPage}
                totalPages={historyPages}
                onPageChange={changeHistoryPage}
              />
              <div ref={historyListRef} className="history-list">
                {visibleHistory.map((service) => (
                  <div key={service.id || `${service.date}-${service.serviceType}`} className="history-item">
                    <div className="history-date">{serviceDateLabel(service.date)}</div>
                    <div className="history-service">{serviceLabel(service.serviceType)}</div>
                    {service.technicianStatus ? <div className="history-details">Technician status: {String(service.technicianStatus).replaceAll('_', ' ')}</div> : null}
                    <div className="history-details">{serviceDetails(service)}</div>
                    <ServiceFollowUp interpretation={service.aiInterpretation} />
                    {servicePriceLabel(service) ? <div className="history-price">{servicePriceLabel(service)}</div> : null}
                    {service.evidence?.eligible === false ? <div className="history-details">{service.evidence.reason}</div> : null}
                    {service.technician && (
                      <div className="history-details">Technician: {service.technician}</div>
                    )}
                  </div>
                ))}
              </div>
              <HistoryPagination
                currentPage={historyPage}
                totalPages={historyPages}
                onPageChange={changeHistoryPage}
              />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              No service history matches these filters.
            </div>
          )}
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

export default ServiceHistory;
