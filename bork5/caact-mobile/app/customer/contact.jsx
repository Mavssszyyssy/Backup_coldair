import { Linking, Text, TouchableOpacity, View } from "react-native";

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
  return (
    <CustomerScreen
      title="Contact"
      subtitle="Reach Cold Air ACT by phone, email, Messenger, or branch visit"
    >
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
          </View>
        ))}
      </Card>
    </CustomerScreen>
  );
}
