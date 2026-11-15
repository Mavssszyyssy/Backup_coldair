import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING, TYPE } from "../../constants/theme";
import KeyboardAwareScrollView from "../ui/KeyboardAwareScrollView";
import ScreenHeading from "../ui/ScreenHeading";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

const BOTTOM_NAV_ROUTES = new Set([
  "/technician",
  "/technician/home",
  "/technician/dashboard",
  "/technician/tasks",
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
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.16)",
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
        <View style={{ flex: 1, minWidth: 0 }}>
          {!!eyebrow && (
            <Text style={[TYPE.label, { color: "#BAE6FD" }]}>
              {eyebrow}
            </Text>
          )}
          <Text accessibilityRole="header" style={[TYPE.title, { color: COLORS.surface, marginTop: 2 }]}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={[TYPE.caption, { color: "#E0F2FE", marginTop: SPACING.xs }]}>
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
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isTopLevel = BOTTOM_NAV_ROUTES.has(pathname);
  const hasBottomNav = withBottomNav && isTopLevel;
  const bottomClearance = SPACING.md + (hasBottomNav ? 0 : insets.bottom);

  const content = scroll ? (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { padding: SPACING.md, paddingBottom: bottomClearance },
        contentContainerStyle,
      ]}
      minBottomPadding={bottomClearance}
    >
      {children}
    </KeyboardAwareScrollView>
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
          minHeight: 62,
          backgroundColor: COLORS.surface,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        {isTopLevel && !onBack ? (
          <Image
            source={require("../../assets/coldair-app-icon.png")}
            accessibilityLabel="Cold Air ACT"
            style={{ width: 40, height: 40, borderRadius: RADIUS.md }}
          />
        ) : (
          <Pressable onPress={handleBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("Go back")}>
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
              <Ionicons name="arrow-back-sharp" size={20} color={COLORS.tech} />
            </View>
          </Pressable>
        )}
        <ScreenHeading title={title} subtitle={subtitle} style={{ marginHorizontal: SPACING.sm }} />
        {right ? <View style={{ flexShrink: 0, alignItems: "flex-end" }}>{right}</View> : null}
      </View>
      <View style={{ flex: 1 }}>{content}</View>
      {stickyAction ?? null}
    </SafeAreaView>
  );
}
