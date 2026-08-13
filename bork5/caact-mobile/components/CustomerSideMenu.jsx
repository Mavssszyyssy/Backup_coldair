import Ionicons from "@expo/vector-icons/Ionicons";
import { DrawerActions } from "@react-navigation/native";
import { usePathname, useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING } from "../constants/theme";
import { useUserContext } from "../context/UserContext";
import { getDisplayName } from "../services/profileService";
import { confirmAction } from "../utils/confirmAction";

const MENU_ITEMS = [
  { label: "Home", href: "/customer/home", icon: "home-sharp" },
  { label: "Notifications", href: "/customer/notifications", icon: "notifications-sharp" },
  { label: "Orders", href: "/customer/orders", icon: "receipt-sharp" },
  { label: "Services", href: "/customer/services", icon: "calendar-sharp" },
  { label: "Contact", href: "/customer/contact", icon: "call-sharp" },
  { label: "Settings", href: "/customer/settings", icon: "settings-sharp" },
  { label: "Account Security", href: "/customer/oobe", icon: "shield-checkmark-sharp" },
];

export default function CustomerSideMenu({ navigation }) {
  const router = useRouter();
  const pathname = usePathname();
  const { current, logout } = useUserContext();

  const displayName = getDisplayName(current);
  const initials = (displayName || "U").charAt(0).toUpperCase();

  const closeDrawer = () => {
    if (navigation?.closeDrawer) {
      navigation.closeDrawer();
      return;
    }

    if (navigation?.dispatch) {
      navigation.dispatch(DrawerActions.closeDrawer());
    }
  };

  const go = (href) => {
    router.push(href);
    closeDrawer();
  };

  const handleLogout = () =>
    confirmAction({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      confirmText: "Sign Out",
      destructive: true,
      onConfirm: async () => {
        await logout();
        closeDrawer();
        router.replace("/sign-in");
      },
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{
          padding: SPACING.lg,
          backgroundColor: COLORS.primary,
          borderBottomLeftRadius: RADIUS.xl,
          borderBottomRightRadius: RADIUS.xl,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            right: -34,
            top: -32,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
        />
        <View
          style={{
            width: 66,
            height: 66,
            borderRadius: 33,
            backgroundColor: COLORS.surface,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: SPACING.sm,
          }}
        >
          <Text style={{ color: COLORS.primary, fontSize: FONT.xl, fontWeight: FONT.black }}>
            {initials}
          </Text>
        </View>
        <Text style={{ fontSize: FONT.lg, fontWeight: FONT.black, color: COLORS.surface }}>
          {displayName}
        </Text>
        <Text style={{ fontSize: FONT.sm, color: "#DBEAFE", marginTop: 2 }}>
          {current?.email || ""}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        {MENU_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <TouchableOpacity
              key={item.href}
              onPress={() => go(item.href)}
              activeOpacity={0.75}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: SPACING.sm + 4,
                paddingHorizontal: SPACING.sm,
                borderRadius: RADIUS.lg,
                marginBottom: SPACING.xs,
                backgroundColor: active ? COLORS.primaryLight : "transparent",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: RADIUS.md,
                  backgroundColor: active ? COLORS.primary : COLORS.surface,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: SPACING.sm,
                  borderWidth: active ? 0 : 1,
                  borderColor: COLORS.border,
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={21}
                  color={active ? COLORS.surface : COLORS.primary}
                />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: FONT.base,
                  color: COLORS.textPrimary,
                  fontWeight: active ? FONT.black : FONT.bold,
                }}
              >
                {item.label}
              </Text>
              <Ionicons name="chevron-forward-sharp" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderColor: COLORS.border, padding: SPACING.md }}>
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.75}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.dangerLight,
            padding: SPACING.sm + 4,
            borderRadius: RADIUS.lg,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS.md,
              backgroundColor: "#FCA5A5",
              justifyContent: "center",
              alignItems: "center",
              marginRight: SPACING.sm,
            }}
          >
            <Ionicons name="log-out-sharp" size={21} color={COLORS.danger} />
          </View>
          <Text style={{ fontSize: FONT.base, fontWeight: FONT.black, color: COLORS.danger }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
