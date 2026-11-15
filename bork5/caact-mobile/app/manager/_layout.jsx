import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";
import { View } from "react-native";

import LoadingSkeleton from "../../components/ui/LoadingSkeleton";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";
import { COLORS } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";

export default function ManagerLayout() {
  const { current, initialized, resolveHomeRoute } = useUserContext();
  const { t } = useInterfaceLanguage();
  const targetHref = current ? resolveHomeRoute(current) : "/sign-in";

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 20,
          backgroundColor: COLORS.bg,
        }}
      >
        <LoadingSkeleton label={t("Loading…")} variant="detail" count={2} />
      </View>
    );
  }

  if (targetHref !== "/manager") {
    return <Redirect href={targetHref} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
