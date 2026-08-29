import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import KeyboardAwareScrollView from "../ui/KeyboardAwareScrollView";

// Top-level tab routes show the Cold Air brand instead of a redundant back action.
const TAB_ROUTES = new Set([
  "/customer/home",
  "/customer/shop",
  "/customer/orders",
  "/customer/services",
  "/customer/settings",
]);

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
  const insets = useSafeAreaInsets();
  const isTabRoute = TAB_ROUTES.has(pathname);
  const hasBottomNav = withBottomNav && isTabRoute;
  const bottomClearance = hasBottomNav
    ? SPACING.lg
    : Math.max(insets.bottom, SPACING.sm) + SPACING.lg;

  const content = scroll ? (
    <KeyboardAwareScrollView
      contentContainerStyle={[
        {
          padding: SPACING.md,
          paddingBottom: bottomClearance,
        },
        contentContainerStyle,
      ]}
      minBottomPadding={stickyAction ? bottomClearance + 96 : bottomClearance}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <View
      style={[
        {
          flex: 1,
          padding: SPACING.md,
          paddingBottom: bottomClearance,
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
        {isTabRoute && !onBack ? (
          <Image
            source={require("../../assets/coldair-app-icon.png")}
            accessibilityLabel="Cold Air ACT"
            style={{ width: 40, height: 40, borderRadius: RADIUS.md }}
          />
        ) : (
          <Pressable onPress={handleLeftAction} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
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
              <Ionicons name="arrow-back-sharp" size={21} color={COLORS.primary} />
            </View>
          </Pressable>
        )}

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
