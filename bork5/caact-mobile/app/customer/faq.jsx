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
    id: "ordering",
    category: "Ordering",
    question: "How do I place an AC unit order?",
    answer:
      "Choose an available AC unit in Shop, add it to your cart, provide a delivery address, choose a payment method, then review and submit the order. The assigned branch and current stock are confirmed by the system.",
  },
  {
    id: "payments",
    category: "Payments",
    question: "What payment methods are supported?",
    answer:
      "Available checkout methods may include GCash, credit or debit cards, Cash on Delivery, and Pay on Installation for eligible orders. Only a confirmed payment changes a paid order status.",
  },
  {
    id: "payment-status",
    category: "Payments",
    question: "Why is my payment still pending?",
    answer:
      "Keep the payment page open until the provider confirms the result. Your order updates after secure payment confirmation. If it remains pending, open the order receipt or contact support before trying again.",
  },
  {
    id: "delivery",
    category: "Delivery",
    question: "How can I track delivery and installation?",
    answer:
      "Open Orders to see the live timeline: Order Placed, Confirmed, Preparing, Dispatched, Out for Delivery, Arrived, Installation, and Completed. Only stages that apply to your order are shown.",
  },
  {
    id: "installation",
    category: "Installation",
    question: "What happens during installation?",
    answer:
      "A technician verifies the assigned AC QR code, records the installation details and evidence, then completes the work. Your unit is added to My Units and warranty coverage activates when applicable.",
  },
  {
    id: "reschedule",
    category: "Installation",
    question: "Can I reschedule an installation or technician visit?",
    answer:
      "Use the service or order details to request a new preferred date. Submit the request before the scheduled visit where possible; branch availability and technician assignment determine the final time slot.",
  },
  {
    id: "warranty",
    category: "Warranty",
    question: "Where can I see my warranty coverage?",
    answer:
      "Open My Units and select the registered AC. The unit record shows the warranty type, activation and expiration dates, covered components, and any claim or service history.",
  },
  {
    id: "maintenance",
    category: "Maintenance",
    question: "How do I request maintenance or repair?",
    answer:
      "Go to Services, select your registered AC, choose the service type, describe the concern, and select a future preferred date. You will be notified when the request is reviewed or assigned.",
  },
  {
    id: "amp-maintenance",
    category: "AMP",
    question: "What does Best Serviced By mean?",
    answer:
      "Best Serviced By is a preventive-maintenance date calculated from recorded service history for comparable AC units. It is planning guidance and does not replace an on-site technician inspection.",
  },
  {
    id: "qr-scanning",
    category: "QR & Unit Records",
    question: "What is the QR code on my AC unit for?",
    answer:
      "The QR code securely identifies the specific unit for delivery, installation, warranty, maintenance, and technician service history. It is not your product model or physical serial number.",
  },
  {
    id: "technician-visit",
    category: "Technician Visits",
    question: "What should I prepare for a technician visit?",
    answer:
      "Ensure someone can provide access to the installation area, keep the unit QR label available, and share any site restrictions or concerns in your service request. Technicians only receive the details needed for service.",
  },
  {
    id: "cancel-refund",
    category: "Orders",
    question: "How do cancellation and refunds work?",
    answer:
      "Cancellation eligibility depends on the current order stage. Request cancellation through the order details or support. Approved refunds follow the original payment method and provider processing times.",
  },
  {
    id: "ac-concerns",
    category: "Common AC Concerns",
    question: "My AC is leaking, noisy, or not cooling. What should I do?",
    answer:
      "Turn the unit off if you notice an electrical smell, smoke, or leaking near electrical parts. For normal cooling, noise, or drainage concerns, create a service request and include clear symptoms and photos when available.",
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
      title="FAQ & Help"
      subtitle="Answers for orders, AC care, and service"
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
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.primary, fontSize: FONT.sm, fontWeight: FONT.black, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>{item.category}</Text>
                  <Text style={{ color: COLORS.textPrimary, fontSize: FONT.base, fontWeight: FONT.bold, lineHeight: 20 }}>{item.question}</Text>
                </View>
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
