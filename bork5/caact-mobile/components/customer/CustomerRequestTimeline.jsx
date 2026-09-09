import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../constants/theme";

export default function CustomerRequestTimeline({ events = [], formatDateTime, color = COLORS.primary }) {
  const [visibleCount, setVisibleCount] = useState(3);
  const sorted = [...events].sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
  return <View style={{ marginTop: 16, borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 16 }}>
    <Text accessibilityRole="header" style={{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 16 }}>Request activity</Text>
    <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 8 }}>Latest updates first</Text>
    {sorted.length ? sorted.slice(0, visibleCount).map((event, index) => <View key={event.id || `${event.title}-${event.timestamp}-${index}`} style={{ flexDirection: "row", gap: 10 }}>
      <View style={{ width: 12, alignItems: "center" }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginTop: 6 }} />
        {index < Math.min(visibleCount, sorted.length) - 1 ? <View style={{ width: 1, flex: 1, backgroundColor: COLORS.border, marginTop: 4 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: 14 }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" }}>{event.title || "Request updated"}</Text>
        {event.description ? <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 3 }}>{event.description}</Text> : null}
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 4 }}>{[event.actor, formatDateTime(event.timestamp)].filter(Boolean).join(" · ")}</Text>
      </View>
    </View>) : <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>The request was submitted. Further updates will appear here.</Text>}
    {visibleCount < sorted.length ? <TouchableOpacity accessibilityRole="button" onPress={() => setVisibleCount(count => count + 3)} style={{ padding: 12, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: "center" }}><Text style={{ color: COLORS.primary, fontWeight: "600", fontSize: 13 }}>Show earlier updates ({sorted.length - visibleCount})</Text></TouchableOpacity> : null}
    {visibleCount > 3 && sorted.length > 3 ? <TouchableOpacity accessibilityRole="button" onPress={() => setVisibleCount(3)} style={{ padding: 12, alignItems: "center" }}><Text style={{ color: COLORS.primary, fontSize: 13 }}>Show latest only</Text></TouchableOpacity> : null}
  </View>;
}
