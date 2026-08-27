import icons from '../common/icons';
import { COMPANY_BRANCHES, COMPANY_CONTACT } from '../../config/company';

function OfficeLocations() {
  const locations = COMPANY_BRANCHES.map((branch, index) => ({
    country: 'Philippines',
    office: branch.name,
    address: branch.address,
    isMain: index === 0,
    contact: COMPANY_CONTACT.hotline,
  }));

  return (
    <div className="locations-section">
      <h3>Our Offices</h3>
      <p>Serving customers across Luzon with dedicated local branches.</p>
      <div className="locations-grid">
        {locations.map((loc, index) => (
          <div key={index} className={`location-card ${loc.isMain ? 'main-branch' : ''}`}>
            {loc.isMain && (
              <div className="main-badge">
                <img src={icons.checkCircle} alt="" className="inline-icon" /> Main Branch
              </div>
            )}
            <div className="location-office">{loc.office}</div>
            <div className="location-address">{loc.address}</div>
            <div className="location-contact"><img src={icons.phoneCall} alt="" className="inline-icon" /> {loc.contact}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OfficeLocations;
