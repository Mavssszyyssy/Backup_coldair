import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

export function PageControls({ page, total, onChange, label = "Records" }) {
  const { t } = useInterfaceLanguage();
  return <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: SPACING.sm }}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${label}: ${t("Previous page")}`} disabled={page === 0} onPress={() => onChange(page - 1)} style={{ padding: 12, opacity: page === 0 ? 0.4 : 1 }}><Text style={{ color: COLORS.tech }}>{t("Previous")}</Text></TouchableOpacity>
    <View style={{ flex: 1, alignItems: "center" }}><Text style={{ color: COLORS.textSecondary, fontSize: 11, textAlign: "center" }}>{t(label)}</Text><Text accessibilityLiveRegion="polite" style={{ color: COLORS.textPrimary }}>{t("Page")} {page + 1} {t("of")} {Math.max(1, total)}</Text></View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${label}: ${t("Next page")}`} disabled={page >= total - 1} onPress={() => onChange(page + 1)} style={{ padding: 12, opacity: page >= total - 1 ? 0.4 : 1 }}><Text style={{ color: COLORS.tech }}>{t("Next")}</Text></TouchableOpacity>
  </View>;
}

export default function PagedItems({ items = [], pageSize = 3, renderItem, label = "Records", controlsPosition = "bottom" }) {
  const [index, setIndex] = useState(0);
  const total = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(index, total - 1);
  return <View>
    {total > 1 && controlsPosition === "top" ? <PageControls page={page} total={total} onChange={setIndex} label={label} /> : null}
    {items.slice(page * pageSize, (page + 1) * pageSize).map((item, offset) => renderItem(item, page * pageSize + offset))}
    {total > 1 && controlsPosition !== "top" ? <PageControls page={page} total={total} onChange={setIndex} label={label} /> : null}
  </View>;
}
