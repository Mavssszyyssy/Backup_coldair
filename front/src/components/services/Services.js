import {
  BellRinging,
  DeviceMobile,
  ShieldCheck,
  Wrench,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiquePageContainer from "../common/boutique/BoutiquePageContainer";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueSectionHeader from "../common/boutique/BoutiqueSectionHeader";
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
    <BoutiqueScreen
      withHeader={false}
      background={BQ_COLORS.bg}
      className="tw:bg-background tw:text-foreground"
    >
      <BoutiqueHeader
        title="Services"
        leftAction="back"
        onLeftAction={() => navigate("/home")}
      />

      <BoutiquePageContainer
        as="main"
        className="tw:mx-auto! tw:max-w-7xl tw:px-4! tw:py-6! tw:sm:px-6! tw:sm:py-8! tw:lg:px-8! tw:lg:py-10!"
      >
        <div className="tw:flex tw:flex-col tw:gap-10">
          <section
            aria-labelledby="mobile-services-title"
            className="tw:grid tw:gap-6 tw:rounded-card tw:border tw:border-border tw:border-l-4 tw:border-l-secondary tw:bg-surface tw:px-5! tw:py-4! tw:shadow-soft tw:sm:px-6! tw:sm:py-5! tw:lg:grid-cols-[minmax(0,1fr)_15rem] tw:lg:items-center tw:lg:px-8! tw:lg:py-6!"
          >
            <div className="tw:min-w-0">
              <span className="ap-badge tw:mb-4! tw:bg-accent tw:text-accent-foreground">
                <DeviceMobile size={15} weight="bold" aria-hidden="true" />
                MOBILE APP ONLY
              </span>

              <BoutiqueText
                id="mobile-services-title"
                variant="pageTitle"
                className="tw:max-w-3xl tw:text-foreground"
              >
                Manage AC services in the AeroPulse Mobile App
              </BoutiqueText>

              <BoutiqueText
                color={BQ_COLORS.inkMuted}
                className="tw:mt-3! tw:max-w-3xl"
              >
                Maintenance, cleaning, repair, installation support, and warranty requests are created only in the mobile app. Sign in on your phone using the same Cold Air account as this website.
              </BoutiqueText>
            </div>

            <div className="tw:flex tw:items-center tw:gap-3 tw:border-t tw:border-border tw:pt-5! tw:lg:border-l tw:lg:border-t-0 tw:lg:pl-6! tw:lg:pt-0!">
              <span className="tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-control tw:bg-accent tw:text-accent-foreground">
                <DeviceMobile size={23} weight="bold" aria-hidden="true" />
              </span>
              <div className="tw:min-w-0">
                <BoutiqueText variant="label" className="tw:text-foreground">
                  Service requests
                </BoutiqueText>
                <BoutiqueText variant="metadata" className="tw:mt-0.5">
                  Available in the mobile app
                </BoutiqueText>
              </div>
            </div>
          </section>

          <section aria-label="Services available in the mobile app">
            <BoutiqueSectionHeader
              title="Services available in the mobile app"
              description="Use your registered AC details to request support and follow each service from start to finish."
              className="tw:mb-4! tw:items-start"
            />

            <div className="tw:grid tw:overflow-hidden tw:rounded-card tw:border tw:border-border tw:bg-surface tw:shadow-soft tw:divide-y tw:divide-border tw:md:grid-cols-3 tw:md:divide-x tw:md:divide-y-0">
              {MOBILE_SERVICE_FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="tw:flex tw:min-w-0 tw:items-start tw:gap-4 tw:p-5! tw:sm:p-6! tw:md:flex-col"
                >
                  <span className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-control tw:bg-accent tw:text-accent-foreground">
                    <feature.icon size={21} weight="bold" aria-hidden="true" />
                  </span>
                  <div className="tw:min-w-0">
                    <BoutiqueText variant="cardTitle" className="tw:text-foreground">
                      {feature.title}
                    </BoutiqueText>
                    <BoutiqueText color={BQ_COLORS.inkMuted} className="tw:mt-1!">
                      {feature.description}
                    </BoutiqueText>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="website-services-title"
            className="tw:grid tw:gap-5 tw:border-y tw:border-border tw:bg-surface-secondary tw:px-5! tw:py-6! tw:sm:px-6! tw:lg:grid-cols-[minmax(0,1fr)_auto] tw:lg:items-center"
          >
            <div className="tw:min-w-0">
              <BoutiqueText
                id="website-services-title"
                variant="sectionTitle"
                className="tw:text-foreground"
              >
                What remains available on the website?
              </BoutiqueText>
              <BoutiqueText color={BQ_COLORS.inkMuted} className="tw:mt-2! tw:max-w-3xl">
                You can shop for AC units, track orders, view registered-unit details, review warranty coverage, and read completed service history here. The website does not create service or warranty requests.
              </BoutiqueText>
            </div>

            <div className="tw:flex tw:flex-col tw:gap-3 tw:sm:flex-row tw:lg:justify-end">
              <BoutiqueButton
                className="tw:w-full tw:sm:w-auto"
                onClick={() => navigate("/myunit")}
              >
                View My AC Units
              </BoutiqueButton>
              <BoutiqueButton
                variant="outline"
                className="tw:w-full tw:sm:w-auto"
                onClick={() => navigate("/contact")}
              >
                Contact Support
              </BoutiqueButton>
            </div>
          </section>
        </div>
      </BoutiquePageContainer>

      <BoutiqueFooter />
    </BoutiqueScreen>
  );
}

export default Services;
