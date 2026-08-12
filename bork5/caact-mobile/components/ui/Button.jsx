// components/ui/Button.jsx
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

const SIZE_STYLES = {
  sm: {
    paddingVertical: 9,
    paddingHorizontal: SPACING.sm + 4,
    fontSize: FONT.sm,
    iconGap: SPACING.xs,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    fontSize: FONT.md,
    iconGap: SPACING.sm,
  },
};

function getVariantStyle(variant, accentColor) {
  const variants = {
    primary: { bg: accentColor, text: "#FFF", border: null },
    secondary: {
      bg: COLORS.surface,
      text: accentColor,
      border: accentColor,
    },
    danger: { bg: COLORS.danger, text: "#FFF", border: null },
    ghost: { bg: "transparent", text: accentColor, border: null },
  };

  return variants[variant] ?? variants.primary;
}

const JUSTIFY = {
  center: "center",
  start: "flex-start",
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  accentColor = COLORS.primary,
  loading = false,
  disabled = false,
  style,
  leftIcon,
  rightIcon,
  align = "center",
  accessibilityLabel,
}) {
  const v = getVariantStyle(variant, accentColor);
  const s = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const inactive = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: inactive }}
      style={[
        {
          backgroundColor: inactive && variant !== "ghost" ? "#CBD5E1" : v.bg,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: RADIUS.md,
          alignItems: "center",
          marginTop: SPACING.sm + 2,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border ?? "transparent",
          flexDirection: "row",
          justifyContent: JUSTIFY[align] || JUSTIFY.center,
          minHeight: size === "sm" ? 42 : 52,
          shadowColor: variant === "primary" ? accentColor : "transparent",
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: variant === "primary" && !inactive ? 0.2 : 0,
          shadowRadius: 8,
          elevation: variant === "primary" && !inactive ? 3 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {leftIcon && (
            <View style={{ marginRight: s.iconGap }}>{leftIcon}</View>
          )}
          <Text
            style={{
              color: inactive && variant !== "ghost" ? COLORS.textMuted : v.text,
              fontSize: s.fontSize,
              fontWeight: FONT.bold,
            }}
          >
            {title}
          </Text>
          {rightIcon && <View style={{ marginLeft: s.iconGap }}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
