import { Text, View } from "react-native";

import { COLORS, SPACING, TYPE } from "../../constants/theme";

export default function ScreenHeading({ title, subtitle, centered = false, style }) {
  const textAlign = centered ? "center" : "auto";

  return (
    <View style={[centered ? { alignSelf: "stretch" } : { flex: 1 }, { minWidth: 0 }, style]}>
      <Text accessibilityRole="header" style={[centered ? TYPE.display : TYPE.title, { color: COLORS.textPrimary, textAlign }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[TYPE.caption, { color: COLORS.textSecondary, textAlign, marginTop: SPACING.xs }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
