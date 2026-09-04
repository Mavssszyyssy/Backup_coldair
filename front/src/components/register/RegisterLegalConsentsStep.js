import {
  ArrowRight,
  ArrowSquareOut,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCheckbox from "../common/boutique/BoutiqueCheckbox";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

const CONSENTS = [
  {
    id: "agreeTermsWarranty",
    link: "/terms/warranty",
    linkText: "Warranty Terms and Conditions",
    error: "Accept the Warranty Terms and Conditions to continue.",
  },
  {
    id: "agreeTermsService",
    link: "/terms/service",
    linkText: "Service Terms and Conditions",
    error: "Accept the Service Terms and Conditions to continue.",
  },
  {
    id: "agreeTermsApp",
    link: "/terms/app",
    linkText: "App Terms and Conditions",
    error: "Accept the App Terms and Conditions to continue.",
  },
  {
    id: "agreePrivacyRa10173",
    link: "/privacy",
    linkText: "Data Privacy Notice (RA 10173)",
    error: "Acknowledge the Data Privacy Notice to continue.",
  },
];

export default function RegisterLegalConsentsStep({
  formData,
  errors,
  onFieldChange,
  onNext,
  onBack,
}) {
  const [submitted, setSubmitted] = useState(false);
  const allChecked = CONSENTS.every((consent) => !!formData[consent.id]);
  const missingCount = CONSENTS.filter(
    (consent) => !formData[consent.id],
  ).length;

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (allChecked) {
      onNext();
      return;
    }

    const firstMissing = CONSENTS.find(
      (consent) => !formData[consent.id],
    );
    document.getElementById(firstMissing?.id)?.focus();
  };

  return (
    <BoutiqueBox
      tag="form"
      className="bq-reg-step bq-fade-in"
      height="100%"
      onSubmit={handleSubmit}
    >
      <BoutiqueBox margin="0 0 14px" className="bq-reg-header">
        <BoutiqueText variant="h2" className="bq-reg-title">
          Terms & Privacy
        </BoutiqueText>
        <BoutiqueText
          variant="body"
          className="bq-reg-desc"
          margin="7px 0 0"
          style={{ opacity: 0.8 }}
        >
          Review and accept the four required documents. Each opens in a new tab.
        </BoutiqueText>
      </BoutiqueBox>

      {submitted && !allChecked ? (
        <BoutiqueBox
          className="bq-reg-legal-alert"
          id="legal-consent-summary"
          role="alert"
          direction="row"
          align="flex-start"
          gap={9}
        >
          <ShieldCheck size={18} weight="fill" aria-hidden="true" />
          <BoutiqueText size="13px" weight={700}>
            Please accept {missingCount} remaining required {missingCount === 1 ? "policy" : "policies"}.
          </BoutiqueText>
        </BoutiqueBox>
      ) : null}

      <div className="bq-reg-consent-list">
        {CONSENTS.map((consent) => (
          <div key={consent.id} className="bq-reg-consent-row">
            <BoutiqueCheckbox
              id={consent.id}
              checked={!!formData[consent.id]}
              onChange={(value) => onFieldChange(consent.id, value)}
              error={
                (submitted && !formData[consent.id] ? consent.error : "") ||
                errors[consent.id]
              }
              showErrorMessage={false}
              aria-describedby={
                submitted && !formData[consent.id]
                  ? "legal-consent-summary"
                  : undefined
              }
            >
              <BoutiqueText size="14px" weight={700}>
                {consent.linkText}
              </BoutiqueText>
            </BoutiqueCheckbox>
            <a
              href={consent.link}
              target="_blank"
              rel="noreferrer"
              className="bq-reg-link"
              aria-label={`Read ${consent.linkText} in a new tab`}
            >
              Review
              <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
            </a>
          </div>
        ))}
      </div>

      <BoutiqueBox
        direction="row"
        align="center"
        justify="space-between"
        margin="auto 0 0"
        className="bq-reg-actions"
      >
        <BoutiqueButton type="button" variant="cancel" onClick={onBack}>
          <X size={18} weight="bold" /> Cancel
        </BoutiqueButton>
        <BoutiqueButton type="submit">
          Continue <ArrowRight size={18} weight="bold" />
        </BoutiqueButton>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-reg-legal-alert {
          margin: 0 0 10px;
          padding: 9px 11px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fff7f7;
          color: ${BQ_COLORS.danger};
        }
        .bq-reg-consent-list {
          border: 1px solid ${BQ_COLORS.border};
          border-radius: 14px;
          background: white;
          overflow: hidden;
        }
        .bq-reg-consent-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          min-height: 58px;
          padding: 5px 10px 5px 6px;
        }
        .bq-reg-consent-row + .bq-reg-consent-row {
          border-top: 1px solid ${BQ_COLORS.border};
        }
        .bq-reg-consent-row .bq-checkbox-container {
          min-height: 46px;
          border-radius: 9px;
          padding: 10px;
        }
        .bq-reg-consent-row .bq-checkbox-container:hover {
          box-shadow: none;
          transform: none;
          background: #f7faff;
        }
        .bq-reg-consent-row .bq-checkbox-text {
          min-width: 0;
          line-height: 1.35;
        }
        .bq-reg-consent-row .bq-checkbox-error {
          margin: 2px 10px 8px 46px;
          font-size: 12px;
        }
        .bq-reg-link {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 0 8px;
          color: ${BQ_COLORS.brand};
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          transition: all 0.2s;
        }
        .bq-reg-link:hover { text-decoration: underline; opacity: 0.8; }
        .bq-reg-link:focus-visible {
          outline: 3px solid rgba(37, 99, 235, 0.24);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 420px) {
          .bq-reg-consent-row {
            grid-template-columns: minmax(0, 1fr) 70px;
            padding-right: 5px;
          }
          .bq-reg-consent-row .bq-checkbox-container { padding-left: 7px; }
          .bq-reg-consent-row .bq-checkbox-text { font-size: 13px; }
          .bq-reg-link { padding: 0 4px; font-size: 12px; }
        }
      `,
        }}
      />
    </BoutiqueBox>
  );
}
