import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { COLORS, SPACING, TYPE } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { confirmAction } from "../../utils/confirmAction";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

export default function ManagerIndexScreen() {
  const { t } = useInterfaceLanguage();
  const { current, logout } = useUserContext();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    if (loggingOut) return;
    return confirmAction({
      title: t("Sign out?"),
      message: t("Are you sure you want to sign out of your account?"),
      confirmText: t("Sign out"),
      pendingText: t("Signing out..."),
      destructive: true,
      onConfirm: async () => {
        setLoggingOut(true);
        try {
          await logout();
          router.replace("/sign-in");
        } finally {
          setLoggingOut(false);
        }
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: SPACING.lg,
        }}
      >
        <Card>
          <Text
            accessibilityRole="header"
            style={[TYPE.display, {
              color: COLORS.textPrimary,
              marginBottom: SPACING.sm,
              textAlign: "center",
            }]}
          >
            {t("You should use the web app instead.")}
          </Text>
          <Text
            style={[TYPE.body, {
              color: COLORS.textSecondary,
              marginBottom: SPACING.lg,
              textAlign: "center",
            }]}
          >
            {t("This mobile app is only for customer and technician accounts.")}
            {current?.email ? ` ${t("Signed in as")} ${current.email}.` : ""}
          </Text>
          <Button
            title={t(loggingOut ? "Signing out..." : "Sign out")}
            onPress={handleLogout}
            variant="danger"
            loading={loggingOut}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
