import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { COLORS, FONT, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";

export default function ManagerIndexScreen() {
  const { current, logout } = useUserContext();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.replace("/sign-in");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: SPACING.lg,
        }}
      >
        <Card>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: FONT.xxl,
              fontWeight: FONT.black,
              marginBottom: SPACING.sm,
              textAlign: "center",
            }}
          >
            You should use the web app instead.
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: FONT.base,
              lineHeight: 22,
              marginBottom: SPACING.lg,
              textAlign: "center",
            }}
          >
            This mobile app is only for customer and technician accounts.
            {current?.email ? ` Signed in as ${current.email}.` : ""}
          </Text>
          <Button
            title={loggingOut ? "Logging out..." : "Logout"}
            onPress={handleLogout}
            variant="danger"
            loading={loggingOut}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}
