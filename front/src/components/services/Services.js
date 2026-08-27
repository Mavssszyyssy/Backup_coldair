import {
  BellRinging,
  DeviceMobile,
  ShieldCheck,
  Wrench,
} from "@phosphor-icons/react";
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

const MOBILE_SERVICE_FEATURES = [
  {
    icon: Wrench,
    title: "Maintenance and repairs",
    description: "Choose your registered AC, service type, preferred schedule, and service concern.",
  },
  {
    icon: ShieldCheck,
    title: "Warranty support",
    description: "Submit an eligible warranty concern and follow its review from the same mobile account.",
  },
  {
    icon: BellRinging,
    title: "Live request updates",
    description: "Track technician assignment, appointment progress, completion, and service history.",
  },
];

function Services() {
  const navigate = useNavigate();

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title="Mobile Services"
        leftAction="back"
        onLeftAction={() => navigate("/home")}
      />

      <BoutiqueBox
        width="100%"
        padding="40px 24px"
        style={{ maxWidth: 980, margin: "0 auto" }}
      >
        <BoutiqueStack gap={24}>
          <BoutiqueCard
            padding={40}
            background={BQ_COLORS.brand}
            style={{ color: "white", overflow: "hidden", position: "relative" }}
          >
            <BoutiqueStack gap={18} align="flex-start">
              <BoutiqueBox
                direction="row"
                align="center"
                gap={8}
                padding="8px 12px"
                background="rgba(255,255,255,0.14)"
                style={{ borderRadius: 999 }}
              >
                <DeviceMobile size={18} weight="bold" />
                <BoutiqueText size="12px" weight={900} color="white">
                  MOBILE APP ONLY
                </BoutiqueText>
              </BoutiqueBox>
              <BoutiqueText variant="h1" color="white">
                Manage AC services in the AeroPulse Mobile App
              </BoutiqueText>
              <BoutiqueText
                color="rgba(255,255,255,0.82)"
                style={{ maxWidth: 720, lineHeight: 1.65 }}
              >
                Maintenance, cleaning, repair, installation support, and warranty requests are created only in the mobile app. Sign in on your phone using the same Cold Air account as this website.
              </BoutiqueText>
            </BoutiqueStack>
          </BoutiqueCard>

          <BoutiqueGrid columns="repeat(3, minmax(0, 1fr))" gap={18} className="mobile-services-grid">
            {MOBILE_SERVICE_FEATURES.map((feature) => (
              <BoutiqueCard key={feature.title} padding={24}>
                <BoutiqueStack gap={12}>
                  <BoutiqueBox
                    width={46}
                    height={46}
                    align="center"
                    justify="center"
                    background={BQ_COLORS.bgAlt}
                    style={{ borderRadius: 14, color: BQ_COLORS.brand }}
                  >
                    <feature.icon size={24} weight="bold" />
                  </BoutiqueBox>
                  <BoutiqueText variant="h3">{feature.title}</BoutiqueText>
                  <BoutiqueText color={BQ_COLORS.inkMuted} style={{ lineHeight: 1.55 }}>
                    {feature.description}
                  </BoutiqueText>
                </BoutiqueStack>
              </BoutiqueCard>
            ))}
          </BoutiqueGrid>

          <BoutiqueCard padding={28} background={BQ_COLORS.bgAlt}>
            <BoutiqueStack gap={12}>
              <BoutiqueText variant="h2">What remains available on the website?</BoutiqueText>
              <BoutiqueText color={BQ_COLORS.inkMuted} style={{ lineHeight: 1.65 }}>
                You can shop for AC units, track orders, view registered-unit details, review warranty coverage, and read completed service history here. The website does not create service or warranty requests.
              </BoutiqueText>
              <BoutiqueBox direction="row" gap={12} wrap="wrap" margin="8px 0 0">
                <BoutiqueButton onClick={() => navigate("/myunit")}>View My AC Units</BoutiqueButton>
                <BoutiqueButton variant="outline" onClick={() => navigate("/contact")}>Contact Support</BoutiqueButton>
              </BoutiqueBox>
            </BoutiqueStack>
          </BoutiqueCard>
        </BoutiqueStack>
      </BoutiqueBox>

      <BoutiqueFooter />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 760px) {
          .mobile-services-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </BoutiqueScreen>
  );
}

export default Services;
