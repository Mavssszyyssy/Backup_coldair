// app/index.jsx
// Entry point: show backend reachability before routing into the app.
import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE } from "../constants/config";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";
import { useUserContext } from "../context/UserContext";
import { checkBackendConnection } from "../services/api";

const STATUS_COPY = {
  checking: {
    title: "Connecting...",
    detail: "Connecting to the server...",
    color: COLORS.warning,
    background: COLORS.warningLight,
  },
  connected: {
    title: "Loaded",
    detail: "Server connection established.",
    color: COLORS.success,
    background: COLORS.successLight,
  },
  offline: {
    title: "Connection failed",
    detail: "Unable to connect to the server. Please check your connection and try again.",
    color: COLORS.danger,
    background: COLORS.dangerLight,
  },
};

export default function Index() {
  const { current, initialized, resolveHomeRoute } = useUserContext();
  const [connection, setConnection] = useState({
    state: "checking",
    message: STATUS_COPY.checking.detail,
    baseUrl: API_BASE,
  });
  const [enterApp, setEnterApp] = useState(false);

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
      baseUrl: result.baseUrl,
    });
  };

  useEffect(() => {
    refreshConnection();
  }, []);

  if (enterApp && initialized) {
    return <Redirect href={targetHref} />;
  }

  const status = STATUS_COPY[connection.state] || STATUS_COPY.offline;
  const isChecking = connection.state === "checking";
  const isPreparing = enterApp && !initialized;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: SPACING.lg,
        }}
      >
        <View style={{ marginBottom: SPACING.xl }}>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: FONT.xxl,
              fontWeight: FONT.black,
              marginBottom: SPACING.sm,
            }}
          >
            Coldair
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.md }}>
            Backend connection
          </Text>
        </View>

        <View
          style={{
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            padding: SPACING.lg,
          }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: status.background,
              borderRadius: RADIUS.full,
              height: 56,
              justifyContent: "center",
              marginBottom: SPACING.md,
              width: 56,
            }}
          >
            {connection.state === "checking" ? (
              <ActivityIndicator color={status.color} />
            ) : (
              <View
                style={{
                  backgroundColor: status.color,
                  borderRadius: RADIUS.full,
                  height: 16,
                  width: 16,
                }}
              />
            )}
          </View>

          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: FONT.xl,
              fontWeight: FONT.bold,
              marginBottom: SPACING.sm,
            }}
          >
            {status.title}
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: FONT.base,
              lineHeight: 22,
              marginBottom: SPACING.md,
            }}
          >
            {connection.message || status.detail}
          </Text>
          <Text
            selectable
            style={{
              color: COLORS.textMuted,
              fontSize: FONT.sm,
              lineHeight: 18,
            }}
          >
            {connection.baseUrl}
          </Text>
        </View>

        <TouchableOpacity
          disabled={isChecking || isPreparing || connection.state !== "connected"}
          onPress={() => {
            if (connection.state === "connected") setEnterApp(true);
          }}
          style={{
            alignItems: "center",
            backgroundColor:
              isChecking || isPreparing || connection.state !== "connected"
                ? COLORS.textMuted
                : COLORS.primary,
            borderRadius: RADIUS.sm,
            marginTop: SPACING.lg,
            paddingVertical: 14,
          }}
        >
          <Text style={{ color: COLORS.surface, fontWeight: FONT.bold }}>
            {isPreparing
              ? "Loading..."
              : isChecking
                ? "Connecting..."
                : connection.state === "connected"
                  ? "Continue"
                  : "Retry connection"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={refreshConnection}
          style={{ alignItems: "center", marginTop: SPACING.md }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: FONT.bold }}>
            Retry connection
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
