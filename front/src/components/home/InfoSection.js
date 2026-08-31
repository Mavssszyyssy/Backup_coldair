import icons from '../common/icons';

function InfoSection() {
  return (
    <div className="info-section">
      <div className="info-card">
        <h3>
          <img src={icons.clipboardList} alt="" className="inline-icon inline-icon--md" /> Opening Hours
        </h3>
        <ul className="hours-list">
          <li><span>Office Hours (Mon - Fri)</span><span>8:00am - 5:00pm</span></li>
          <li><span>Operations (Online & Technician)</span><span>Monday - Sunday</span></li>
        </ul>
      </div>
      <div className="info-card">
        <h3>
          <img src={icons.marker} alt="" className="inline-icon inline-icon--md" /> Contact Us
        </h3>
        <ul className="contact-info">
          <li><span><img src={icons.marker} alt="" className="inline-icon" /></span><span>192 Pandan Loop #06-29, Singapore 128381</span></li>
          <li><span><img src={icons.phoneCall} alt="" className="inline-icon" /></span><span>09086854532</span></li>
          <li><span><img src={icons.envelope} alt="" className="inline-icon" /></span><span>coldairairconditioning@yahoo.com</span></li>
        </ul>
      </div>
    </div>
  );
}

export default InfoSection;
