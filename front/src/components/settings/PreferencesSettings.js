import { Globe } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { translateText } from "../../utils/customerI18n";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

function PreferencesSettings({ user, onUpdatePreferences, onUpdateSettings }) {
  const [preferences, setPreferences] = useState({
    language: "English",
    timezone: "Asia/Manila",
    theme: "light",
    autoBook: true,
  });
  const [saving, setSaving] = useState(false);
  const language = user?.preferences?.language || "English";
  const t = (text) => translateText(text, language);

  useEffect(() => {
    const source = user?.preferences || {};
    setPreferences({
      language: source.language || "English",
      timezone: source.timezone || "Asia/Manila",
      theme: source.theme || (source.darkMode ? "dark" : "light"),
      autoBook: source.autoBook !== false,
    });
  }, [user]);

  const updateField = (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        language: preferences.language,
        timezone: preferences.timezone,
        theme: preferences.theme,
        darkMode: preferences.theme === "dark",
        autoBook: preferences.autoBook,
      };
      if (onUpdateSettings) {
        await onUpdateSettings({ preferences: payload });
      } else {
        await onUpdatePreferences(payload);
      }
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
            <Globe size={20} weight="bold" />
          </BoutiqueBox>
          <BoutiqueText variant="h2">{t("Preferences")}</BoutiqueText>
        </BoutiqueBox>

        <BoutiqueStack gap={24}>
          <BoutiqueInput
            label={t("Theme")}
            type="select"
            value={preferences.theme}
            onChange={(e) => updateField("theme", e.target.value)}
            options={[
              { value: "light", label: t("Light") },
              { value: "dark", label: t("Dark") },
            ]}
            hint="Choose your app appearance."
          />

          <BoutiqueInput
            label={t("Language")}
            type="select"
            value={preferences.language}
            onChange={(e) => updateField("language", e.target.value)}
            options={[
              { value: "English", label: "English" },
              { value: "Filipino", label: "Filipino" },
            ]}
            hint="Choose your preferred language."
          />

          <BoutiqueInput
            label={t("Timezone")}
            type="select"
            value={preferences.timezone}
            onChange={(e) => updateField("timezone", e.target.value)}
            options={[
              { value: "Asia/Manila", label: "Asia/Manila" },
              { value: "UTC", label: "UTC" },
              { value: "America/New_York", label: "America/New_York" },
              { value: "Europe/London", label: "Europe/London" },
            ]}
            hint="Use your locale for schedules and logs."
          />

          <BoutiqueBox
            direction="row"
            align="center"
            justify="space-between"
            padding="16px 0"
          >
            <BoutiqueStack gap={4}>
              <BoutiqueText weight={700}>{t("Auto-booking")}</BoutiqueText>
              <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                Automatically schedule recurring services.
              </BoutiqueText>
            </BoutiqueStack>
            <label className="bq-toggle">
              <input
                type="checkbox"
                checked={preferences.autoBook}
                onChange={() => updateField("autoBook", !preferences.autoBook)}
              />
              <span className="bq-toggle-slider" />
            </label>
          </BoutiqueBox>

          <BoutiqueBox margin="12px 0 0">
            <BoutiqueButton
              onClick={handleSave}
              loading={saving}
              style={{ width: "auto", minWidth: "200px" }}
            >
              {t("Save Preferences")}
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

export default PreferencesSettings;
