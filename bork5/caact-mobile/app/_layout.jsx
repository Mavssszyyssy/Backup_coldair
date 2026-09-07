// app/_layout.jsx
// Root layout: mounts providers that every screen needs.
import { Stack, useRouter, useRootNavigationState } from "expo-router";
import { useEffect, useRef } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { requiredSetupRoute } from "../services/accountSetupRoute";
import { CartProvider } from "../context/CartContext";
import BackendConnectionStatus from "../components/BackendConnectionStatus";
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
  const navigation = useRootNavigationState();
  const routerRef = useRef(router);
  routerRef.current = router;
  const setupRoute = requiredSetupRoute(current);

  useEffect(() => {
    if (!navigation?.key || !token || !current?.role || setupRoute) return undefined;
    let active = true;
    const safeRouter = { push: (route) => { if (active) routerRef.current.push(route); } };

    enablePushNotifications(token).catch(() => {});
    openInitialNotification(safeRouter, current.role).catch(() => {});
    const unsubscribe = listenForNotificationNavigation(safeRouter, current.role);
    return () => { active = false; unsubscribe(); };
  }, [token, current?.role, navigation?.key, setupRoute]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <CartProvider>
          <PushNotificationSetup />
          <BackendConnectionStatus />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            // Android uses windowSoftInputMode=resize from app.json. Applying
            // a second height adjustment there caused fields and action bars
            // to jump under the keyboard on some APK devices.
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
            <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
          </KeyboardAvoidingView>
        </CartProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
