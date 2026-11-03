import { serviceLabel } from '../../domain/myunit/serviceHistoryDisplay';
import { useUser } from '../../context/UserContext';
import { translateText } from '../../utils/customerI18n';

function ServiceHistoryFilters({ sortBy, onSortBy, filterType, onFilterType, serviceTypes }) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  return (
    <div className="service-history-filters">
      <div className="form-group service-history-filter">
        <label htmlFor="sh-sort">{t("Sort by date")}</label>
        <select id="sh-sort" value={sortBy} onChange={(e) => onSortBy(e.target.value)}>
          <option value="newest">{t("Newest first")}</option>
          <option value="oldest">{t("Oldest first")}</option>
        </select>
      </div>
      <div className="form-group service-history-filter">
        <label htmlFor="sh-type">{t("Filter by type")}</label>
        <select id="sh-type" value={filterType} onChange={(e) => onFilterType(e.target.value)}>
          <option value="all">{t("All types")}</option>
          {serviceTypes.map((type) => (
            <option key={type} value={type}>
              {t(serviceLabel(type))}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ServiceHistoryFilters;
