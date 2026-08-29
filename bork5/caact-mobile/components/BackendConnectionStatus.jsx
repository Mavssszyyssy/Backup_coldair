import { useEffect, useRef, useState } from "react";
import { usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { checkBackendConnection } from "../services/api";
import { subscribeBackendConnection } from "../services/backendConnectionState";
import LoadingLogo from "./LoadingLogo";

// A small, app-wide status surface. It is deliberately separate from screen
// loading placeholders: it tells the user whether the delay is network-related
// and gives them a safe retry without losing their current screen or form.
export default function BackendConnectionStatus() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [connection, setConnection] = useState({ state: "hidden" });
  const displayTimer = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeBackendConnection((next) => {
      if (displayTimer.current) clearTimeout(displayTimer.current);
      if (next.state === "failed") {
        setConnection(next);
        return;
      }
      if (next.state === "connecting") {
        displayTimer.current = setTimeout(() => setConnection(next), 700);
        return;
      }
      setConnection({ ...next, state: "hidden" });
    });
    return () => {
      unsubscribe();
      if (displayTimer.current) clearTimeout(displayTimer.current);
    };
  }, []);

  const retry = async () => {
    await checkBackendConnection();
  };

  // The entry screen owns the initial connection check and its retry action.
  // Suppressing this global surface there prevents two competing error cards.
  if (pathname === "/" || connection.state === "hidden") return null;

  const failed = connection.state === "failed";
  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: Math.max(insets.bottom, SPACING.sm) + 72 }]}>
      <View style={[styles.card, failed ? styles.failedCard : styles.statusCard]}>
        {failed ? null : <LoadingLogo size={32} />}
        {failed ? <Text style={[styles.text, styles.failedText]}>{connection.message}</Text> : null}
        {failed ? (
          <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
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
  statusCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 },
  failedCard: { backgroundColor: COLORS.dangerLight, borderColor: "#FCA5A5", borderWidth: 1, borderRadius: RADIUS.md },
  text: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "700", marginLeft: SPACING.sm },
  failedText: { color: "#991B1B", flex: 1, lineHeight: 18, marginLeft: 0 },
  retryButton: { backgroundColor: COLORS.danger, borderRadius: RADIUS.full, marginLeft: SPACING.sm, paddingHorizontal: 12, paddingVertical: 7 },
  retryText: { color: COLORS.surface, fontSize: 12, fontWeight: "800" },
};
