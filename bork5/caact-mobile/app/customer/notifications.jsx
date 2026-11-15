import { useRouter } from "expo-router";
import { BoutiqueButton, BoutiqueHeader, BoutiqueScreen } from "../../components/boutique";
import NotificationsInbox from "../../components/notifications/NotificationsInbox";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

export default function CustomerNotificationsScreen() {
  const router = useRouter();
  const { t } = useInterfaceLanguage();

  return (
    <>
      <BoutiqueHeader title={t("Alerts")} subtitle={t("Tap an update to continue")} onBack={() => router.back()} />
      <BoutiqueScreen><NotificationsInbox t={t} Button={BoutiqueButton} /></BoutiqueScreen>
    </>
  );
}
