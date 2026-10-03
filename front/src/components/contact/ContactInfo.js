import {
  Clock,
  EnvelopeSimple,
  MapPin,
  Phone,
} from "@phosphor-icons/react";
import { COMPANY_CONTACT } from "../../config/company";

function ContactInfo() {
  const contactItems = [
    {
      icon: Phone,
      title: "Phone Number",
      details: [COMPANY_CONTACT.hotline],
    },
    {
      icon: EnvelopeSimple,
      title: "Email Address",
      details: [COMPANY_CONTACT.supportEmail],
    },
    {
      icon: Clock,
      title: "Office Hours",
      details: [
        COMPANY_CONTACT.officeHours,
        "Operations: Monday - Sunday (Online & Technician Tasks)",
      ],
    },
    {
      icon: MapPin,
      title: "Address",
      details: [
        "Main office: Plaridel, Bulacan",
        "Serving configured branches across Luzon",
      ],
    },
  ];

  return (
    <section className="info-section" aria-labelledby="contact-info-heading">
      <div className="contact-section-heading">
        <span className="contact-section-eyebrow">Contact details</span>
        <h2 id="contact-info-heading">Contact Information</h2>
        <p>
          Reach out through any of these channels. Our team is ready to assist
          you.
        </p>
      </div>

      <dl className="contact-detail-list">
        {contactItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title} className="contact-detail-row">
              <span className="contact-detail-icon" aria-hidden="true">
                <Icon size={25} weight="regular" />
              </span>
              <div className="contact-detail-content">
                <dt>{item.title}</dt>
                {item.details.map((detail) => (
                  <dd key={detail}>{detail}</dd>
                ))}
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export default ContactInfo;
