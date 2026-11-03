import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Card from "../ui/Card";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

export default function WorkOrderPager({ pages = [], currentPage = 0, onChange }) {
  const { language, t } = useInterfaceLanguage();
  if (!pages.length) return null;
  const atStart = currentPage <= 0;
  const atEnd = currentPage >= pages.length - 1;

  return (
    <Card style={{ padding: SPACING.md, marginBottom: 0 }}>
      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, textAlign: "center" }}>
        {t("Step")} {currentPage + 1} {language === "Filipino" ? "sa" : "of"} {pages.length} · {t(pages[currentPage]?.label || "")}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: SPACING.xs, marginTop: SPACING.sm, marginBottom: SPACING.md }}>
        {pages.map((page, index) => <View key={page.key} style={{ width: index === currentPage ? 18 : 8, height: 8, borderRadius: RADIUS.full, backgroundColor: index === currentPage ? COLORS.tech : COLORS.borderInput }} />)}
      </View>
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("Previous")} accessibilityState={{ disabled: atStart }} disabled={atStart} onPress={() => onChange(currentPage - 1)} style={{ flex: 1, minWidth: 0, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.md, borderWidth: 1, borderColor: atStart ? COLORS.border : COLORS.tech, backgroundColor: COLORS.surface }}>
          <Text style={{ color: atStart ? COLORS.textSecondary : COLORS.tech, fontWeight: FONT.black, textAlign: "center" }}>{t("Previous")}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("Next")} accessibilityState={{ disabled: atEnd }} disabled={atEnd} onPress={() => onChange(currentPage + 1)} style={{ flex: 1, minWidth: 0, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.md, backgroundColor: atEnd ? COLORS.surfaceAlt : COLORS.tech, borderWidth: 1, borderColor: atEnd ? COLORS.border : COLORS.tech }}>
          <Text style={{ color: atEnd ? COLORS.textSecondary : COLORS.surface, fontWeight: FONT.black, textAlign: "center" }}>{t("Next")}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}
