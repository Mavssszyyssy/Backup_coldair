import icons from '../common/icons';
import { COMPANY_CONTACT } from '../../config/company';

function ContactInfo() {
  const contactItems = [
    {
      iconSrc: icons.phoneCall,
      title: "Phone Number",
      details: [COMPANY_CONTACT.hotline],
    },
    {
      iconSrc: icons.envelope,
      title: "Email Address",
      details: [COMPANY_CONTACT.supportEmail],
    },
    {
      iconSrc: icons.clipboardList,
      title: "Office Hours",
      details: [
        COMPANY_CONTACT.officeHours,
        "Operations: Monday - Sunday (Online & Technician Tasks)",
      ],
    },
    {
      iconSrc: icons.marker,
      title: "Address",
      details: ["Main office: Plaridel, Bulacan", "Serving configured branches across Luzon"],
    },
  ];

  return (
    <div className="info-section">
      <h2>Contact Information</h2>
      <p>
        Reach out to us through any of these channels. Our team is ready to
        assist you.
      </p>
      <div className="contact-details">
        {contactItems.map((item, index) => (
          <div key={index} className="contact-item">
            <div className="contact-icon">
              <img
                src={item.iconSrc}
                alt=""
                className="inline-icon inline-icon--lg"
              />
            </div>
            <div className="contact-text">
              <h4>{item.title}</h4>
              {item.details.map((detail, i) => (
                <p key={i}>{detail}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContactInfo;
