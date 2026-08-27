import { ChatCircleText, Question } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_SHADOWS } from "../common/boutique/BoutiqueTheme";

const FAQ_ITEMS = [
  {
    question: "How long does AC delivery take after ordering?",
    answer:
      "Most in-stock units are scheduled within 24 to 48 hours after payment verification and branch allocation. We strive to provide the fastest boutique delivery service in the region.",
  },
  {
    question: "Can I reschedule my installation appointment?",
    answer:
      "Yes. Open the AeroPulse Mobile App and use the service request for your registered AC. Service scheduling and appointment changes are mobile-only.",
  },
  {
    question: "Do you provide warranty service for all brands?",
    answer:
      "AeroPulse provides comprehensive warranty support for all brands we carry. Coverage details vary by model and are clearly displayed in your registered units list.",
  },
  {
    question: "What payment methods are supported?",
    answer:
      "We accept Cash-on-Delivery (COD), GCash, major Credit/Debit Cards, and Pay-on-Installation for certain service types. Available methods will be shown during checkout.",
  },
  {
    question: "How do I register my unit for warranty?",
    answer:
      "Your AC is registered automatically after the technician completes and verifies its installation. View coverage on the website or mobile app, and submit warranty support only through the mobile app.",
  },
  {
    question: "Where do I book maintenance, cleaning, or repair?",
    answer:
      "All AC service types—including maintenance, cleaning, repair, installation support, and warranty requests—are available only in the AeroPulse Mobile App.",
  },
];

function FaqPage() {
  const navigate = useNavigate();

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title="Knowledge Center"
        leftAction="back"
        onLeftAction={() => navigate("/home")}
      />

      <BoutiqueBox
        direction="column"
        flex={1}
        width="100%"
        padding="40px 24px"
        style={{ maxWidth: "900px", margin: "0 auto" }}
      >
        <BoutiqueStack gap={40}>
          <BoutiqueBox align="center">
            <BoutiqueText variant="h1" align="center">
              Frequently Asked Questions
            </BoutiqueText>
            <BoutiqueText
              color={BQ_COLORS.inkMuted}
              align="center"
              weight={500}
              margin="8px 0 0"
              style={{ maxWidth: "600px" }}
            >
              Quick answers about ordering, service appointments, payments, and
              warranty support.
            </BoutiqueText>
          </BoutiqueBox>

          <BoutiqueStack gap={16}>
            {FAQ_ITEMS.map((item, i) => (
              <BoutiqueCard
                key={i}
                padding={32}
                style={{ transition: "all 0.3s ease" }}
                className="faq-card"
              >
                <BoutiqueStack gap={12}>
                  <BoutiqueBox direction="row" align="flex-start" gap={12}>
                    <BoutiqueBox
                      width={28}
                      height={28}
                      background={BQ_COLORS.bg}
                      align="center"
                      justify="center"
                      style={{
                        borderRadius: "50%",
                        color: BQ_COLORS.brand,
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <Question size={16} weight="bold" />
                    </BoutiqueBox>
                    <BoutiqueText variant="h3" weight={800}>
                      {item.question}
                    </BoutiqueText>
                  </BoutiqueBox>
                  <BoutiqueBox padding="0 0 0 40px">
                    <BoutiqueText
                      color={BQ_COLORS.inkMuted}
                      style={{ lineHeight: 1.7, fontSize: "15px" }}
                    >
                      {item.answer}
                    </BoutiqueText>
                  </BoutiqueBox>
                </BoutiqueStack>
              </BoutiqueCard>
            ))}
          </BoutiqueStack>

          <BoutiqueCard
            padding={40}
            background={BQ_COLORS.bgAlt}
            style={{ border: `1.5px dashed ${BQ_COLORS.border}` }}
          >
            <BoutiqueBox
              direction="row"
              align="center"
              justify="space-between"
              className="faq-cta-flex"
            >
              <BoutiqueStack gap={8}>
                <BoutiqueText variant="h2">Still have questions?</BoutiqueText>
                <BoutiqueText color={BQ_COLORS.inkMuted}>
                  Our team is ready to assist you personally.
                </BoutiqueText>
              </BoutiqueStack>
              <BoutiqueButton
                variant="primary"
                onClick={() => navigate("/contact")}
              >
                <ChatCircleText size={18} weight="bold" /> Contact Support
              </BoutiqueButton>
            </BoutiqueBox>
          </BoutiqueCard>
        </BoutiqueStack>
      </BoutiqueBox>

      <BoutiqueFooter />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .faq-card:hover { transform: translateX(8px); border-color: ${BQ_COLORS.brand}; box-shadow: ${BQ_SHADOWS.soft}; }
        @media (max-width: 640px) {
          .faq-cta-flex { flex-direction: column !important; gap: 24px !important; align-items: flex-start !important; }
        }
      `,
        }}
      />
    </BoutiqueScreen>
  );
}

export default FaqPage;
