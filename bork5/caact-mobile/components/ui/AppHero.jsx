import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPE } from "../../constants/theme";

export default function AppHero({
  eyebrow,
  title,
  subtitle,
  icon = "sparkles-sharp",
  color = COLORS.primary,
  children,
}) {
  return (
    <View
      style={{
        backgroundColor: color,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          right: -34,
          top: -38,
          width: 132,
          height: 132,
          borderRadius: 66,
          backgroundColor: "rgba(255,255,255,0.13)",
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 50,
          bottom: -42,
          width: 92,
          height: 92,
          borderRadius: 46,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: RADIUS.lg,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: SPACING.sm,
          }}
        >
          <Ionicons name={icon} size={27} color={COLORS.surface} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {!!eyebrow && (
            <Text style={[TYPE.label, { color: "#DBEAFE" }]}>
              {eyebrow}
            </Text>
          )}
          <Text accessibilityRole="header" style={[TYPE.title, { color: COLORS.surface, marginTop: 2 }]}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={[TYPE.caption, { color: "#EFF6FF", marginTop: SPACING.xs }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {children ? <View style={{ marginTop: SPACING.md }}>{children}</View> : null}
    </View>
  );
}
