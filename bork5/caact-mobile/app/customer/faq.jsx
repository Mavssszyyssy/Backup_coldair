import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";

import CustomerScreen from "../../components/customer/CustomerScreen";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { COMPANY_CONTACT } from "../../constants/company";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";

const FAQ_ITEMS = [
  {
    id: "delivery",
    question: "How long does AC delivery take after ordering?",
    answer:
      "Most in-stock units are scheduled within 24 to 48 hours after payment verification and branch allocation. We work to provide the fastest delivery service in the region.",
  },
  {
    id: "reschedule",
    question: "Can I reschedule my installation appointment?",
    answer:
      "Yes. Open your registered unit in My Units to manage its appointment. Please reschedule at least 12 hours before the original time slot.",
  },
  {
    id: "warranty",
    question: "Do you provide warranty service for all brands?",
    answer:
      "Cold Air ACT provides warranty support for the brands we carry. Your registered unit shows the coverage details that apply to its model.",
  },
  {
    id: "payment",
    question: "What payment methods are supported?",
    answer:
      "Available checkout methods may include Cash on Delivery, GCash, credit or debit cards, and Pay on Installation for eligible services. Your available choices are shown during checkout.",
  },
  {
    id: "registration",
    question: "How do I register my unit for warranty?",
    answer:
      "After installation, scan the technician-provided QR code or add the unit serial number in My Units. Registration must be completed before warranty details are available.",
  },
];

function openLink(url) {
  Linking.openURL(url).catch(() => {});
}

export default function CustomerFaqScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const visibleFaqs = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return FAQ_ITEMS;
    return FAQ_ITEMS.filter((item) =>
      `${item.question} ${item.answer}`.toLowerCase().includes(search),
    );
  }, [query]);

  return (
    <CustomerScreen
      title="Help Center"
      subtitle="Quick answers and customer support"
    >
      <Card style={{ backgroundColor: COLORS.primaryLight, borderColor: "#BFDBFE" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary }}>
            <Ionicons name="help-buoy-sharp" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>How can we help?</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT.base, marginTop: 2 }}>Search common questions or reach our team directly.</Text>
          </View>
        </View>
      </Card>

      <View style={{ position: "relative", marginBottom: SPACING.md }}>
        <Ionicons name="search-sharp" size={20} color={COLORS.textMuted} style={{ position: "absolute", left: 14, top: 14, zIndex: 1 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search delivery, warranty, payment..."
          placeholderTextColor={COLORS.textMuted}
          accessibilityLabel="Search frequently asked questions"
          style={{ backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderInput, paddingLeft: 44, paddingRight: 42, paddingVertical: 13, color: COLORS.textPrimary, fontSize: FONT.base }}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear FAQ search" hitSlop={12} style={{ position: "absolute", right: 12, top: 12 }}>
            <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: SPACING.sm, marginBottom: SPACING.md }}>
        {visibleFaqs.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <Card key={item.id} style={{ marginBottom: 0, padding: 0, overflow: "hidden" }}>
              <Pressable
                onPress={() => setExpandedId(expanded ? null : item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${expanded ? "Collapse" : "Expand"} question: ${item.question}`}
                accessibilityState={{ expanded }}
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", padding: SPACING.md }, pressed && { backgroundColor: COLORS.surfaceAlt }]}
              >
                <View style={{ width: 30, height: 30, borderRadius: RADIUS.full, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primaryLight, marginRight: SPACING.sm }}>
                  <Ionicons name="help-sharp" size={16} color={COLORS.primary} />
                </View>
                <Text style={{ flex: 1, color: COLORS.textPrimary, fontSize: FONT.base, fontWeight: FONT.bold, lineHeight: 20 }}>{item.question}</Text>
                <Ionicons name={expanded ? "chevron-up-sharp" : "chevron-down-sharp"} size={20} color={COLORS.primary} style={{ marginLeft: SPACING.sm }} />
              </Pressable>
              {expanded ? (
                <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.md, paddingLeft: 54, paddingTop: SPACING.sm, paddingBottom: SPACING.md }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: FONT.base, lineHeight: 21 }}>{item.answer}</Text>
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>

      {visibleFaqs.length === 0 ? (
        <Card style={{ alignItems: "center" }}>
          <Ionicons name="search-outline" size={34} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textPrimary, fontSize: FONT.md, fontWeight: FONT.bold, marginTop: SPACING.sm }}>No matching answer found</Text>
          <Text style={{ color: COLORS.textSecondary, textAlign: "center", lineHeight: 20, marginTop: 4 }}>Contact our support team and we will help you with your concern.</Text>
        </Card>
      ) : null}

      <Card style={{ borderStyle: "dashed", borderColor: "#93C5FD", backgroundColor: COLORS.surfaceAlt }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>Still have questions?</Text>
        <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: 4, marginBottom: SPACING.sm }}>Our customer-service team is ready to assist you.</Text>
        <Button title="Contact Support" onPress={() => router.push("/customer/contact")} leftIcon={<Ionicons name="chatbubble-ellipses-sharp" size={18} color="#FFFFFF" />} />
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Pressable onPress={() => openLink(`tel:${COMPANY_CONTACT.hotline.replace(/\s+/g, "")}`)} accessibilityRole="button" accessibilityLabel="Call customer support" style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 42, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md }, pressed && { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="call-sharp" size={17} color={COLORS.primary} />
            <Text style={{ color: COLORS.primary, fontWeight: FONT.bold }}>Call</Text>
          </Pressable>
          <Pressable onPress={() => openLink(`mailto:${COMPANY_CONTACT.supportEmail}`)} accessibilityRole="button" accessibilityLabel="Email customer support" style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 42, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md }, pressed && { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="mail-sharp" size={17} color={COLORS.primary} />
            <Text style={{ color: COLORS.primary, fontWeight: FONT.bold }}>Email</Text>
          </Pressable>
          <Pressable onPress={() => openLink(`https://${COMPANY_CONTACT.messengerHandle}`)} accessibilityRole="button" accessibilityLabel="Open Cold Air ACT Messenger" style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 42, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md }, pressed && { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="chatbubbles-sharp" size={17} color={COLORS.primary} />
            <Text style={{ color: COLORS.primary, fontWeight: FONT.bold }}>Chat</Text>
          </Pressable>
        </View>
      </Card>
    </CustomerScreen>
  );
}
