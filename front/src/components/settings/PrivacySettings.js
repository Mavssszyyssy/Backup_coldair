import { ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

function PrivacySettings({ user, onUpdatePrivacy, onUpdateSettings }) {
  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    dataSharing: false,
    showEmail: false,
    showPhone: false,
    activityStatus: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const source = user?.privacy || {};
    setPrivacy({
      profileVisibility: source.profileVisibility || "public",
      dataSharing: source.dataSharing || false,
      showEmail: source.showEmail || false,
      showPhone: source.showPhone || false,
      activityStatus: source.activityStatus !== false,
    });
  }, [user]);

  const updateField = (key, value) => {
    setPrivacy((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onUpdateSettings) {
        await onUpdateSettings({ privacy });
      } else {
        await onUpdatePrivacy(privacy);
      }
    } finally {
      setSaving(false);
    }
  };

  const ToggleRow = ({ label, description, checked, onChange }) => (
    <BoutiqueBox
      direction="row"
      align="center"
      justify="space-between"
      padding="16px 0"
    >
      <BoutiqueStack gap={4}>
        <BoutiqueText weight={700}>{label}</BoutiqueText>
        <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
          {description}
        </BoutiqueText>
      </BoutiqueStack>
      <label className="bq-toggle">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="bq-toggle-slider" />
      </label>
    </BoutiqueBox>
  );

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
            <ShieldCheck size={20} weight="bold" />
          </BoutiqueBox>
          <BoutiqueText variant="h2">Privacy</BoutiqueText>
        </BoutiqueBox>

        <BoutiqueStack gap={24}>
          <BoutiqueInput
            label="Profile Visibility"
            type="select"
            value={privacy.profileVisibility}
            onChange={(e) => updateField("profileVisibility", e.target.value)}
            options={[
              { value: "public", label: "Public" },
              { value: "private", label: "Private" },
              { value: "role_based", label: "Role-based" },
            ]}
            hint="Control who can view your profile."
          />

          <BoutiqueStack
            gap={8}
            style={{
              borderTop: `1px solid ${BQ_COLORS.border}`,
              paddingTop: "16px",
            }}
          >
            <ToggleRow
              label="Data Sharing"
              description="Allow usage analytics and service personalization."
              checked={privacy.dataSharing}
              onChange={() => updateField("dataSharing", !privacy.dataSharing)}
            />
            <ToggleRow
              label="Show Email"
              description="Display your email based on visibility rules."
              checked={privacy.showEmail}
              onChange={() => updateField("showEmail", !privacy.showEmail)}
            />
            <ToggleRow
              label="Show Contact Number"
              description="Display your contact number based on visibility rules."
              checked={privacy.showPhone}
              onChange={() => updateField("showPhone", !privacy.showPhone)}
            />
            <ToggleRow
              label="Activity Visibility"
              description="Show activity/online status."
              checked={privacy.activityStatus}
              onChange={() =>
                updateField("activityStatus", !privacy.activityStatus)
              }
            />
          </BoutiqueStack>

          <BoutiqueBox margin="12px 0 0">
            <BoutiqueButton
              onClick={handleSave}
              loading={saving}
              style={{ width: "auto", minWidth: "200px" }}
            >
              Save Privacy Settings
            </BoutiqueButton>
          </BoutiqueBox>
        </BoutiqueStack>
      </BoutiqueStack>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
        .bq-toggle input { opacity: 0; width: 0; height: 0; }
        .bq-toggle-slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: ${BQ_COLORS.border}; transition: .4s; border-radius: 24px;
        }
        .bq-toggle-slider:before {
          position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
          background-color: white; transition: .4s; border-radius: 50%;
        }
        input:checked + .bq-toggle-slider { background-color: ${BQ_COLORS.brand}; }
        input:checked + .bq-toggle-slider:before { transform: translateX(20px); }
      `,
        }}
      />
    </BoutiqueCard>
  );
}

export default PrivacySettings;
