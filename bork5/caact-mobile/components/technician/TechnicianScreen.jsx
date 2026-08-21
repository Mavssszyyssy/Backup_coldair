import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

const BOTTOM_NAV_ROUTES = new Set([
  "/technician",
  "/technician/home",
  "/technician/dashboard",
  "/technician/notifications",
  "/technician/profile",
]);

export function TechHero({ eyebrow, title, subtitle, icon = "construct-sharp", children }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.tech,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          right: -26,
          top: -28,
          width: 116,
          height: 116,
          borderRadius: 58,
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: RADIUS.lg,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: SPACING.sm,
          }}
        >
          <Ionicons name={icon} size={26} color={COLORS.surface} />
        </View>
        <View style={{ flex: 1 }}>
          {!!eyebrow && (
            <Text style={{ color: "#BAE6FD", fontSize: FONT.sm, fontWeight: FONT.bold }}>
              {eyebrow}
            </Text>
          )}
          <Text
            style={{
              color: COLORS.surface,
              fontSize: FONT.xl,
              fontWeight: FONT.black,
              marginTop: 2,
            }}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text style={{ color: "#E0F2FE", marginTop: 4, lineHeight: 20 }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {children ? <View style={{ marginTop: SPACING.md }}>{children}</View> : null}
    </View>
  );
}

export function TechStatCard({ label, value, icon, color = COLORS.tech }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: "50%",
        flexGrow: 0,
        flexShrink: 0,
        minHeight: 84,
        alignItems: "center",
        justifyContent: "center",
        padding: SPACING.sm,
      }}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={{ color, fontSize: FONT.xxl, fontWeight: FONT.black }}>{value}</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

export default function TechnicianScreen({
  title,
  subtitle,
  icon = "construct-sharp",
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
  const hasBottomNav = withBottomNav && BOTTOM_NAV_ROUTES.has(pathname);
  const bottomClearance = hasBottomNav
    ? 76 + Math.max(insets.bottom, SPACING.xs) + 44
    : Math.max(insets.bottom, SPACING.md) + SPACING.lg;

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { padding: SPACING.md, paddingBottom: bottomClearance },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: SPACING.md, paddingBottom: bottomClearance }, contentContainerStyle]}>{children}</View>
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) router.back();
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: SPACING.md,
          paddingTop: SPACING.xs,
          paddingBottom: SPACING.sm,
        }}
      >
        <Pressable onPress={handleBack} hitSlop={12}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: RADIUS.full,
              backgroundColor: COLORS.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Ionicons name={onBack ? "arrow-back-sharp" : icon} size={20} color={COLORS.tech} />
          </View>
        </Pressable>
        <View style={{ flex: 1, flexShrink: 1, marginHorizontal: SPACING.sm }}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.xl }}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={{ minWidth: 38, alignItems: "flex-end" }}>{right ?? null}</View>
      </View>
      <View style={{ flex: 1 }}>{content}</View>
      {stickyAction ?? null}
    </SafeAreaView>
  );
}
