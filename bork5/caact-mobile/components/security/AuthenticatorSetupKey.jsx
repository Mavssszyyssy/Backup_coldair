import { useState } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import Button from "../ui/Button";
import { COLORS, SPACING } from "../../constants/theme";

export default function AuthenticatorSetupKey({ secret, disabled = false }) {
  const [copyResult, setCopyResult] = useState(null);
  const [copying, setCopying] = useState(false);
  const copy = async () => {
    if (!secret || disabled || copying) return;
    setCopying(true);
    try {
      const copied = await Clipboard.setStringAsync(secret);
      if (!copied) throw new Error("Clipboard unavailable");
      setCopyResult({ secret, message: "Setup key copied. Paste it into your authenticator app." });
    } catch {
      setCopyResult({ secret, message: "Unable to copy. Press and hold the setup key to copy it manually." });
    } finally {
      setCopying(false);
    }
  };
  return <View style={{ gap: SPACING.sm, marginBottom: SPACING.md }}>
    <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>Or use a setup key</Text>
    <Text style={{ color: COLORS.textSecondary }}>In your authenticator app, choose Enter a setup key, paste the key below, and select Time based. Then return here and enter the six-digit code.</Text>
    <Text selectable accessibilityLabel="Authenticator setup key" style={{ color: COLORS.primary, fontWeight: "700" }}>{secret || "Loading setup key…"}</Text>
    <Button title="Copy setup key" variant="secondary" onPress={copy} disabled={!secret || disabled || copying} />
    {copyResult?.secret === secret ? <Text accessibilityLiveRegion="polite">{copyResult.message}</Text> : null}
    <Text style={{ color: COLORS.textSecondary }}>Keep this key private. Anyone with it can generate your sign-in codes.</Text>
  </View>;
}
