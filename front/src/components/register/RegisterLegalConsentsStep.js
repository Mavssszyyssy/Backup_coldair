import { ArrowRight, X } from "@phosphor-icons/react";
import { useMemo } from "react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCheckbox from "../common/boutique/BoutiqueCheckbox";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

export default function RegisterLegalConsentsStep({
  formData,
  errors,
  onFieldChange,
  onNext,
  onBack,
}) {
  const consents = [
    {
      id: "agreeTermsWarranty",
      link: "/terms",
      linkText: "warranty terms and conditions",
    },
    {
      id: "agreeTermsService",
      link: "/terms",
      linkText: "service terms and conditions",
    },
    {
      id: "agreeTermsApp",
      link: "/terms",
      linkText: "app terms and conditions",
    },
    {
      id: "agreePrivacyRa10173",
      link: "/privacy",
      linkText: "data privacy disclosure (RA 10173)",
    },
  ];

  const allChecked = useMemo(() => {
    return consents.every((c) => !!formData[c.id]);
  }, [formData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (allChecked) {
      onNext();
    }
  };

  return (
    <BoutiqueBox
      tag="form"
      className="bq-reg-step bq-fade-in"
      height="100%"
      onSubmit={handleSubmit}
    >
      <BoutiqueBox margin="0 0 8px" className="bq-reg-header">
        <BoutiqueText variant="h2" className="bq-reg-title">
          Terms & Privacy
        </BoutiqueText>
        <BoutiqueText
          variant="body"
          className="bq-reg-desc"
          margin="8px 0 0"
          style={{ opacity: 0.8 }}
        >
          Please review and accept our policies to continue.
        </BoutiqueText>
      </BoutiqueBox>

      <BoutiqueStack gap={20} className="bq-reg-consent-list">
        {consents.map((c) => (
          <BoutiqueCheckbox
            key={c.id}
            checked={!!formData[c.id]}
            onChange={(val) => onFieldChange(c.id, val)}
            error={errors[c.id]}
          >
            <BoutiqueText size="14px">
              I agree to the{" "}
              <a
                href={c.link}
                target="_blank"
                rel="noreferrer"
                className="bq-reg-link"
              >
                {c.linkText}
              </a>
            </BoutiqueText>
          </BoutiqueCheckbox>
        ))}
      </BoutiqueStack>

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
        <BoutiqueButton type="submit" disabled={!allChecked}>
          Continue <ArrowRight size={18} weight="bold" />
        </BoutiqueButton>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-reg-link { color: ${BQ_COLORS.brand}; text-decoration: none; font-weight: 700; transition: all 0.2s; }
        .bq-reg-link:hover { text-decoration: underline; opacity: 0.8; }
      `,
        }}
      />
    </BoutiqueBox>
  );
}
