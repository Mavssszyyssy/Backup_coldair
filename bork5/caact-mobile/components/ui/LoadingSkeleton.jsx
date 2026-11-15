import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

const defaultCounts = { list: 3, cards: 2, detail: 1, inline: 2 };

export default function LoadingSkeleton({ label, variant = "list", count = defaultCounts[variant] }) {
  const dark = useColorScheme() === "dark";
  const surface = dark ? "#1E293B" : COLORS.surface;
  const bar = dark ? "#334155" : COLORS.border;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={styles.container}
    >
      <Text style={[styles.label, { color: dark ? "#CBD5E1" : COLORS.textSecondary }]}>{label}</Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.items, variant === "cards" && styles.grid]}>
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={[styles.item, { backgroundColor: surface, borderColor: bar }, variant === "cards" && styles.card, variant === "detail" && styles.detail]}>
            {variant === "cards" && <View style={[styles.media, { backgroundColor: bar }]} />}
            <View style={[styles.line, styles.title, { width: index % 2 ? "68%" : "52%", backgroundColor: bar }]} />
            <View style={[styles.line, { backgroundColor: bar }]} />
            {variant !== "inline" && <View style={[styles.line, styles.short, { backgroundColor: bar }]} />}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", marginVertical: SPACING.sm },
  label: { fontSize: FONT.base, marginBottom: SPACING.sm },
  items: { gap: SPACING.sm },
  grid: { flexDirection: "row" },
  item: { minWidth: 0, padding: SPACING.md, gap: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1 },
  card: { flex: 1 },
  detail: { minHeight: 112 },
  line: { borderRadius: RADIUS.sm, width: "85%", height: 8 },
  title: { height: 12 },
  short: { width: "33%" },
  media: { borderRadius: RADIUS.md, height: 62 },
});
