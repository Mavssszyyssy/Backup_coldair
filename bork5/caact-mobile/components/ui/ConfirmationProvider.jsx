import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, Text, TouchableOpacity, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { registerConfirmationPresenter } from "../../utils/confirmAction";

export default function ConfirmationProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resolverRef = useRef(null);
  const busyRef = useRef(false);

  busyRef.current = busy;

  const present = useCallback((options) => new Promise((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    busyRef.current = false;
    setBusy(false);
    setError("");
    setDialog(options);
  }), []);

  useEffect(() => registerConfirmationPresenter(present), [present]);

  const close = useCallback((value) => {
    if (busyRef.current) return;
    resolverRef.current?.(value);
    resolverRef.current = null;
    setDialog(null);
    setError("");
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || !dialog || typeof document === "undefined") return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busyRef.current) close(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, dialog]);

  useEffect(() => () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const confirm = async () => {
    if (!dialog || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await Promise.resolve(dialog.onConfirm?.());
      resolverRef.current?.(true);
      resolverRef.current = null;
      setDialog(null);
    } catch (requestError) {
      setError(requestError?.message || dialog.errorMessage || "Unable to complete this action. Please try again.");
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      {children}
      <Modal
        visible={Boolean(dialog)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => close(false)}
      >
        <View
          accessibilityViewIsModal
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: SPACING.lg,
            backgroundColor: "rgba(15, 23, 42, 0.58)",
          }}
        >
          <Pressable
            accessibilityRole="alert"
            style={{
              width: "100%",
              maxWidth: 430,
              padding: SPACING.lg,
              borderRadius: RADIUS.xl,
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: dialog?.destructive ? "#FECACA" : COLORS.border,
              shadowColor: "#0F172A",
              shadowOpacity: 0.24,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: RADIUS.lg,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: dialog?.destructive ? COLORS.dangerLight : COLORS.primaryLight,
                }}
              >
                <Text style={{ color: dialog?.destructive ? COLORS.danger : COLORS.primary, fontSize: 24, fontWeight: FONT.black }}>!</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text accessibilityRole="header" style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, lineHeight: 25 }}>
                  {dialog?.title}
                </Text>
                <Text style={{ marginTop: SPACING.xs, color: COLORS.textSecondary, fontSize: FONT.base, lineHeight: 22 }}>
                  {dialog?.message}
                </Text>
              </View>
              <TouchableOpacity
                testID="confirmation-cancel-button"
                accessibilityRole="button"
                accessibilityLabel="Close confirmation"
                onPress={() => close(false)}
                disabled={busy}
                style={{ width: 34, height: 34, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceAlt }}
              >
                <Text style={{ color: COLORS.textMuted, fontSize: 22, lineHeight: 24 }}>×</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <Text accessibilityRole="alert" style={{ marginTop: SPACING.md, padding: SPACING.sm, borderRadius: RADIUS.md, color: COLORS.danger, backgroundColor: COLORS.dangerLight, lineHeight: 20 }}>
                {error}
              </Text>
            ) : null}

            <View style={{ flexDirection: Platform.OS === "web" ? "row" : "column-reverse", gap: SPACING.sm, marginTop: SPACING.lg }}>
              <TouchableOpacity
                testID="confirmation-confirm-button"
                accessibilityRole="button"
                onPress={() => close(false)}
                disabled={busy}
                style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surface }}
              >
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>{dialog?.cancelText || "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={confirm}
                disabled={busy}
                style={{ flex: 1, minHeight: 48, flexDirection: "row", gap: SPACING.xs, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.md, backgroundColor: dialog?.destructive ? COLORS.danger : COLORS.primary, opacity: busy ? 0.72 : 1 }}
              >
                {busy ? <ActivityIndicator size="small" color={COLORS.surface} /> : null}
                <Text style={{ color: COLORS.surface, fontWeight: FONT.black }}>
                  {busy ? (dialog?.pendingText || "Processing...") : (dialog?.confirmText || "Confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
