import { useState } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import CustomerScreen from "../../components/customer/CustomerScreen";
import CustomerSectionHeader from "../../components/customer/CustomerSectionHeader";
import Button from "../../components/ui/Button";
import BottomSheetSelect from "../../components/ui/BottomSheetSelect";
import Card from "../../components/ui/Card";
import TextField from "../../components/ui/TextField";
import {
  COLD_AIR_WEBSITE,
  COMPANY_BRANCHES,
  COMPANY_CONTACT,
} from "../../constants/company";
import { COLORS, FONT, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { createContactMessage } from "../../services/api";

const CONTACT_CATEGORIES = [
  { id: "general", name: "General question" },
  { id: "product", name: "Product question" },
  { id: "order", name: "Help with an order" },
  { id: "service", name: "Service or repair" },
  { id: "warranty", name: "Warranty concern" },
  { id: "consultation", name: "Request an appointment" },
  { id: "other", name: "Other concern" },
];

const customerName = (user = {}) =>
  user.name || `${user.name_first || ""} ${user.name_last || ""}`.trim() || "Customer";

const newRequestKey = () => `mobile-contact-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const contactEmailLink = (subject, body = "") =>
  `mailto:${COMPANY_CONTACT.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

function ContactRow({ label, value, href }) {
  return (
    <TouchableOpacity
      disabled={!href}
      onPress={() => {
        if (href) Linking.openURL(href);
      }}
      activeOpacity={href ? 0.75 : 1}
      style={{ marginBottom: SPACING.sm }}
    >
      <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>
        {label}
      </Text>
      <Text
        style={{
          color: href ? COLORS.primary : COLORS.textPrimary,
          fontSize: FONT.base,
          fontWeight: href ? FONT.bold : "500",
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </TouchableOpacity>
  );
}

export default function CustomerContactScreen() {
  const router = useRouter();
  const { current, token } = useUserContext();
  const [category, setCategory] = useState(CONTACT_CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [requestKey, setRequestKey] = useState(newRequestKey);
  const assignedBranch = String(
    current?.activeBranch || current?.assignedBranch || current?.branch || "",
  ).trim();
  const branchLabel = assignedBranch || "your assigned service branch";

  const submitMessage = async () => {
    setError("");
    setConfirmation(null);
    if (!subject.trim()) return setError("Add a short subject for your message.");
    if (message.trim().length < 10) return setError("Please add a little more detail so our team can help.");
    if (!token) return setError("Please sign in again before sending your message.");
    setSubmitting(true);
    try {
      const result = await createContactMessage(token, {
        category: category.id,
        subject: subject.trim(),
        message: message.trim(),
        customerName: customerName(current),
        email: current?.email || "",
        phone: current?.phone || "",
        source: "mobile",
        idempotencyKey: requestKey,
      });
      if (!result.success) return setError(result.error);
      setConfirmation(result.message);
      setSubject("");
      setMessage("");
      setCategory(CONTACT_CATEGORIES[0]);
      setRequestKey(newRequestKey());
    } catch (requestError) {
      setError(requestError?.message || "Unable to send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const prepareMessage = (nextCategory, nextSubject) => {
    setCategory(CONTACT_CATEGORIES.find((item) => item.id === nextCategory) || CONTACT_CATEGORIES[0]);
    setSubject(nextSubject);
    setError("");
    setConfirmation(null);
  };

  return (
    <CustomerScreen
      title="Contact"
      subtitle="Send a tracked message to the Cold Air ACT support team"
    >
      <Card>
        <CustomerSectionHeader title="Send a Support Message" />
        <View style={{ padding: SPACING.md, borderRadius: 12, backgroundColor: COLORS.primaryLight, marginBottom: SPACING.md }}>
          <Text style={{ color: COLORS.primary, fontSize: FONT.sm, fontWeight: FONT.black, textTransform: "uppercase", letterSpacing: 0.5 }}>Support routing</Text>
          <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginTop: 4 }}>{branchLabel}</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19, marginTop: 5 }}>Your message is saved, routed to the responsible Admin, and also visible to SuperAdmin.</Text>
        </View>

        {confirmation ? (
          <View style={{ padding: SPACING.md, borderRadius: 12, backgroundColor: COLORS.successLight, marginBottom: SPACING.md }}>
            <Text style={{ color: COLORS.success, fontWeight: FONT.black }}>Message sent successfully</Text>
            <Text style={{ color: COLORS.textPrimary, marginTop: 5, lineHeight: 20 }}>Reference: {confirmation.ticketCode}</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 3, lineHeight: 19 }}>We will notify you here when support replies.</Text>
          </View>
        ) : null}
        {error ? <Text style={{ color: COLORS.danger, marginBottom: SPACING.sm, lineHeight: 19 }}>{error}</Text> : null}

        <BottomSheetSelect
          label="What can we help with?"
          value={category.name}
          items={CONTACT_CATEGORIES}
          searchPlaceholder="Search support topics"
          onSelect={setCategory}
        />
        <TextField label="Subject" value={subject} onChangeText={(value) => { setSubject(value); setError(""); }} placeholder="Briefly describe what you need" maxLength={160} />
        <TextField label="Message" value={message} onChangeText={(value) => { setMessage(value); setError(""); }} placeholder="Include any order number, AC model, or other helpful details." multiline numberOfLines={6} textAlignVertical="top" maxLength={3000} style={{ minHeight: 130 }} />
        <Button
          title="Send to Support"
          loading={submitting}
          onPress={submitMessage}
        />
        <View style={{ height: SPACING.sm }} />
        <Button
          title="Prepare a Service Message"
          variant="secondary"
          onPress={() => prepareMessage("service", "Help with my service or assigned technician")}
        />
        <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, lineHeight: 18, marginTop: SPACING.sm }}>For privacy and safety, technician messages are relayed through the official support team and work order.</Text>
        <View style={{ height: SPACING.sm }} />
        <Button title="View My Orders" variant="ghost" onPress={() => router.push("/customer/orders")} />
      </Card>

      <Card>
        <CustomerSectionHeader title="Contact Channels" />
        <ContactRow label="Support Email" value={COMPANY_CONTACT.supportEmail} href={`mailto:${COMPANY_CONTACT.supportEmail}`} />
        <ContactRow label="Sales Email" value={COMPANY_CONTACT.salesEmail} href={`mailto:${COMPANY_CONTACT.salesEmail}`} />
        <ContactRow label="Hotline" value={COMPANY_CONTACT.hotline} href={`tel:${COMPANY_CONTACT.hotline.replace(/\s+/g, "")}`} />
        <ContactRow label="Landline" value={COMPANY_CONTACT.landline} />
        <ContactRow label="Messenger" value={COMPANY_CONTACT.messengerHandle} href={`https://${COMPANY_CONTACT.messengerHandle}`} />
        <Button
          title="Open Website"
          variant="secondary"
          onPress={() => Linking.openURL(COLD_AIR_WEBSITE)}
        />
      </Card>

      <Card>
        <CustomerSectionHeader title="Branches and Map Codes" />
        {COMPANY_BRANCHES.map((branch) => (
          <View
            key={branch.id}
            style={{
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              paddingVertical: SPACING.sm,
            }}
          >
            <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>
              {branch.name}
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 2 }}>
              {branch.address}
            </Text>
            <Text style={{ color: COLORS.primary, marginTop: 4 }}>
              {branch.plusCode}
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 4 }}>
              Official hotline: {COMPANY_CONTACT.hotline}
            </Text>
          </View>
        ))}
      </Card>
    </CustomerScreen>
  );
}
