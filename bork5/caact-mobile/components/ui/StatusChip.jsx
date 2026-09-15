import { Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

export default function StatusChip({
  label,
  color = COLORS.primary,
  tone = "light",
  style,
}) {
  return (
    <View
      style={[
        {
          backgroundColor: tone === "solid" ? color : `${color}18`,
          borderRadius: RADIUS.full,
          paddingHorizontal: SPACING.sm,
          paddingVertical: 5,
          alignSelf: "flex-start",
          borderWidth: tone === "solid" ? 0 : 1,
          borderColor: tone === "solid" ? "transparent" : `${color}32`,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: tone === "solid" ? COLORS.surface : color,
          fontSize: FONT.sm,
          fontWeight: FONT.black,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
