import { Bell } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

function NotificationSettings({
  user,
  onUpdateNotifications,
  onUpdateSettings,
}) {
  const [notifications, setNotifications] = useState({
    email: true,
    inApp: true,
    sms: false,
    accountUpdates: true,
    orderUpdates: true,
    systemAlerts: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const source = user?.notifications || {};
    setNotifications({
      email: source.email !== false,
      inApp: source.inApp !== false && source.push !== false,
      sms: source.sms || false,
      accountUpdates: source.accountUpdates !== false,
      orderUpdates: source.orderUpdates !== false,
      systemAlerts: source.systemAlerts !== false,
    });
  }, [user]);

  const role = String(user?.role || "customer").toLowerCase();
  const showOrderNotifications = role === "customer";
  const showSystemAlerts =
    role === "admin" || role === "technician" || role === "superadmin";

  const rows = useMemo(() => {
    const all = [
      {
        key: "email",
        label: "Email Notifications",
        description: "Receive updates through email.",
      },
      {
        key: "inApp",
        label: "In-app Notifications",
        description: "Show account notifications inside the app.",
      },
      {
        key: "sms",
        label: "SMS Notifications",
        description: "Receive critical updates via SMS.",
      },
      {
        key: "accountUpdates",
        label: "Account Updates",
        description: "Security and account-related updates.",
      },
      {
        key: "orderUpdates",
        label: "Order / Transaction Updates",
        description: "Order stage changes and transaction updates.",
        visible: showOrderNotifications,
      },
      {
        key: "systemAlerts",
        label: "System Alerts",
        description: "Operational and branch-level alerts.",
        visible: showSystemAlerts,
      },
    ];
    return all.filter((item) => item.visible !== false);
  }, [showOrderNotifications, showSystemAlerts]);

  const toggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...notifications,
        push: notifications.inApp,
      };
      if (onUpdateSettings) {
        await onUpdateSettings({ notifications: payload });
      } else {
        await onUpdateNotifications(payload);
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
            <Bell size={20} weight="bold" />
          </BoutiqueBox>
          <BoutiqueText variant="h2">Notification Settings</BoutiqueText>
        </BoutiqueBox>

        <BoutiqueStack gap={12}>
          {rows.map((row) => (
            <BoutiqueBox
              key={row.key}
              direction="row"
              align="center"
              justify="space-between"
              padding="16px 0"
              style={{ borderBottom: `1px solid ${BQ_COLORS.border}` }}
            >
              <BoutiqueStack gap={4}>
                <BoutiqueText weight={700}>{row.label}</BoutiqueText>
                <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                  {row.description}
                </BoutiqueText>
              </BoutiqueStack>
              <label className="bq-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(notifications[row.key])}
                  onChange={() => toggle(row.key)}
                />
                <span className="bq-toggle-slider" />
              </label>
            </BoutiqueBox>
          ))}
        </BoutiqueStack>

        <BoutiqueBox margin="12px 0 0">
          <BoutiqueButton
            onClick={handleSave}
            loading={saving}
            style={{ width: "auto", minWidth: "250px" }}
          >
            Save Notification Settings
          </BoutiqueButton>
        </BoutiqueBox>
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

export default NotificationSettings;
