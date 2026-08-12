import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

// Top-level tab routes that should show a home icon instead of a back arrow.
const TAB_ROUTES = [
  "/customer/home",
  "/customer/orders",
  "/customer/requests",
  "/customer/services",
  "/customer/settings",
  "/customer/contact",
  "/customer/oobe",
];

export default function CustomerScreen({
  title,
  subtitle,
  onBack,
  right,
  children,
  scroll = true,
  withBottomNav = true,
  contentContainerStyle,
  stickyAction,
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isTabRoute = TAB_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[
        {
          padding: SPACING.md,
          // Keep the last action clear of the persistent shop-style tab bar.
          paddingBottom: SPACING.xxl + 84,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        {
          flex: 1,
          padding: SPACING.md,
          paddingBottom: SPACING.xxl + 84,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const handleLeftAction = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (!isTabRoute && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/customer/home");
  };

  const leftIcon = onBack
    ? "arrow-back-sharp"
    : isTabRoute
      ? "home-sharp"
      : "arrow-back-sharp";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: SPACING.md,
          paddingTop: SPACING.xs,
          paddingBottom: SPACING.sm,
        }}
      >
        <Pressable onPress={handleLeftAction} hitSlop={12}>
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: RADIUS.md,
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Ionicons name={leftIcon} size={21} color={COLORS.primary} />
          </View>
        </Pressable>

        <View style={{ flex: 1, marginHorizontal: SPACING.sm }}>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontWeight: FONT.black,
              fontSize: FONT.xl,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: FONT.sm,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={{ minWidth: 40, alignItems: "flex-end" }}>
          {right ?? null}
        </View>
      </View>

      <View style={{ flex: 1 }}>{content}</View>
      {stickyAction ?? null}
    </SafeAreaView>
  );
}
