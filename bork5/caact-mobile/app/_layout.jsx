// app/_layout.jsx
// Root layout: mounts providers that every screen needs.
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

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

  useEffect(() => {
    if (Platform.OS === "web") return undefined;
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
