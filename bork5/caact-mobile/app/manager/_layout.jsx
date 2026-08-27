import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";
import { View } from "react-native";

import LoadingLogo from "../../components/LoadingLogo";
import { COLORS } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";

export default function ManagerLayout() {
  const { current, initialized, resolveHomeRoute } = useUserContext();
  const targetHref = current ? resolveHomeRoute(current) : "/sign-in";

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.bg,
        }}
      >
        <LoadingLogo size={82} />
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
