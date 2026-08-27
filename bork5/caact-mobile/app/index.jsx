import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LoadingLogo from "../components/LoadingLogo";
import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";
import { useUserContext } from "../context/UserContext";
import { checkBackendConnection } from "../services/api";

export default function Index() {
  const { current, initialized, resolveHomeRoute } = useUserContext();
  const [connection, setConnection] = useState({ checking: true, connected: false, message: "" });
  const targetHref = useMemo(() => current ? resolveHomeRoute(current) : "/shop", [current, resolveHomeRoute]);

  const refreshConnection = async () => {
    setConnection({ checking: true, connected: false, message: "" });
    const result = await checkBackendConnection();
    setConnection({ checking: false, connected: result.connected, message: result.message });
  };

  useEffect(() => { refreshConnection(); }, []);

  if (initialized && connection.connected) return <Redirect href={targetHref} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.lg }}>
        {connection.checking || !initialized ? <LoadingLogo size={88} /> : (
          <View style={{ width: "100%", maxWidth: 460, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: "center" }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.dangerLight, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md }}>
              <Ionicons name="cloud-offline-sharp" size={30} color={COLORS.danger} />
            </View>
            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.xl, fontWeight: FONT.black, textAlign: "center" }}>Connection failed</Text>
            <Text style={{ color: COLORS.textSecondary, textAlign: "center", lineHeight: 21, marginTop: SPACING.sm }}>{connection.message || "Unable to reach the server. Check your connection and try again."}</Text>
            <TouchableOpacity onPress={refreshConnection} style={{ minHeight: 48, marginTop: SPACING.lg, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: COLORS.surface, fontWeight: FONT.black }}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
