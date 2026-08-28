// app/index.jsx
// Entry point: show backend reachability before routing into the app.
import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";
import { useUserContext } from "../context/UserContext";
import { checkBackendConnection } from "../services/api";
import LoadingLogo from "../components/LoadingLogo";

const STATUS_COPY = {
  checking: {
    title: "Preparing Coldair",
    detail: "Loading your account and the latest service information...",
  },
  connected: {
    title: "Almost ready",
    detail: "Finishing your secure sign-in setup...",
  },
  offline: {
    title: "We couldn't connect",
    detail: "Check your internet connection, then try again.",
  },
};

export default function Index() {
  const { current, initialized, resolveHomeRoute } = useUserContext();
  const [connection, setConnection] = useState({
    state: "checking",
    message: STATUS_COPY.checking.detail,
  });

  const targetHref = useMemo(
    () => (current ? resolveHomeRoute(current) : "/sign-in"),
    [current, resolveHomeRoute],
  );

  const refreshConnection = async () => {
    setConnection((prev) => ({ ...prev, state: "checking" }));
    const result = await checkBackendConnection();
    setConnection({
      state: result.connected ? "connected" : "offline",
      message: result.message,
    });
  };

  useEffect(() => {
    refreshConnection();
  }, []);

  if (connection.state === "connected" && initialized) {
    return <Redirect href={targetHref} />;
  }

  const status = STATUS_COPY[connection.state] || STATUS_COPY.offline;
  const isLoading =
    connection.state === "checking" || connection.state === "connected";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: SPACING.lg,
        }}
      >
        <View style={{ alignItems: "center", marginBottom: SPACING.xl }}>
          <LoadingLogo size={92} />
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: FONT.xxl,
              fontWeight: FONT.black,
              marginBottom: SPACING.sm,
              marginTop: SPACING.lg,
              textAlign: "center",
            }}
          >
            {status.title}
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: FONT.md,
              lineHeight: 23,
              textAlign: "center",
            }}
          >
            {isLoading ? status.detail : connection.message || status.detail}
          </Text>
        </View>

        {connection.state === "offline" ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={refreshConnection}
            style={{
              alignItems: "center",
              backgroundColor: COLORS.primary,
              borderRadius: RADIUS.sm,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: COLORS.surface, fontWeight: FONT.bold }}>
              Try Again
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
