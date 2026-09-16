import { useEffect, useState } from "react";
import { usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { checkBackendConnection } from "../services/api";
import { subscribeBackendConnection } from "../services/backendConnectionState";

// A small, app-wide status surface. It is deliberately separate from screen
// loading placeholders: it tells the user whether the delay is network-related
// and gives them a safe retry without losing their current screen or form.
export default function BackendConnectionStatus() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [connection, setConnection] = useState({ state: "hidden" });
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeBackendConnection((next) => {
      if (next.state === "failed") {
        setConnection(next);
        return;
      }
      // Screen-level loaders already show request progress. Keeping a second
      // floating connection spinner here covered actions and bottom navigation
      // during normal background refreshes, so this global surface is now
      // reserved for actionable connection failures only.
      setConnection({ ...next, state: "hidden" });
    });
    return unsubscribe;
  }, []);

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await checkBackendConnection();
    } finally {
      setRetrying(false);
    }
  };

  // The entry screen owns the initial connection check and its retry action.
  // Suppressing this global surface there prevents two competing error cards.
  if (pathname === "/" || connection.state === "hidden") return null;

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: Math.max(insets.bottom, SPACING.sm) + 72 }]}>
      <View style={[styles.card, styles.failedCard]}>
        <Text style={[styles.text, styles.failedText]}>{connection.message}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: retrying, disabled: retrying }}
          disabled={retrying}
          onPress={retry}
          style={[styles.retryButton, retrying ? styles.retryButtonDisabled : null]}
        >
          <Text style={styles.retryText}>{retrying ? "Retrying…" : "Retry"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = {
  container: {
    alignItems: "flex-end",
    left: 0,
    paddingHorizontal: SPACING.md,
    position: "absolute",
    right: 0,
    zIndex: 9999,
  },
  card: {
    alignItems: "center",
    borderRadius: RADIUS.full,
    flexDirection: "row",
    maxWidth: "92%",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    elevation: 5,
  },
  failedCard: { backgroundColor: COLORS.dangerLight, borderColor: "#FCA5A5", borderWidth: 1, borderRadius: RADIUS.md },
  text: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "700", marginLeft: SPACING.sm },
  failedText: { color: "#991B1B", flex: 1, lineHeight: 18, marginLeft: 0 },
  retryButton: { backgroundColor: COLORS.danger, borderRadius: RADIUS.full, marginLeft: SPACING.sm, paddingHorizontal: 12, paddingVertical: 7 },
  retryButtonDisabled: { opacity: 0.65 },
  retryText: { color: COLORS.surface, fontSize: 12, fontWeight: "800" },
};
