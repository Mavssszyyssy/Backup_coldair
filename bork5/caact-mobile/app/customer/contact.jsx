import { Linking, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import CustomerScreen from "../../components/customer/CustomerScreen";
import CustomerSectionHeader from "../../components/customer/CustomerSectionHeader";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import {
  COLD_AIR_WEBSITE,
  COMPANY_BRANCHES,
  COMPANY_CONTACT,
} from "../../constants/company";
import { COLORS, FONT, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";

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
  const { current } = useUserContext();
  const assignedBranch = String(
    current?.activeBranch || current?.assignedBranch || current?.branch || "",
  ).trim();
  const branchLabel = assignedBranch || "your assigned service branch";

  return (
    <CustomerScreen
      title="Contact"
      subtitle="Reach Cold Air ACT by phone, email, Messenger, or branch visit"
    >
      <Card>
        <CustomerSectionHeader title="Branch and Technician Assistance" />
        <View style={{ padding: SPACING.md, borderRadius: 12, backgroundColor: COLORS.primaryLight, marginBottom: SPACING.md }}>
          <Text style={{ color: COLORS.primary, fontSize: FONT.sm, fontWeight: FONT.black, textTransform: "uppercase", letterSpacing: 0.5 }}>Assigned branch</Text>
          <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginTop: 4 }}>{branchLabel}</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19, marginTop: 5 }}>Branch concerns are handled through Cold Air ACT’s official support channels so your request can be tracked and routed correctly.</Text>
        </View>
        <Button
          title={`Contact ${assignedBranch || "Branch"} Desk`}
          onPress={() => Linking.openURL(contactEmailLink(`Branch assistance: ${branchLabel}`, `Hello Cold Air ACT, I need assistance from ${branchLabel}.\n\nOrder or unit reference: \nConcern: `))}
        />
        <View style={{ height: SPACING.sm }} />
        <Button
          title="Contact Assigned Technician"
          variant="secondary"
          onPress={() => Linking.openURL(contactEmailLink("Message for assigned technician", "Hello Cold Air ACT, please relay this message to my assigned technician.\n\nOrder or unit reference: \nMessage: "))}
        />
        <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, lineHeight: 18, marginTop: SPACING.sm }}>For privacy and safety, technicians’ personal phone numbers and email addresses are not displayed. The service desk relays messages through the official work order.</Text>
        <View style={{ marginTop: SPACING.md }}>
          <ContactRow label={`${assignedBranch || "Branch"} desk email`} value={COMPANY_CONTACT.supportEmail} href={contactEmailLink(`Branch assistance: ${branchLabel}`)} />
          <ContactRow label="Official service hotline" value={COMPANY_CONTACT.hotline} href={`tel:${COMPANY_CONTACT.hotline.replace(/\s+/g, "")}`} />
        </View>
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
