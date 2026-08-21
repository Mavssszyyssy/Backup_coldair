import {
  ArrowSquareOut,
  DeviceMobile,
  ShieldCheck,
  Wrench,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_GEOMETRY } from "../common/boutique/BoutiqueTheme";

const MOBILE_APP_URL = "coldair://";

function Services() {
  const navigate = useNavigate();

  const openMobileApp = () => {
    window.location.assign(MOBILE_APP_URL);
  };

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title="AeroPulse Mobile"
        leftAction="back"
        onLeftAction={() => navigate("/shop")}
      />

      <BoutiqueBox
        flex={1}
        width="100%"
        padding="64px 24px"
        align="center"
        justify="center"
      >
        <BoutiqueCard
          padding="clamp(28px, 6vw, 64px)"
          style={{ width: "100%", maxWidth: "760px", textAlign: "center" }}
        >
          <BoutiqueStack gap={24} align="center">
            <BoutiqueBox
              width={72}
              height={72}
              align="center"
              justify="center"
              background={BQ_COLORS.brand}
              color="white"
              style={{ borderRadius: "22px" }}
            >
              <DeviceMobile size={36} weight="bold" />
            </BoutiqueBox>

            <BoutiqueStack gap={12} align="center">
              <BoutiqueText variant="label" color={BQ_COLORS.accent}>
                MOBILE-ONLY SERVICE MANAGEMENT
              </BoutiqueText>
              <BoutiqueText variant="h1">Manage AC services in the Mobile App</BoutiqueText>
              <BoutiqueText
                color={BQ_COLORS.inkMuted}
                size="17px"
                align="center"
                style={{ maxWidth: "600px", lineHeight: 1.7 }}
              >
                Service requests, maintenance scheduling, technician coordination,
                warranty service, and AC service history are handled in the
                AEROPULSE Mobile App. This keeps every service record in one
                workflow for you and your assigned branch.
              </BoutiqueText>
            </BoutiqueStack>

            <BoutiqueBox
              direction="row"
              gap={16}
              width="100%"
              className="mobile-services-actions"
              justify="center"
            >
              <BoutiqueButton
                variant="primary"
                onClick={openMobileApp}
                style={{ width: "auto" }}
              >
                Open Coldair Mobile App <ArrowSquareOut size={18} weight="bold" />
              </BoutiqueButton>
              <BoutiqueButton
                variant="outline"
                onClick={() => navigate("/my-orders")}
                style={{ width: "auto" }}
              >
                View My Orders
              </BoutiqueButton>
            </BoutiqueBox>

            <BoutiqueBox
              width="100%"
              padding={20}
              background={BQ_COLORS.bgAlt}
              style={{
                borderRadius: BQ_GEOMETRY.radiusCard,
                border: `1px solid ${BQ_COLORS.border}`,
                textAlign: "left",
              }}
            >
              <BoutiqueBox direction="row" gap={12} align="flex-start">
                <ShieldCheck size={22} weight="fill" color={BQ_COLORS.success} />
                <BoutiqueStack gap={6}>
                  <BoutiqueText weight={800}>Use the same AeroPulse account</BoutiqueText>
                  <BoutiqueText size="14px" color={BQ_COLORS.inkMuted}>
                    Open the Coldair app on your phone and sign in with this
                    account. If it is installed, the button above opens the app
                    through the official <strong>coldair://</strong> app link.
                  </BoutiqueText>
                </BoutiqueStack>
              </BoutiqueBox>
            </BoutiqueBox>

            <BoutiqueBox
              direction="row"
              gap={10}
              align="center"
              color={BQ_COLORS.inkMuted}
            >
              <Wrench size={18} weight="bold" />
              <BoutiqueText size="14px">
                Need sales or account help?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/contact")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: BQ_COLORS.brand,
                    cursor: "pointer",
                    font: "inherit",
                    fontWeight: 800,
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  Contact us
                </button>
                .
              </BoutiqueText>
            </BoutiqueBox>
          </BoutiqueStack>
        </BoutiqueCard>
      </BoutiqueBox>

      <BoutiqueFooter />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 560px) {
              .mobile-services-actions { flex-direction: column !important; }
              .mobile-services-actions button { width: 100% !important; }
            }
          `,
        }}
      />
    </BoutiqueScreen>
  );
}

export default Services;
