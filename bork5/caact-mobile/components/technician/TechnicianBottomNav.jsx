import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

const ITEMS = [
  { href: "/technician/dashboard", label: "Dashboard", icon: "speedometer-sharp" },
  { href: "/technician/notifications", label: "Alerts", icon: "notifications-sharp" },
  { href: "/technician/profile", label: "Profile", icon: "person-sharp" },
];

function NavItem({ item }) {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const color = active ? COLORS.tech : COLORS.textMuted;

  return (
    <TouchableOpacity
      onPress={() => router.replace(item.href)}
      activeOpacity={0.78}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={{
        flex: item.elevated ? 1.15 : 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 58,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: RADIUS.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? COLORS.techLight : "transparent",
        }}
      >
        <Ionicons
          name={item.icon}
          size={22}
          color={color}
        />
      </View>
      <Text
        style={{
          color,
          fontSize: 11,
          fontWeight: active ? FONT.black : FONT.bold,
          marginTop: 3,
        }}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function TechnicianBottomNav() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, SPACING.xs);

  return (
    <View
      style={{
        zIndex: 30,
        flexDirection: "row",
        height: 68 + bottomInset,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: SPACING.xs,
        paddingTop: 2,
        paddingBottom: bottomInset,
        alignItems: "center",
        elevation: 8,
        shadowColor: "#0F172A",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -4 },
      }}
    >
      {ITEMS.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </View>
  );
}
