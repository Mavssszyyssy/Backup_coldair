// app/(auth)/_layout.jsx
import { Redirect, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { COLORS } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { useGuestGuard } from "../../hooks/useGuestGuard";

const WEB_APP_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export default function AuthLayout() {
  const { current, initialized, redirectHref } = useGuestGuard();
  const { handleWebViewAuthSuccess, resolveHomeRoute } = useUserContext();
  const router = useRouter();

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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (current) {
    return <Redirect href={redirectHref} />;
  }

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "AUTH_SUCCESS") {
        const result = await handleWebViewAuthSuccess(data.token, data.user);
        if (result.success) {
          router.replace(resolveHomeRoute(result.user));
        }
      }
    } catch (e) {
      console.error("WebView message parse error:", e);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <WebView
        source={{ uri: `${WEB_APP_URL}/login` }}
        onMessage={handleMessage}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
      />
    </SafeAreaView>
  );
}
