// app/(auth)/_layout.jsx
// Guest guard: anyone with a valid session is bounced to their home screen.
import { Redirect, Stack } from "expo-router";
import { View } from "react-native";

import LoadingLogo from "../../components/LoadingLogo";
import { COLORS } from "../../constants/theme";
import { useGuestGuard } from "../../hooks/useGuestGuard";

export default function AuthLayout() {
  const { current, initialized, redirectHref } = useGuestGuard();

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

  if (current) {
    return <Redirect href={redirectHref} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="sign-in">
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-up/step/0" />
      <Stack.Screen name="sign-up/step/1" />
      <Stack.Screen name="sign-up/step/2" />
      <Stack.Screen name="recover/index" />
      <Stack.Screen
        name="recover/factor/index"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen name="recover/factor/0" />
      <Stack.Screen name="recover/factor/1" />
      <Stack.Screen name="recover/factor/2" />
    </Stack>
  );
}
