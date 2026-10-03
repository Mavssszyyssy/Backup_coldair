import { serviceLabel } from '../../domain/myunit/serviceHistoryDisplay';

function ServiceHistoryFilters({ sortBy, onSortBy, filterType, onFilterType, serviceTypes }) {
  return (
    <div className="service-history-filters">
      <div className="form-group service-history-filter">
        <label htmlFor="sh-sort">Sort by date</label>
        <select id="sh-sort" value={sortBy} onChange={(e) => onSortBy(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <div className="form-group service-history-filter">
        <label htmlFor="sh-type">Filter by type</label>
        <select id="sh-type" value={filterType} onChange={(e) => onFilterType(e.target.value)}>
          <option value="all">All types</option>
          {serviceTypes.map((t) => (
            <option key={t} value={t}>
              {serviceLabel(t)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ServiceHistoryFilters;
