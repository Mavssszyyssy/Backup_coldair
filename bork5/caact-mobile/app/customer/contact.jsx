import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

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
import { createContactMessage, getMyContactMessage, getMyContactMessages } from "../../services/api";
import { startLiveRefresh } from "../../services/liveRefresh";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

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
const MESSAGE_LIMIT = 3000;
const mergeMessages = (existing, incoming) => {
  const byId = new Map([...existing, ...incoming].map((item) => [String(item.id || item._id), item]));
  return [...byId.values()].sort((left, right) =>
    String(right.createdAt || "").localeCompare(String(left.createdAt || "")) ||
    String(right.id || right._id).localeCompare(String(left.id || left._id)));
};

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

function SupportMessage({ item, focused = false, expanded = false, onToggle, t }) {
  if (!item) return null;
  const previousReplies = (item.timeline || []).filter((event) => event.actorId && event.note &&
    event.note !== "Message received from customer." && !String(event.note).startsWith("Status changed to "));
  return (
    <View style={{
      paddingVertical: SPACING.md,
      borderTopWidth: focused ? 0 : 1,
      borderTopColor: COLORS.border,
      borderLeftWidth: focused ? 3 : 0,
      borderLeftColor: COLORS.primary,
      paddingLeft: focused ? SPACING.sm : 0,
    }}>
      {onToggle ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t("Conversation details")}: ${item.subject}`} onPress={onToggle}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>{item.subject} {expanded ? "▴" : "▾"}</Text>
      </TouchableOpacity> : <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>{item.subject}</Text>}
      <Text style={{ color: COLORS.primary, marginTop: 3 }}>{t('Reference')} {item.ticketCode} · {t(String(item.status || 'new').replace(/_/g, ' '))}</Text>
      {expanded ? <>
      <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{item.message}</Text>
      {previousReplies.map((event, index) => <View key={`${event.createdAt || index}-${index}`} style={{ marginTop: SPACING.sm, padding: SPACING.sm, backgroundColor: COLORS.primaryLight, borderRadius: 10 }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>{t("Support reply")}{event.actorName ? ` · ${event.actorName}` : ""}</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{event.note}</Text>
      </View>)}
      {item.adminReply && !previousReplies.some((event) => event.note === item.adminReply) ? (
        <View style={{ marginTop: SPACING.sm, padding: SPACING.sm, backgroundColor: COLORS.primaryLight, borderRadius: 10 }}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>{t('Support reply')}</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{item.adminReply}</Text>
        </View>
      ) : !previousReplies.length ? (
        <Text style={{ color: COLORS.textMuted, marginTop: SPACING.sm }}>{t('Waiting for a support reply.')}</Text>
      ) : null}
      </> : null}
    </View>
  );
}

export default function CustomerContactScreen() {
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const { messageId } = useLocalSearchParams();
  const { current, token } = useUserContext();
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pagination, setPagination] = useState({ initialized: false, hasMore: false, nextCursor: "" });
  const [olderLoading, setOlderLoading] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const selectedFetchId = useRef("");
  const submissionInFlight = useRef(false);
  const olderInFlight = useRef(false);

  const loadHistory = useCallback(async ({ background = false, isCurrent = () => true } = {}) => {
    if (!token) {
      if (isCurrent()) setHistoryLoading(false);
      return;
    }
    if (!background && isCurrent()) setHistoryLoading(true);
    try {
      const result = await getMyContactMessages(token);
      if (!isCurrent()) return;
      if (result.success) {
        setHistory((previous) => mergeMessages(previous, Array.isArray(result.messages) ? result.messages : []));
        setPagination((previous) => previous.initialized ? previous : ({ initialized: true, ...result.pagination }));
        setHistoryError("");
      } else setHistoryError(result.error);
    } catch (requestError) {
      if (isCurrent()) setHistoryError(requestError?.message || "Unable to load your support messages.");
    } finally {
      if (isCurrent()) setHistoryLoading(false);
    }
  }, [token]);

  const loadOlder = async () => {
    if (olderInFlight.current || !pagination.hasMore || !pagination.nextCursor || !token) return;
    olderInFlight.current = true;
    setOlderLoading(true);
    try {
      const result = await getMyContactMessages(token, pagination.nextCursor);
      if (!result.success) { setHistoryError(result.error); return; }
      setHistory((previous) => mergeMessages(previous, result.messages || []));
      setPagination({ initialized: true, hasMore: Boolean(result.pagination?.hasMore), nextCursor: result.pagination?.nextCursor || "" });
      setHistoryError("");
    } catch (requestError) {
      setHistoryError(requestError?.message || "Unable to load your support messages.");
    } finally { olderInFlight.current = false; setOlderLoading(false); }
  };

  useFocusEffect(useCallback(() => startLiveRefresh(loadHistory), [loadHistory]));
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
  const branchLabel = assignedBranch || t('your assigned service branch');
  const focusedMessageId = String(Array.isArray(messageId) ? messageId[0] || "" : messageId || "");
  const focusedMessage = focusedMessageId
    ? history.find((item) => String(item.id || item._id) === focusedMessageId) || selectedMessage
    : null;
  useEffect(() => {
    if (!focusedMessageId || historyLoading || focusedMessage || !token || selectedFetchId.current === focusedMessageId) return;
    let active = true;
    selectedFetchId.current = focusedMessageId;
    setSelectedLoading(true);
    getMyContactMessage(token, focusedMessageId).then((result) => {
      if (active && result.success) setSelectedMessage(result.message);
    }).catch(() => {}).finally(() => { if (active) setSelectedLoading(false); });
    return () => { active = false; };
  }, [focusedMessageId, historyLoading, focusedMessage, token]);
  const remainingHistory = focusedMessage
    ? history.filter((item) => String(item.id || item._id) !== focusedMessageId)
    : history;

  const submitMessage = async () => {
    if (submissionInFlight.current) return;
    setError("");
    setConfirmation(null);
    if (!CONTACT_CATEGORIES.some((item) => item.id === category?.id)) return setError("Choose a valid support topic.");
    if (subject.trim().length < 3) return setError("Subject must be at least 3 characters.");
    if (subject.trim().length > 160) return setError("Subject must be 160 characters or fewer.");
    if (message.trim().length < 10) return setError("Please add a little more detail so our team can help.");
    if (message.trim().length > MESSAGE_LIMIT) return setError("Message must be 3000 characters or fewer.");
    if (!token) return setError("Please sign in again before sending your message.");
    submissionInFlight.current = true;
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
      if (result.message) setHistory((previous) => mergeMessages(previous, [result.message]));
      setSubject("");
      setMessage("");
      setCategory(CONTACT_CATEGORIES[0]);
      setRequestKey(newRequestKey());
    } catch (requestError) {
      setError(requestError?.message || "Unable to send your message. Please try again.");
    } finally {
      submissionInFlight.current = false;
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
      title={t('Contact')}
      subtitle={t('Send a tracked message to the Cold Air ACT support team')}
    >
      {focusedMessageId ? (
        <Card>
          <CustomerSectionHeader title={t('Selected Support Message')} />
          {historyLoading || (!focusedMessage && (selectedLoading || selectedFetchId.current !== focusedMessageId)) ? <Text style={{ color: COLORS.textMuted }}>{t('Loading this support message…')}</Text> : null}
          {!historyLoading && focusedMessage ? <SupportMessage item={focusedMessage} focused expanded t={t} /> : null}
          {!historyLoading && !selectedLoading && selectedFetchId.current === focusedMessageId && !focusedMessage ? <Text style={{ color: COLORS.danger }}>{t('This support message is no longer available.')}</Text> : null}
        </Card>
      ) : null}

      <Card>
        <CustomerSectionHeader title={t('Send a Support Message')} />
        <View style={{ padding: SPACING.md, borderRadius: 12, backgroundColor: COLORS.primaryLight, marginBottom: SPACING.md }}>
          <Text style={{ color: COLORS.primary, fontSize: FONT.sm, fontWeight: FONT.black, textTransform: "uppercase", letterSpacing: 0.5 }}>{t('Support routing')}</Text>
          <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginTop: 4 }}>{branchLabel}</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19, marginTop: 5 }}>{t('Your message is saved, routed to the responsible Admin, and also visible to SuperAdmin.')}</Text>
        </View>

        {confirmation ? (
          <View style={{ padding: SPACING.md, borderRadius: 12, backgroundColor: COLORS.successLight, marginBottom: SPACING.md }}>
            <Text style={{ color: COLORS.success, fontWeight: FONT.black }}>{t('Message sent successfully')}</Text>
            <Text style={{ color: COLORS.textPrimary, marginTop: 5, lineHeight: 20 }}>{t('Reference')}: {confirmation.ticketCode}</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 3, lineHeight: 19 }}>{t('We will notify you here when support replies.')}</Text>
          </View>
        ) : null}
        {error ? <Text style={{ color: COLORS.danger, marginBottom: SPACING.sm, lineHeight: 19 }}>{t(error)}</Text> : null}

        <BottomSheetSelect translate={t}
          disabled={submitting}
          label={t('What can we help with?')}
          value={t(category.name)}
          items={CONTACT_CATEGORIES.map((item) => ({ ...item, name: t(item.name) }))}
          searchPlaceholder={t('Search support topics')}
          onSelect={(selected) => setCategory(CONTACT_CATEGORIES.find((item) => item.id === selected.id) || CONTACT_CATEGORIES[0])}
        />
        <TextField label={t('Subject')} value={subject} editable={!submitting} onChangeText={(value) => { setSubject(value); setError(""); }} placeholder={t('Briefly describe what you need')} maxLength={160} />
        <TextField label={t('Message')} value={message} editable={!submitting} onChangeText={(value) => { setMessage(value); setError(""); }} placeholder={t('Include any order number, AC model, or other helpful details.')} multiline numberOfLines={6} textAlignVertical="top" maxLength={MESSAGE_LIMIT} helperText={`${message.length}/${MESSAGE_LIMIT}`} style={{ minHeight: 130 }} />
        <Button
          title={t('Send to Support')}
          loading={submitting}
          disabled={submitting}
          onPress={submitMessage}
        />
        <View style={{ height: SPACING.sm }} />
        <Button
          title={t('Prepare a Service Message')}
          variant="secondary"
          disabled={submitting}
          onPress={() => prepareMessage("service", t('Help with my service or assigned technician'))}
        />
        <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, lineHeight: 18, marginTop: SPACING.sm }}>{t('For your privacy, contact our support team if you need to send a message to your technician.')}</Text>
        <View style={{ height: SPACING.sm }} />
        <Button title={t('View My Orders')} variant="ghost" onPress={() => router.push("/customer/orders")} />
      </Card>

      <Card>
        <CustomerSectionHeader title={t('My Support Messages')} />
        <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.md }}>{t('Track each reference and read replies from your support team.')}</Text>
        {historyError ? <Text style={{ color: COLORS.danger }}>{t(historyError)}</Text> : null}
        {historyLoading && !history.length ? <Text style={{ color: COLORS.textMuted }}>{t('Loading your support messages…')}</Text> : null}
        {!historyLoading && history.length === 0 && !historyError ? <Text style={{ color: COLORS.textMuted }}>{t('No messages sent yet.')}</Text> : null}
        {remainingHistory.map((item) => <SupportMessage key={item.id || item._id} item={item} t={t}
          expanded={expandedId === String(item.id || item._id)}
          onToggle={() => setExpandedId((currentId) => currentId === String(item.id || item._id) ? "" : String(item.id || item._id))} />)}
        {pagination.hasMore ? <Button title={t('Load older messages')} variant="secondary" loading={olderLoading} disabled={olderLoading} onPress={loadOlder} /> : null}
      </Card>

      <Card>
        <CustomerSectionHeader title={t('Contact Channels')} />
        <ContactRow label={t('Support Email')} value={COMPANY_CONTACT.supportEmail} href={`mailto:${COMPANY_CONTACT.supportEmail}`} />
        <ContactRow label={t('Sales Email')} value={COMPANY_CONTACT.salesEmail} href={`mailto:${COMPANY_CONTACT.salesEmail}`} />
        <ContactRow label={t('Hotline')} value={COMPANY_CONTACT.hotline} href={`tel:${COMPANY_CONTACT.hotline.replace(/\s+/g, "")}`} />
        <ContactRow label={t('Landline')} value={COMPANY_CONTACT.landline} />
        <ContactRow label={t('Messenger')} value={COMPANY_CONTACT.messengerHandle} href={`https://${COMPANY_CONTACT.messengerHandle}`} />
        <Button
          title={t('Open Website')}
          variant="secondary"
          onPress={() => Linking.openURL(COLD_AIR_WEBSITE)}
        />
      </Card>

      <Card>
        <CustomerSectionHeader title={t('Branches and Map Codes')} />
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
              {t('Official hotline')}: {COMPANY_CONTACT.hotline}
            </Text>
          </View>
        ))}
      </Card>
    </CustomerScreen>
  );
}
