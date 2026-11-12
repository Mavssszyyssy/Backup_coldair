import { EnvelopeSimple, Phone, User, UserCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../config/api";
import { translateText } from "../../utils/customerI18n";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";
import {
  ACCOUNT_SUFFIX_MAX_LENGTH,
  validateAccountSuffix,
} from "../../domain/register/validateRegistrationProfile";
import { PERSON_NAME_MAX_LENGTH, validatePersonName } from "../../domain/personNameValidation";
import {
  validateLocalPhMobile,
} from "../../utils/phMobileValidation";

function sanitizeAccountPhone(value, previousValue = "") {
  const text = String(value ?? "").trim();
  if (!/^[+\d\s()-]*$/.test(text)) return previousValue;
  const digits = text.replace(/\D/g, "");
  if (/^\+?639\d{9}$/.test(text.replace(/[\s()-]/g, ""))) {
    return `09${digits.slice(-9)}`;
  }
  if (/^9\d{9}$/.test(digits)) return `0${digits}`;
  return digits.length <= 11 ? digits : previousValue;
}

function GeneralProfileSettings({ user, onUpdateProfile }) {
  const t = (value) => translateText(value, user?.preferences?.language);
  const [formData, setFormData] = useState({
    name_first: "",
    name_last: "",
    suffix: "",
    alias: "",
    phone: "",
    email: "", // Usually read-only or handled specially
  });
  const [aliasStatus, setAliasStatus] = useState(null); // null, 'checking', 'available', 'taken'
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        name_first: user.name_first || "",
        name_last: user.name_last || "",
        suffix: user.suffix || "",
        alias: user.alias || "",
        phone: sanitizeAccountPhone(user.phone || "", user.phone || ""),
        email: user.email || "",
      });
      setErrors({
        name_first: user.name_first ? validatePersonName(user.name_first, "First name") : "",
        name_last: user.name_last ? validatePersonName(user.name_last, "Last name") : "",
        suffix: validateAccountSuffix(user.suffix || ""),
        phone: validateLocalPhMobile(sanitizeAccountPhone(user.phone || "", user.phone || "")),
      });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (field === "alias" && aliasStatus !== null) {
      setAliasStatus(null);
    }
  };

  const handlePhoneChange = (value) => {
    handleChange("phone", sanitizeAccountPhone(value, formData.phone));
  };

  const handleAliasBlur = async () => {
    if (!formData.alias || formData.alias === user?.alias) {
      setAliasStatus(null);
      return;
    }
    if (formData.alias.length < 2) {
      setAliasStatus("taken"); // Treat as invalid
      return;
    }

    setAliasStatus("checking");
    try {
      const res = await apiRequest(
        `/auth/check-alias?alias=${encodeURIComponent(formData.alias)}`,
      );
      setAliasStatus(res.available ? "available" : "taken");
    } catch (err) {
      setAliasStatus(null);
    }
  };

  const handleSave = async () => {
    setErrors({});
    const firstNameError = validatePersonName(formData.name_first, "First name");
    const lastNameError = validatePersonName(formData.name_last, "Last name");
    const suffixError = validateAccountSuffix(formData.suffix);
    const phoneError = validateLocalPhMobile(formData.phone);
    if (firstNameError || lastNameError || suffixError || phoneError) {
      setErrors({
        name_first: firstNameError,
        name_last: lastNameError,
        suffix: suffixError,
        phone: phoneError,
      });
      return;
    }
    setSaving(true);
    try {
      if (aliasStatus === "taken") {
        setErrors({ alias: "This username is already taken." });
        setSaving(false);
        return;
      }

      await onUpdateProfile({
        name_first: formData.name_first,
        name_last: formData.name_last,
        suffix: formData.suffix.trim(),
        alias: formData.alias,
        phone: formData.phone,
      });
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BoutiqueCard padding={32}>
      <BoutiqueStack gap={32}>
        <BoutiqueBox direction="row" align="center" gap={12}>
          <BoutiqueBox
            width={40}
            height={40}
            background={BQ_COLORS.bg}
            align="center"
            justify="center"
            style={{ borderRadius: "12px", color: BQ_COLORS.brand }}
          >
            <UserCircle size={20} weight="bold" />
          </BoutiqueBox>
          <BoutiqueText variant="h2">{t("General Profile")}</BoutiqueText>
        </BoutiqueBox>

        <BoutiqueStack gap={24}>
          <BoutiqueBox direction="row" gap={20}>
            <BoutiqueInput
              label={t("First Name")}
              icon={User}
              value={formData.name_first}
              maxLength={PERSON_NAME_MAX_LENGTH}
              hint={`${formData.name_first?.length || 0}/${PERSON_NAME_MAX_LENGTH}`}
              onChange={(e) => handleChange("name_first", e.target.value)}
              placeholder="Juan"
              status={errors.name_first ? "error" : null}
              errorMessage={t(errors.name_first)}
              flex={1}
            />
            <BoutiqueInput
              label={t("Last Name")}
              icon={User}
              value={formData.name_last}
              maxLength={PERSON_NAME_MAX_LENGTH}
              hint={`${formData.name_last?.length || 0}/${PERSON_NAME_MAX_LENGTH}`}
              onChange={(e) => handleChange("name_last", e.target.value)}
              placeholder="Dela Cruz"
              status={errors.name_last ? "error" : null}
              errorMessage={t(errors.name_last)}
              flex={1}
            />
          </BoutiqueBox>

          <BoutiqueInput
            label={t("Suffix (optional)")}
            value={formData.suffix}
            maxLength={ACCOUNT_SUFFIX_MAX_LENGTH}
            hint={`${formData.suffix?.length || 0}/${ACCOUNT_SUFFIX_MAX_LENGTH}`}
            onChange={(e) => handleChange("suffix", e.target.value)}
            placeholder={t("Jr. or III")}
            status={errors.suffix ? "error" : null}
            errorMessage={t(errors.suffix)}
          />

          <BoutiqueInput
            label={t("Username")}
            icon={UserCircle}
            value={formData.alias}
            onChange={(e) => handleChange("alias", e.target.value)}
            onBlur={handleAliasBlur}
            placeholder="juan.dc"
            status={aliasStatus === "taken" || errors.alias ? "error" : aliasStatus === "available" ? "success" : null}
            errorMessage={t(errors.alias || (aliasStatus === "taken" ? "This username is unavailable" : null))}
            hint={t("Use this name to sign in to your account.")}
          />

          <BoutiqueInput
            label={t("Phone Number")}
            icon={Phone}
            value={formData.phone}
            maxLength={16}
            type="tel"
            inputMode="numeric"
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="09XXXXXXXXX"
            status={errors.phone ? "error" : null}
            errorMessage={t(errors.phone)}
            hint={t("Enter 11 digits starting with 09. Used for delivery and service contact; account verification codes are sent to your email.")}
          />

          <BoutiqueInput
            label={t("Email Address")}
            icon={EnvelopeSimple}
            value={formData.email}
            disabled
            hint={t("Email cannot be changed directly for security reasons.")}
            style={{
              backgroundColor: BQ_COLORS.bg,
              color: BQ_COLORS.inkMuted,
              cursor: "not-allowed",
            }}
          />

          {errors.submit && (
            <BoutiqueText color={BQ_COLORS.danger} size="14px" weight={600}>
              {errors.submit}
            </BoutiqueText>
          )}

          <BoutiqueBox margin="12px 0 0">
            <BoutiqueButton
              onClick={handleSave}
              loading={saving}
              disabled={aliasStatus === "checking" || aliasStatus === "taken"}
              style={{ width: "auto", minWidth: "200px" }}
            >
              {t("Save Profile Changes")}
            </BoutiqueButton>
          </BoutiqueBox>
        </BoutiqueStack>
      </BoutiqueStack>
    </BoutiqueCard>
  );
}

export default GeneralProfileSettings;
