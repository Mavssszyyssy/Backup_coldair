// app/customer/_layout.jsx
// Role guard + Stack navigator for customer screens.
import { Redirect, usePathname } from "expo-router";
import { Stack } from "expo-router/stack";
import { View } from "react-native";

import LoadingLogo from "../../components/LoadingLogo";
import BottomNav from "../../components/ui/BottomNav";
import { COLORS } from "../../constants/theme";
import { useRoleGuard } from "../../hooks/useRoleGuard";

export default function CustomerLayout() {
  const { initialized, allowed, redirectHref } = useRoleGuard(["customer"]);
  const pathname = usePathname();
  const topLevelScreens = new Set([
    "/customer/home",
    "/customer/shop",
    "/customer/services",
    "/customer/orders",
    "/customer/settings",
  ]);
  const showBottomNav = topLevelScreens.has(pathname);

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

  if (!allowed) {
    return <Redirect href={redirectHref} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="units/[id]" />
        <Stack.Screen name="orders" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="shop" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order-confirmation/[id]" />
        <Stack.Screen name="receipt/[id]" />
        <Stack.Screen name="services" />
        <Stack.Screen name="faq" />
        <Stack.Screen name="contact" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="oobe/index" />
        <Stack.Screen name="oobe/reset" />
      </Stack>
      {showBottomNav ? <BottomNav /> : null}
    </View>
  );
}
