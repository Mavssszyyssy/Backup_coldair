import React, { useState } from "react";
import { Alert, Image, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";
import legal from "../../constants/legalPolicies.json";
import { LEGAL_DOCUMENTS } from "../../services/legalConsent";

export function LegalDocument({ policy, onClose }) {
  return <SafeAreaView style={{ flex: 1, width: "100%", maxWidth: 680, alignSelf: "center", backgroundColor: COLORS.surface }}>
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: COLORS.border, flexDirection: "row", gap: 12, alignItems: "center" }}>
      <Image source={require("../../assets/coldair-app-icon.png")} accessibilityLabel="Cold Air logo" style={{ width: 40, height: 40, borderRadius: 10 }} />
      <View style={{ flex: 1 }}><Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>Cold Air ACT</Text><Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Terms & Privacy</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to signup" onPress={onClose} style={{ padding: 12 }}><Text style={{ color: COLORS.primary, fontWeight: "700" }}>Close</Text></TouchableOpacity>
    </View>
    <ScrollView key={policy.id} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>{policy.category}</Text>
      <Text accessibilityRole="header" style={{ color: COLORS.textPrimary, fontSize: 25, fontWeight: "700", lineHeight: 32 }}>{policy.title}</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginVertical: 12 }}>Last updated: {legal.lastUpdated}</Text>
      <Text style={{ color: COLORS.textPrimary, lineHeight: 23, fontSize: 15 }}>{policy.summary}</Text>
      {policy.notice ? <View style={{ backgroundColor: COLORS.primaryLight, borderLeftWidth: 3, borderColor: COLORS.primary, padding: 14, borderRadius: 8, marginTop: 16 }}><Text style={{ color: COLORS.textPrimary, lineHeight: 21, fontSize: 14 }}>{policy.notice}</Text></View> : null}
      {policy.sections.map(section => <View key={section.id} style={{ marginTop: 24 }}>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "700", lineHeight: 24, color: COLORS.textPrimary }}>{section.title}</Text>
        {(section.paragraphs || []).map((paragraph, i) => <Text key={i} style={{ color: COLORS.textPrimary, lineHeight: 23, fontSize: 14, marginTop: 10 }}>{paragraph}</Text>)}
        {(section.bullets || []).map((bullet, i) => <View key={i} style={{ flexDirection: "row", gap: 8, marginTop: 10 }}><Text style={{ color: COLORS.primary }}>•</Text><Text style={{ flex: 1, color: COLORS.textPrimary, fontSize: 14, lineHeight: 23 }}>{bullet}</Text></View>)}
        {(section.links || []).map(link => <TouchableOpacity key={link.href} accessibilityRole="link" onPress={() => Linking.openURL(link.href).catch(() => Alert.alert("Link unavailable", "Please try opening this reference later."))} style={{ paddingVertical: 12 }}><Text style={{ color: COLORS.primary, textDecorationLine: "underline", lineHeight: 21 }}>{link.label}</Text></TouchableOpacity>)}
      </View>)}
      <TouchableOpacity accessibilityRole="button" onPress={onClose} style={{ backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 28 }}><Text style={{ color: COLORS.surface, fontWeight: "700" }}>Return to signup</Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}

export default function MobileLegalConsent({ value, onChange, showErrors = false, disabled = false }) {
  const [policyId, setPolicyId] = useState(null);
  const missing = LEGAL_DOCUMENTS.filter(({ id }) => value?.[id] !== true);
  const completePolicyReview = () => {
    if (policyId && !disabled) onChange({ ...value, [policyId]: true });
    setPolicyId(null);
  };
  return <View style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, marginBottom: 16 }}>
    <Text accessibilityRole="header" style={{ fontSize: 19, color: COLORS.textPrimary, fontWeight: "700" }}>Terms & Privacy</Text>
    <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 6 }}>Review each document. Closing it marks that review complete automatically. Privacy acknowledgment is separate from the terms.</Text>
    {showErrors && missing.length ? <Text accessibilityRole="alert" style={{ color: COLORS.danger, marginTop: 12, lineHeight: 20 }}>Please complete {missing.length} remaining required {missing.length === 1 ? "acknowledgment" : "acknowledgments"}.</Text> : null}
    {LEGAL_DOCUMENTS.map(doc => <View key={doc.id} style={{ borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 12, marginTop: 12 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Read ${doc.title}`} onPress={() => setPolicyId(doc.id)} style={{ flexDirection: "row", gap: 12, justifyContent: "space-between", alignItems: "center", minHeight: 44 }}><Text style={{ flex: 1, fontSize: 14, fontWeight: "700", lineHeight: 20, color: COLORS.textPrimary }}>{doc.title}</Text><Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>Read ›</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={doc.action} accessibilityState={{ checked: value?.[doc.id] === true, disabled }} disabled={disabled} onPress={() => onChange({ ...value, [doc.id]: value?.[doc.id] !== true })} style={{ flexDirection: "row", gap: 10, alignItems: "center", minHeight: 44, paddingVertical: 8 }}>
        <View style={{ width: 22, height: 22, borderWidth: 1.5, borderColor: showErrors && value?.[doc.id] !== true ? COLORS.danger : COLORS.primary, borderRadius: 5, backgroundColor: value?.[doc.id] === true ? COLORS.primary : COLORS.surface, alignItems: "center", justifyContent: "center" }}><Text style={{ color: COLORS.surface, fontWeight: "700" }}>{value?.[doc.id] === true ? "✓" : ""}</Text></View>
        <Text style={{ flex: 1, color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 }}>{doc.action}</Text>
      </TouchableOpacity>
    </View>)}
    {policyId ? <Modal visible animationType="slide" onRequestClose={completePolicyReview}><LegalDocument policy={legal.policies[policyId]} onClose={completePolicyReview} /></Modal> : null}
  </View>;
}
