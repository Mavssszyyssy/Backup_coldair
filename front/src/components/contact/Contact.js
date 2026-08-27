import { MapPin, ShieldCheck, User } from "@phosphor-icons/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueGrid from "../common/boutique/BoutiqueGrid";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";
import "./Contact.css";
import ContactForm from "./ContactForm";
import ContactInfo from "./ContactInfo";
import ServicesSupport from "./ServicesSupport";

function Contact() {
  const navigate = useNavigate();
  const [requestedCategory, setRequestedCategory] = useState("general");

  const handleBack = () => {
    navigate("/home");
  };

  const handleConsultation = () => {
    setRequestedCategory("consultation");
    window.setTimeout(() => {
      document.getElementById("contact-message-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("contact-subject")?.focus();
    }, 0);
  };

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title="Customer Support"
        leftAction="back"
        onLeftAction={handleBack}
      />

      <BoutiqueBox
        direction="column"
        flex={1}
        width="100%"
        padding="40px 24px"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        <BoutiqueStack gap={40}>
          {/* HERO SECTION */}
          <BoutiqueBox align="center" margin="0 0 16px">
            <BoutiqueText variant="h1" align="center">
              We're Here to Help
            </BoutiqueText>
            <BoutiqueText
              color={BQ_COLORS.inkMuted}
              align="center"
              weight={500}
              margin="8px 0 0"
              style={{ maxWidth: "600px", lineHeight: 1.6 }}
            >
              Have questions about our services or need technical assistance
              with your AC? Our boutique support team is dedicated to your
              comfort.
            </BoutiqueText>
          </BoutiqueBox>

          {/* CTA SECTION */}
          <BoutiqueCard
            padding={48}
            background={BQ_COLORS.brand}
            style={{ color: "white", overflow: "hidden", position: "relative" }}
          >
            <BoutiqueBox
              direction="row"
              align="center"
              justify="space-between"
              className="cta-flex"
            >
              <BoutiqueStack gap={24} flex={1} style={{ maxWidth: "600px" }}>
                <BoutiqueStack gap={12}>
                  <BoutiqueText variant="h2" color="white">
                    Need Expert Consultation?
                  </BoutiqueText>
                  <BoutiqueText
                    color="rgba(255,255,255,0.8)"
                    size="15px"
                    style={{ lineHeight: 1.6 }}
                  >
                    Let our specialists help you design the perfect climate
                    solution for your space. We offer premium site visits and
                    technical inspections.
                  </BoutiqueText>
                </BoutiqueStack>
                <BoutiqueBox direction="row" gap={32} wrap="wrap">
                  {[
                    { icon: MapPin, text: "Free Site Visit" },
                    { icon: ShieldCheck, text: "Official Warranty" },
                    { icon: User, text: "Expert Advice" },
                  ].map((feat, i) => (
                    <BoutiqueBox
                      key={i}
                      direction="row"
                      align="center"
                      gap={10}
                    >
                      <feat.icon size={20} weight="bold" />
                      <BoutiqueText size="13px" weight={700} color="white">
                        {feat.text}
                      </BoutiqueText>
                    </BoutiqueBox>
                  ))}
                </BoutiqueBox>
              </BoutiqueStack>
              <BoutiqueButton
                variant="outline"
                size="lg"
                onClick={handleConsultation}
                style={{
                  background: "white",
                  color: BQ_COLORS.brand,
                  border: "none",
                  padding: "16px 32px",
                }}
              >
                Request Appointment
              </BoutiqueButton>
            </BoutiqueBox>
          </BoutiqueCard>

          {/* CONTACT GRID */}
          <BoutiqueGrid columns="1.5fr 1fr" gap={32}>
            <ContactForm requestedCategory={requestedCategory} />
            <ContactInfo />
          </BoutiqueGrid>

          <ServicesSupport />
        </BoutiqueStack>
      </BoutiqueBox>

      <BoutiqueFooter />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 900px) {
          .cta-flex { flex-direction: column !important; align-items: flex-start !important; gap: 32px !important; }
          .bq-grid-primitive { grid-template-columns: 1fr !important; }
        }
      `,
        }}
      />
    </BoutiqueScreen>
  );
}

export default Contact;
