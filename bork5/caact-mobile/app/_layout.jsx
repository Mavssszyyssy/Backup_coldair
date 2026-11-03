// app/_layout.jsx
// Root layout: mounts providers that every screen needs.
import { Stack, useRouter, useRootNavigationState } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { requiredSetupRoute } from "../services/accountSetupRoute";
import { CartProvider } from "../context/CartContext";
import BackendConnectionStatus from "../components/BackendConnectionStatus";
import ConfirmationProvider from "../components/ui/ConfirmationProvider";
import { UserProvider } from "../context/UserContext";
import { useUserContext } from "../context/UserContext";
import {
  enablePushNotifications,
  createPushNavigationGuard,
  listenForNotificationNavigation,
  openInitialNotification,
  setActivePushRecipient,
} from "../services/pushNotificationService";
import { checkBackendConnection } from "../services/api";
import { startNetworkRecovery } from "../services/networkRecovery";

function NetworkRecoverySetup() {
  useEffect(() => startNetworkRecovery(checkBackendConnection), []);
  return null;
}

function PushNotificationSetup() {
  const router = useRouter();
  const { token, current } = useUserContext();
  const navigation = useRootNavigationState();
  const routerRef = useRef(router);
  routerRef.current = router;
  const setupRoute = requiredSetupRoute(current);

  useEffect(() => {
    setActivePushRecipient(token && current?.id ? current.id : null);
    return () => setActivePushRecipient(null);
  }, [token, current?.id]);

  useEffect(() => {
    if (!navigation?.key || !token || !current?.id || !current?.role || setupRoute) return undefined;
    let active = true;
    let registering = false;
    let retryNeeded = true;
    const shouldOpen = createPushNavigationGuard();
    const options = { userId: current.id, shouldOpen };
    const safeRouter = { push: (route) => {
      if (!active) return;
      if (routerRef.current.navigate) routerRef.current.navigate(route);
      else routerRef.current.push(route);
    } };

    const register = async (requestPermission) => {
      if (registering || !active) return;
      registering = true;
      try {
        const result = await enablePushNotifications(token, { requestPermission });
        if (active) retryNeeded = !result.success && !result.skipped;
      } catch { if (active) retryNeeded = true; }
      finally { registering = false; }
    };
    void register(true);
    openInitialNotification(safeRouter, current.role, options).catch(() => {});
    const unsubscribe = listenForNotificationNavigation(safeRouter, current.role, options);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && retryNeeded) void register(false);
    });
    return () => { active = false; unsubscribe(); appStateSubscription.remove(); };
  }, [token, current?.id, current?.role, navigation?.key, setupRoute]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConfirmationProvider>
        <UserProvider>
          <CartProvider>
            <PushNotificationSetup />
            <NetworkRecoverySetup />
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
      </ConfirmationProvider>
    </SafeAreaProvider>
  );
}
