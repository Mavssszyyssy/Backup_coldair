import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, TouchableOpacity, View } from "react-native";

import { COLORS, FONT, SPACING } from "../../constants/theme";

export function CustomerEditAction({ onPress, color = COLORS.primary }) {
  return (
    <TouchableOpacity
      activeOpacity={0.74}
      onPress={onPress}
      accessibilityLabel="Edit"
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <Ionicons name="create-outline" size={18} color={color} />
    </TouchableOpacity>
  );
}

export default function CustomerSettingsRow({
  icon,
  title,
  subtitle,
  right,
  danger,
  onPress,
  color = COLORS.primary,
}) {
  const accent = danger ? COLORS.danger : color;

  const content = (
    <>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: danger ? COLORS.dangerLight : COLORS.primaryLight,
          marginRight: SPACING.sm,
        }}
      >
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: danger ? COLORS.danger : COLORS.textPrimary,
            fontWeight: FONT.black,
          }}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: FONT.sm,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward-sharp" size={18} color={COLORS.textMuted} /> : null)}
    </>
  );

  const rowStyle = {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: SPACING.sm,
        minHeight: 56,
      };

  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <TouchableOpacity activeOpacity={0.72} onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={rowStyle}>
      {content}
    </TouchableOpacity>
  );
}
