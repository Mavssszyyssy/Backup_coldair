import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import NotificationBadge from "../NotificationBadge";
import { COLORS, SPACING } from "../../constants/theme";

const actionStyle = {
  width: 40,
  height: 40,
  alignItems: "center",
  justifyContent: "center",
};

export default function CustomerHeaderActions() {
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
      <Pressable
        onPress={() => router.push("/customer/chat")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Chat Support"
        style={actionStyle}
      >
        <Ionicons name="chatbubble-ellipses-sharp" size={23} color={COLORS.primary} />
      </Pressable>
      <Pressable
        onPress={() => router.push("/customer/notifications")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        style={actionStyle}
      >
        <Ionicons name="notifications-sharp" size={24} color={COLORS.primary} />
        <NotificationBadge />
      </Pressable>
    </View>
  );
}
