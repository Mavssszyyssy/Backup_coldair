import { ArrowLeft, ArrowRight, Phone } from "@phosphor-icons/react";
import { validatePhMobileHeuristic } from "../../utils/phMobileValidation";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";
import BoutiqueVerifyInput from "../common/boutique/BoutiqueVerifyInput";

export default function RegisterContactStep({
  formData,
  onFieldChange,
  onNext,
  onBack,
}) {
  const isComplete = Boolean(formData.emailVerified || formData.phoneVerified);

  return (
    <BoutiqueStack gap={32} className="bq-reg-step bq-fade-in" height="100%">
      <BoutiqueBox className="bq-reg-header">
        <BoutiqueText variant="h2" className="bq-reg-title">
          Contact Verification
        </BoutiqueText>
        <BoutiqueText
          variant="body"
          className="bq-reg-desc"
          margin="8px 0 0"
          color={BQ_COLORS.inkMuted}
          weight={500}
        >
          Your email or mobile number must be verified before you can create an account.
        </BoutiqueText>
      </BoutiqueBox>

      <BoutiqueStack gap={32} className="bq-reg-contact-fields">
        {formData.emailVerified ? <BoutiqueBox padding={18} background="#ecfdf5" style={{ borderRadius: 14 }}>
          <BoutiqueText color={BQ_COLORS.success} weight={800}>Email verification completed</BoutiqueText>
          <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted} margin="6px 0 0">Your mobile number is optional and can be added later in Settings.</BoutiqueText>
        </BoutiqueBox> : <BoutiqueVerifyInput
          label="Phone Number"
          icon={Phone}
          type="tel"
          placeholder="09XXXXXXXXX"
          value={formData.phone}
          onValueChange={(val) =>
            onFieldChange("phone", val.replace(/\D/g, "").slice(0, 11))
          }
          verified={formData.phoneVerified}
          onVerifiedChange={(val) => onFieldChange("phoneVerified", val)}
          action="register_phone"
          channel="sms"
          validator={validatePhMobileHeuristic}
        />}

      </BoutiqueStack>

      <BoutiqueBox
        direction="row"
        align="center"
        justify="space-between"
        margin="auto 0 0"
        className="bq-reg-actions"
      >
        <BoutiqueButton variant="ghost" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" /> Back
        </BoutiqueButton>
        <BoutiqueButton onClick={onNext} disabled={!isComplete}>
          Continue <ArrowRight size={18} weight="bold" />
        </BoutiqueButton>
      </BoutiqueBox>
    </BoutiqueStack>
  );
}
