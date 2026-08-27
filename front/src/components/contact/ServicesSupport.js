import icons from '../common/icons';
import { COMPANY_CONTACT } from '../../config/company';

function ServicesSupport() {
  const services = [
    { icon: icons.temperatureFrigid, name: "AC Installation" },
    { icon: icons.tools, name: "Repair Services" },
    { icon: icons.broom, name: "Regular Maintenance" },
    { icon: icons.diamondExclamation, name: "Chemical Cleaning" },
    { icon: icons.wind, name: "Gas Top-up" },
    { icon: icons.clipboardList, name: "Consultation" },
  ];

  const support = [
    {
      title: "Sales",
      phone: COMPANY_CONTACT.hotline,
      email: COMPANY_CONTACT.salesEmail,
      icon: icons.cartShoppingFast,
    },
    {
      title: "Customer Service",
      phone: COMPANY_CONTACT.hotline,
      email: COMPANY_CONTACT.supportEmail,
      icon: icons.memberList,
    },
    {
      title: "Technical Support",
      phone: COMPANY_CONTACT.hotline,
      email: COMPANY_CONTACT.supportEmail,
      icon: icons.tools,
    },
  ];

  return (
    <>
      <div className="services-section">
        <h3>Mobile App Services</h3>
        <p className="service-mobile-note">These service types can be requested and tracked only in the AeroPulse Mobile App.</p>
        <div className="services-list">
          {services.map((service, index) => (
            <div key={index} className="service-item">
              <span>
                <img
                  src={service.icon}
                  alt=""
                  className="service-list-icon"
                />
              </span>
              <span>{service.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="support-section">
        <h3>Support Teams</h3>
        <div className="support-grid">
          {support.map((item, index) => (
            <div key={index} className="support-card">
              <div className="support-icon">
                <img
                  src={item.icon}
                  alt=""
                  className="support-team-icon"
                />
              </div>
              <h4>{item.title}</h4>
              <p>{item.phone}</p>
              <p style={{ fontSize: "12px" }}>{item.email}</p>
              <a href={`mailto:${item.email}`} className="support-link">
                Contact →
              </a>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default ServicesSupport;
