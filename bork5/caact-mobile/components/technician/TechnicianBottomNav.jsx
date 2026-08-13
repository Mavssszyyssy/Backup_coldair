import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

const ITEMS = [
  { href: "/technician/dashboard", label: "Dashboard", icon: "speedometer-sharp" },
  { href: "/technician/tasks", label: "Work", icon: "clipboard-sharp" },
  { href: "/technician/scan-qr", label: "Scan", icon: "qr-code-sharp", elevated: true },
  { href: "/technician/profile", label: "Profile", icon: "person-sharp" },
];

function NavItem({ item }) {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const color = active ? COLORS.tech : COLORS.textMuted;

  return (
    <TouchableOpacity
      onPress={() => router.push(item.href)}
      activeOpacity={0.78}
      style={{
        flex: item.elevated ? 1.15 : 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: item.elevated ? -28 : 0,
      }}
    >
      <View
        style={{
          width: item.elevated ? 58 : 40,
          height: item.elevated ? 58 : 40,
          borderRadius: RADIUS.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: item.elevated
            ? COLORS.tech
            : active
              ? COLORS.techLight
              : COLORS.surfaceAlt,
          borderWidth: item.elevated ? 4 : 1,
          borderColor: item.elevated ? COLORS.surface : active ? COLORS.tech : COLORS.border,
          shadowColor: COLORS.tech,
          shadowOpacity: item.elevated ? 0.22 : 0,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: item.elevated ? 6 : 0,
        }}
      >
        <Ionicons
          name={item.icon}
          size={item.elevated ? 27 : 22}
          color={item.elevated ? COLORS.surface : color}
        />
      </View>
      <Text
        style={{
          color: item.elevated ? COLORS.tech : color,
          fontSize: FONT.sm,
          fontWeight: active ? FONT.black : FONT.bold,
          marginTop: item.elevated ? 1 : 2,
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
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        flexDirection: "row",
        height: 76 + bottomInset,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: SPACING.xs,
        paddingTop: SPACING.xs,
        paddingBottom: bottomInset,
        alignItems: "center",
        elevation: 20,
        shadowColor: "#0F172A",
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      }}
    >
      {ITEMS.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </View>
  );
}
