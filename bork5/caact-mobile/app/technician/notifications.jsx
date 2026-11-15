import NotificationsInbox from "../../components/notifications/NotificationsInbox";
import TechButton from "../../components/technician/TechButton";
import TechnicianScreen from "../../components/technician/TechnicianScreen";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

export default function TechnicianNotificationsScreen() {
  const { t } = useInterfaceLanguage();

  return (
    <TechnicianScreen title={t("Alerts")} subtitle={t("Assignments and service updates")} icon="notifications-sharp">
      <NotificationsInbox t={t} Button={TechButton} technician />
    </TechnicianScreen>
  );
}
