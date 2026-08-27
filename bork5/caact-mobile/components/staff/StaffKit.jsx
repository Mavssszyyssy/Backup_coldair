import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

export const STAFF_ACCENT = "#0F766E";
export const STAFF_ACCENT_LIGHT = "#CCFBF1";

export function StaffShell({ title, subtitle, modules, activeModule, onModuleChange, onRefresh, refreshing, children }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, flexDirection: wide ? "row" : "column" }}>
        <View style={{ backgroundColor: "#0F172A", padding: SPACING.md, width: wide ? 236 : "100%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: wide ? SPACING.lg : SPACING.sm }}>
            <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: STAFF_ACCENT, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
              <Ionicons name="snow-sharp" size={23} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFF", fontWeight: FONT.black, fontSize: FONT.lg }}>Cold Air Operations</Text>
              <Text style={{ color: "#94A3B8", fontSize: FONT.sm }}>Unified Expo workspace</Text>
            </View>
          </View>
          <ScrollView horizontal={!wide} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.xs, flexDirection: wide ? "column" : "row" }}>
            {modules.map((module) => {
              const active = activeModule === module.key;
              return (
                <TouchableOpacity key={module.key} onPress={() => onModuleChange(module.key)} style={{ minHeight: 44, minWidth: wide ? "100%" : 100, flexDirection: "row", alignItems: "center", justifyContent: wide ? "flex-start" : "center", borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm + 4, backgroundColor: active ? STAFF_ACCENT : "transparent" }}>
                  <Ionicons name={module.icon} size={18} color={active ? "#FFF" : "#94A3B8"} />
                  <Text style={{ color: active ? "#FFF" : "#CBD5E1", fontWeight: active ? FONT.black : FONT.bold, marginLeft: 7, fontSize: FONT.sm }}>{module.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ width: "100%", maxWidth: 1180, alignSelf: "center", padding: wide ? SPACING.lg : SPACING.md, paddingBottom: 80 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.textPrimary, fontSize: wide ? 30 : FONT.xxl, fontWeight: FONT.black }}>{title}</Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 }}>{subtitle}</Text>
            </View>
            {!!onRefresh && (
              <TouchableOpacity disabled={refreshing} onPress={onRefresh} accessibilityLabel="Refresh current module" style={{ width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", opacity: refreshing ? 0.55 : 1 }}>
                <Ionicons name="refresh-sharp" size={20} color={STAFF_ACCENT} />
              </TouchableOpacity>
            )}
          </View>
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function StaffHero({ eyebrow, title, subtitle, icon = "analytics-sharp" }) {
  return (
    <View style={{ backgroundColor: STAFF_ACCENT, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, overflow: "hidden" }}>
      <View style={{ position: "absolute", width: 170, height: 170, borderRadius: 85, right: -42, top: -70, backgroundColor: "rgba(255,255,255,0.1)" }} />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 54, height: 54, borderRadius: RADIUS.lg, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginRight: SPACING.md }}>
          <Ionicons name={icon} size={28} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#99F6E4", fontSize: FONT.sm, fontWeight: FONT.black }}>{eyebrow}</Text>
          <Text style={{ color: "#FFF", fontSize: FONT.xl, fontWeight: FONT.black, marginTop: 2 }}>{title}</Text>
          <Text style={{ color: "#CCFBF1", marginTop: 4, lineHeight: 20 }}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

export function StaffGrid({ children }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.md }}>{children}</View>;
}

export function StaffStat({ label, value, icon = "analytics-sharp", color = STAFF_ACCENT }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 150, minWidth: 145, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md }}>
      <View style={{ width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: `${color}14`, alignItems: "center", justifyContent: "center", marginBottom: SPACING.sm }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ color: COLORS.textPrimary, fontSize: FONT.xl, fontWeight: FONT.black }}>{value ?? 0}</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export function StaffSection({ title, subtitle, icon = "list-sharp", right, children, tone = "default" }) {
  const background = tone === "accent" ? STAFF_ACCENT_LIGHT : COLORS.surface;
  return (
    <View style={{ backgroundColor: background, borderWidth: 1, borderColor: tone === "accent" ? "#99F6E4" : COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.md }}>
        <View style={{ width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: tone === "accent" ? COLORS.surface : STAFF_ACCENT_LIGHT, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
          <Ionicons name={icon} size={21} color={STAFF_ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>{title}</Text>
          {!!subtitle && <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{subtitle}</Text>}
        </View>
        {right ?? null}
      </View>
      {children}
    </View>
  );
}

export function StaffDataRow({ title, subtitle, meta, status, statusColor = STAFF_ACCENT, children }) {
  return (
    <View style={{ backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm + 4, marginBottom: SPACING.sm }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, lineHeight: 20 }}>{title}</Text>
          {!!subtitle && <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 3, lineHeight: 18 }}>{subtitle}</Text>}
          {!!meta && <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 4 }}>{meta}</Text>}
        </View>
        {!!status && <View style={{ backgroundColor: `${statusColor}16`, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 5, marginLeft: SPACING.sm }}><Text style={{ color: statusColor, fontSize: FONT.sm, fontWeight: FONT.black }}>{status}</Text></View>}
      </View>
      {children ? <View style={{ marginTop: SPACING.sm }}>{children}</View> : null}
    </View>
  );
}

export function StaffPager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, marginTop: SPACING.sm }}>
      <TouchableOpacity disabled={page <= 1} onPress={() => onChange(page - 1)} style={{ minHeight: 40, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", opacity: page <= 1 ? 0.4 : 1 }}><Text style={{ color: STAFF_ACCENT, fontWeight: FONT.bold }}>Previous</Text></TouchableOpacity>
      <Text style={{ color: COLORS.textSecondary, fontWeight: FONT.bold }}>Page {page} of {totalPages}</Text>
      <TouchableOpacity disabled={page >= totalPages} onPress={() => onChange(page + 1)} style={{ minHeight: 40, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, backgroundColor: STAFF_ACCENT, alignItems: "center", justifyContent: "center", opacity: page >= totalPages ? 0.4 : 1 }}><Text style={{ color: "#FFF", fontWeight: FONT.bold }}>Next</Text></TouchableOpacity>
    </View>
  );
}

export function StaffMessage({ error, loading, empty, emptyText = "No records found." }) {
  if (loading) return <Text style={{ color: COLORS.textSecondary, paddingVertical: SPACING.md }}>Loading current records…</Text>;
  if (error) return <Text style={{ color: COLORS.danger, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md, padding: SPACING.md }}>{error}</Text>;
  if (empty) return <Text style={{ color: COLORS.textSecondary, textAlign: "center", padding: SPACING.lg }}>{emptyText}</Text>;
  return null;
}
