import {
  ArrowRight,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
import {
  getLegalPolicy,
  LEGAL_LAST_UPDATED,
} from "../../domain/legalPolicies";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCheckbox from "../common/boutique/BoutiqueCheckbox";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

const CONSENTS = [
  {
    id: "agreeTermsWarranty",
    policyId: "warranty",
    linkText: "Warranty Terms and Conditions",
    error: "Accept the Warranty Terms and Conditions to continue.",
  },
  {
    id: "agreeTermsService",
    policyId: "service",
    linkText: "Service Terms and Conditions",
    error: "Accept the Service Terms and Conditions to continue.",
  },
  {
    id: "agreeTermsApp",
    policyId: "app",
    linkText: "App Terms and Conditions",
    error: "Accept the App Terms and Conditions to continue.",
  },
  {
    id: "agreePrivacyRa10173",
    policyId: "privacy",
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
  const [activeConsent, setActiveConsent] = useState(null);
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

  const activePolicy = activeConsent
    ? getLegalPolicy(activeConsent.policyId)
    : null;

  const finishPolicyReview = () => {
    if (!activeConsent) return;
    onFieldChange(activeConsent.id, true);
    setActiveConsent(null);
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
          Review each required document. Opening it marks that review complete automatically.
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
            <button
              type="button"
              className="bq-reg-link"
              aria-label={`Review ${consent.linkText}`}
              onClick={() => setActiveConsent(consent)}
            >
              {formData[consent.id] ? "Reviewed" : "Review"}
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {activePolicy ? (
        <div className="bq-reg-policy-overlay">
          <section
            className="bq-reg-policy-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bq-reg-policy-title"
          >
            <header className="bq-reg-policy-header">
              <div>
                <BoutiqueText size="12px" weight={800}>
                  {activePolicy.category}
                </BoutiqueText>
                <h2 id="bq-reg-policy-title">{activePolicy.title}</h2>
                <p>Effective and last updated: {LEGAL_LAST_UPDATED}</p>
              </div>
              <button
                type="button"
                className="bq-reg-policy-close"
                aria-label={`Close ${activePolicy.title}`}
                onClick={finishPolicyReview}
              >
                <X size={20} weight="bold" aria-hidden="true" />
              </button>
            </header>

            <div className="bq-reg-policy-content">
              <p className="bq-reg-policy-summary">{activePolicy.summary}</p>
              {activePolicy.notice ? (
                <div className="bq-reg-policy-notice" role="note">
                  {activePolicy.notice}
                </div>
              ) : null}
              {activePolicy.sections.map((section) => (
                <section key={section.id}>
                  <h3>{section.title}</h3>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets?.length ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {section.links?.length ? (
                    <div className="bq-reg-policy-resources">
                      {section.links.map((link) => (
                        <a key={link.href} href={link.href}>
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>

            <footer className="bq-reg-policy-footer">
              <BoutiqueButton type="button" onClick={finishPolicyReview}>
                Finish review
              </BoutiqueButton>
            </footer>
          </section>
        </div>
      ) : null}

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
          border: 0;
          background: transparent;
          font-family: inherit;
          cursor: pointer;
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
        .bq-reg-policy-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.62);
        }
        .bq-reg-policy-dialog {
          width: min(760px, 100%);
          max-height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 18px;
          background: white;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
          color: ${BQ_COLORS.ink};
        }
        .bq-reg-policy-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 22px 16px;
          border-bottom: 1px solid ${BQ_COLORS.border};
        }
        .bq-reg-policy-header h2 {
          margin: 4px 0;
          font-size: 24px;
          line-height: 1.25;
        }
        .bq-reg-policy-header p {
          margin: 0;
          color: ${BQ_COLORS.inkMuted};
          font-size: 13px;
        }
        .bq-reg-policy-close {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 1px solid ${BQ_COLORS.border};
          border-radius: 50%;
          background: white;
          color: ${BQ_COLORS.ink};
          cursor: pointer;
        }
        .bq-reg-policy-content {
          overflow-y: auto;
          padding: 20px 22px 26px;
          line-height: 1.65;
        }
        .bq-reg-policy-content h3 {
          margin: 24px 0 8px;
          font-size: 17px;
          line-height: 1.4;
        }
        .bq-reg-policy-content p { margin: 8px 0; }
        .bq-reg-policy-content ul { margin: 10px 0; padding-left: 22px; }
        .bq-reg-policy-summary { font-weight: 700; }
        .bq-reg-policy-notice {
          margin: 16px 0;
          padding: 13px 15px;
          border-left: 4px solid ${BQ_COLORS.brand};
          border-radius: 8px;
          background: #eff6ff;
        }
        .bq-reg-policy-resources {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }
        .bq-reg-policy-resources a {
          color: ${BQ_COLORS.brand};
          font-weight: 700;
        }
        .bq-reg-policy-footer {
          display: flex;
          justify-content: flex-end;
          padding: 14px 22px;
          border-top: 1px solid ${BQ_COLORS.border};
          background: #f8fafc;
        }
        @media (max-width: 420px) {
          .bq-reg-consent-row {
            grid-template-columns: minmax(0, 1fr) 70px;
            padding-right: 5px;
          }
          .bq-reg-consent-row .bq-checkbox-container { padding-left: 7px; }
          .bq-reg-consent-row .bq-checkbox-text { font-size: 13px; }
          .bq-reg-link { padding: 0 4px; font-size: 12px; }
          .bq-reg-policy-overlay { padding: 0; }
          .bq-reg-policy-dialog {
            width: 100%;
            max-height: 100vh;
            min-height: 100vh;
            border-radius: 0;
          }
          .bq-reg-policy-header,
          .bq-reg-policy-content,
          .bq-reg-policy-footer { padding-left: 16px; padding-right: 16px; }
          .bq-reg-policy-header h2 { font-size: 21px; }
          .bq-reg-policy-footer .bq-button { width: 100%; }
        }
      `,
        }}
      />
    </BoutiqueBox>
  );
}
