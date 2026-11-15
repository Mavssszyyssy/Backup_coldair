// app/index.jsx
// Route as soon as session restoration finishes. Screen requests and the
// app-wide connection banner handle reachability after navigation.
import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, RADIUS, SPACING, TYPE } from "../constants/theme";
import { useUserContext } from "../context/UserContext";
import { checkBackendConnection } from "../services/api";
import LoadingLogo from "../components/LoadingLogo";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import { useInterfaceLanguage } from "../hooks/useInterfaceLanguage";

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
  const { current, token, initialized, refreshCurrentUser, resolveHomeRoute } = useUserContext();
  const { t } = useInterfaceLanguage();
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
    const restored = result.connected ? await refreshCurrentUser() : null;
    setConnection({
      state: result.connected && restored?.success ? "connected" : "offline",
      message: restored?.error || result.message,
    });
  };

  useEffect(() => {
    // A saved token with no restored user means the first /auth/me attempt
    // failed transiently. Only that recovery case needs a second probe.
    if (initialized && token && !current) void refreshConnection();
  }, [initialized, token, current]);

  if (initialized && (current || !token)) {
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
          {!isLoading && <LoadingLogo size={92} />}
          <Text
            accessibilityRole="header"
            style={[TYPE.display, {
              color: COLORS.textPrimary,
              marginBottom: SPACING.sm,
              marginTop: SPACING.lg,
              textAlign: "center",
            }]}
          >
            {t(status.title)}
          </Text>
          {isLoading ? <LoadingSkeleton label={t(status.detail)} variant="detail" count={2} /> : <Text
            style={[TYPE.body, {
              color: COLORS.textSecondary,
              textAlign: "center",
            }]}
          >
            {t(connection.message || status.detail)}
          </Text>}
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
            <Text style={[TYPE.action, { color: COLORS.surface, textAlign: "center" }]}>
              {t("Try again")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
