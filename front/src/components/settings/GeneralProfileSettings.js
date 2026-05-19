import { EnvelopeSimple, Phone, User, UserCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../config/api";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

function GeneralProfileSettings({ user, onUpdateProfile }) {
  const [formData, setFormData] = useState({
    name_first: "",
    name_last: "",
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
        alias: user.alias || "",
        phone: user.phone || "",
        email: user.email || "",
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
    setSaving(true);
    setErrors({});
    try {
      if (aliasStatus === "taken") {
        setErrors({ alias: "This alias is already taken." });
        setSaving(false);
        return;
      }

      await onUpdateProfile({
        name_first: formData.name_first,
        name_last: formData.name_last,
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
          <BoutiqueText variant="h2">General Profile</BoutiqueText>
        </BoutiqueBox>

        <BoutiqueStack gap={24}>
          <BoutiqueBox direction="row" gap={20}>
            <BoutiqueInput
              label="First Name"
              icon={User}
              value={formData.name_first}
              onChange={(e) => handleChange("name_first", e.target.value)}
              placeholder="Juan"
              flex={1}
            />
            <BoutiqueInput
              label="Last Name"
              icon={User}
              value={formData.name_last}
              onChange={(e) => handleChange("name_last", e.target.value)}
              placeholder="Dela Cruz"
              flex={1}
            />
          </BoutiqueBox>

          <BoutiqueInput
            label="Sign-In Alias"
            icon={UserCircle}
            value={formData.alias}
            onChange={(e) => handleChange("alias", e.target.value)}
            onBlur={handleAliasBlur}
            placeholder="juan.dc"
            status={aliasStatus === "taken" || errors.alias ? "error" : aliasStatus === "available" ? "success" : null}
            errorMessage={errors.alias || (aliasStatus === "taken" ? "Alias is unavailable" : null)}
            hint="Your unique public identifier."
          />

          <BoutiqueInput
            label="Phone Number"
            icon={Phone}
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="09XXXXXXXXX"
            hint="Used for SMS notifications and recovery."
          />

          <BoutiqueInput
            label="Email Address"
            icon={EnvelopeSimple}
            value={formData.email}
            disabled
            hint="Email cannot be changed directly for security reasons."
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
              Save Profile Changes
            </BoutiqueButton>
          </BoutiqueBox>
        </BoutiqueStack>
      </BoutiqueStack>
    </BoutiqueCard>
  );
}

export default GeneralProfileSettings;
