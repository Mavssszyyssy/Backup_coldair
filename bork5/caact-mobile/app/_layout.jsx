// app/_layout.jsx
// Root layout: mounts providers that every screen needs.
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CartProvider } from "../context/CartContext";
import { UserProvider } from "../context/UserContext";
import { useUserContext } from "../context/UserContext";
import {
  enablePushNotifications,
  listenForNotificationNavigation,
  openInitialNotification,
} from "../services/pushNotificationService";

function PushNotificationSetup() {
  const router = useRouter();
  const { token, current } = useUserContext();

  useEffect(() => {
    if (!token || !current?.role) return undefined;

    enablePushNotifications(token).catch(() => {});
    openInitialNotification(router, current.role).catch(() => {});
    return listenForNotificationNavigation(router, current.role);
  }, [token, current?.role, router]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <CartProvider>
          <PushNotificationSetup />
          <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
        </CartProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
