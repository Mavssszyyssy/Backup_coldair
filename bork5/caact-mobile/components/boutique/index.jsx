import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const BQ_COLORS = {
  accent: "#2563eb",
  bg: "#f7f8fc",
  bgAlt: "#eef2ff",
  brand: "#1d4ed8",
  danger: "#dc2626",
  ink: "#172033",
  inkFaint: "#a4adbd",
  inkMuted: "#64748b",
  success: "#15803d",
  surface: "#ffffff",
  warning: "#d97706",
  border: "#e2e8f0",
};

export const BQ_SPACING = { xs: 4, sm: 8, md: 14, lg: 20, xl: 30 };
export const BQ_RADIUS = { sm: 10, md: 14, card: 20, pill: 999 };
export const BQ_SHADOW = {
  float: { shadowColor: "#172033", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
};

const textStyles = {
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "500" },
  label: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 0.3 },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: "800" },
  h3: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
};

export function BoutiqueText({ children, variant = "body", color = BQ_COLORS.ink, align, style, ...props }) {
  return <Text {...props} style={[textStyles[variant] || textStyles.body, { color, textAlign: align }, style]}>{children}</Text>;
}

export function BoutiqueScreen({ children, contentContainerStyle, style }) {
  // The customer tab bar has a raised centre action, so leave clear space for
  // it on every iPhone size instead of letting the last product/action hide.
  return <ScrollView style={[{ flex: 1, backgroundColor: BQ_COLORS.bg }, style]} contentContainerStyle={[{ padding: BQ_SPACING.md, gap: BQ_SPACING.md, paddingBottom: BQ_SPACING.xl + 72 }, contentContainerStyle]}>{children}</ScrollView>;
}

export function BoutiqueCard({ children, onPress, padding = BQ_SPACING.md, elevated = true, style }) {
  const content = <View style={[{ backgroundColor: BQ_COLORS.surface, borderRadius: BQ_RADIUS.card, padding, borderWidth: 1, borderColor: BQ_COLORS.border }, elevated ? BQ_SHADOW.float : null, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

export function BoutiqueButton({ title, onPress, disabled, variant = "primary", size = "md", fullWidth, leftIcon, rightIcon, style }) {
  const isOutline = variant === "outline";
  const isGhost = variant === "ghost";
  const padding = size === "sm" ? { paddingVertical: 9, paddingHorizontal: 12 } : { paddingVertical: 13, paddingHorizontal: 16 };
  const backgroundColor = isOutline || isGhost ? "transparent" : BQ_COLORS.brand;
  const color = isOutline || isGhost ? BQ_COLORS.brand : "#fff";
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", minHeight: 40, alignItems: "center", justifyContent: "center", gap: BQ_SPACING.xs, borderRadius: BQ_RADIUS.md, backgroundColor, borderWidth: isOutline ? 1 : 0, borderColor: BQ_COLORS.brand, opacity: disabled ? 0.45 : pressed ? 0.82 : 1, alignSelf: fullWidth ? "stretch" : "flex-start", ...padding }, style]}>{leftIcon}<BoutiqueText variant="label" color={color}>{title}</BoutiqueText>{rightIcon}</Pressable>;
}

const chipColors = {
  blue: { bg: "#dbeafe", text: "#1d4ed8" }, neutral: { bg: "#e2e8f0", text: "#475569" }, success: { bg: "#dcfce7", text: "#15803d" }, danger: { bg: "#fee2e2", text: "#b91c1c" }, warning: { bg: "#fef3c7", text: "#a16207" },
};
export function BoutiqueChip({ label, variant = "neutral" }) { const colors = chipColors[variant] || chipColors.neutral; return <View style={{ alignSelf: "flex-start", backgroundColor: colors.bg, borderRadius: BQ_RADIUS.pill, paddingHorizontal: 9, paddingVertical: 4 }}><BoutiqueText variant="caption" color={colors.text}>{label}</BoutiqueText></View>; }

export function BoutiqueHeader({ title, subtitle, onBack, onCart, cartCount = 0 }) {
  const insets = useSafeAreaInsets();
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: BQ_SPACING.sm, paddingHorizontal: BQ_SPACING.md, paddingTop: Math.max(insets.top, BQ_SPACING.md), paddingBottom: BQ_SPACING.sm, backgroundColor: BQ_COLORS.surface, borderBottomWidth: 1, borderBottomColor: BQ_COLORS.border }, BQ_SHADOW.float]}>{onBack ? <Pressable onPress={onBack} hitSlop={10}><Ionicons name="arrow-back" size={24} color={BQ_COLORS.ink} /></Pressable> : null}<View style={{ flex: 1 }}><BoutiqueText variant="h2" numberOfLines={1}>{title}</BoutiqueText>{subtitle ? <BoutiqueText variant="caption" color={BQ_COLORS.inkMuted} numberOfLines={1}>{subtitle}</BoutiqueText> : null}</View>{onCart ? <Pressable onPress={onCart} style={{ padding: 6 }} hitSlop={8}><Ionicons name="cart-outline" size={25} color={BQ_COLORS.ink} />{cartCount > 0 ? <View style={{ position: "absolute", right: -4, top: -4, minWidth: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: BQ_COLORS.danger }}><BoutiqueText variant="caption" color="#fff">{cartCount}</BoutiqueText></View> : null}</Pressable> : null}</View>;
}

export function BoutiqueQuantityStepper({ value, onChange, max = 99 }) { const safeValue = Number(value || 1); return <View style={{ flexDirection: "row", alignItems: "center", gap: BQ_SPACING.sm }}><Pressable onPress={() => onChange(Math.max(1, safeValue - 1))}><Ionicons name="remove-circle-outline" size={23} color={BQ_COLORS.brand} /></Pressable><BoutiqueText variant="label">{safeValue}</BoutiqueText><Pressable onPress={() => onChange(Math.min(max, safeValue + 1))}><Ionicons name="add-circle-outline" size={23} color={BQ_COLORS.brand} /></Pressable></View>; }

export function BoutiqueSearchInput({ value, onChangeText, placeholder }) { return <View style={{ flexDirection: "row", alignItems: "center", gap: BQ_SPACING.sm, borderWidth: 1, borderColor: BQ_COLORS.border, borderRadius: BQ_RADIUS.md, paddingHorizontal: BQ_SPACING.sm, backgroundColor: BQ_COLORS.surface }}><Ionicons name="search-outline" size={19} color={BQ_COLORS.inkMuted} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={BQ_COLORS.inkMuted} style={{ flex: 1, minHeight: 44, color: BQ_COLORS.ink }} /></View>; }

export function BoutiqueSegmented({ options = [], value, onChange }) { return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: BQ_SPACING.xs }}>{options.map((option) => { const selected = option.value === value; return <Pressable key={option.value} onPress={() => onChange(option.value)} style={{ backgroundColor: selected ? BQ_COLORS.brand : BQ_COLORS.surface, borderRadius: BQ_RADIUS.pill, borderWidth: 1, borderColor: selected ? BQ_COLORS.brand : BQ_COLORS.border, paddingHorizontal: 12, paddingVertical: 8 }}><BoutiqueText variant="caption" color={selected ? "#fff" : BQ_COLORS.ink}>{option.label}</BoutiqueText></Pressable>; })}</ScrollView>; }
