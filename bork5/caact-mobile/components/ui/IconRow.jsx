import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

export default function IconRow({
  icon,
  title,
  subtitle,
  color = COLORS.primary,
  right,
  style,
  onPress,
  accessibilityLabel,
}) {
  const content = (
    <>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: RADIUS.md,
          backgroundColor: `${color}16`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: SPACING.sm,
        }}
      >
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward-sharp" size={18} color={COLORS.textMuted} /> : null)}
    </>
  );

  const rowStyle = [
    {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: SPACING.sm,
      minHeight: 58,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        style={rowStyle}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        ...rowStyle,
      ]}
    >
      {content}
    </View>
  );
}
