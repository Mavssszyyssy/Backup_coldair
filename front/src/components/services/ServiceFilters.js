import icons from '../common/icons';

function ServiceFilters({ categories, selectedCategory, onCategoryChange, onSearch }) {
  return (
    <div className="services-filters">
      <div className="filter-group">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="search-box">
        <img src={icons.globePointer} alt="" className="inline-icon" />
        <input
          maxLength={160}
          type="text"
          placeholder="Search services..."
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    </div>
  );
}

export default ServiceFilters;
