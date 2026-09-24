import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import CustomerScreen from "../../components/customer/CustomerScreen";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { getStoredToken, sendCustomerChatMessage } from "../../services/api";

const WELCOME_MESSAGE = {
  id: "welcome",
  from: "bot",
  text: "Hi! I am the AEROPULSE Assistant. Ask me about your order, payment, AC unit, or service request.",
};

const QUICK_QUESTIONS = [
  "How do I request a service?",
  "Where can I track my order?",
  "How does the suggested service date work?",
];

const MOBILE_ROUTE_BY_WEB_ROUTE = {
  "/shop": "/customer/shop",
  "/services": "/customer/services",
  "/myunit": "/customer/home",
  "/my-orders": "/customer/orders",
  "/settings": "/customer/settings",
  "/contact": "/customer/contact",
  "/faq": "/customer/faq",
};

export default function CustomerChatScreen() {
  const router = useRouter();
  const listRef = useRef(null);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || sending) return;
    const history = messages
      .filter((item) => item.id !== "welcome")
      .slice(-10)
      .map((item) => ({
        role: item.from === "bot" ? "assistant" : "user",
        content: item.text,
      }));
    const userMessage = { id: `user-${Date.now()}`, from: "user", text };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);
    try {
      const token = await getStoredToken();
      if (!token) throw new Error("Please sign in again to use the AEROPULSE assistant.");
      const result = await sendCustomerChatMessage(token, {
        message: text,
        history,
        currentPage: "/customer/chat",
      });
      if (!result.success || !result.reply?.text) {
        throw new Error(result.error || "The AEROPULSE assistant is unavailable right now.");
      }
      setMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          from: "bot",
          text: result.reply.text,
          route: MOBILE_ROUTE_BY_WEB_ROUTE[result.reply.route] || "",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          from: "bot",
          text: error?.message || "The AEROPULSE assistant is unavailable right now.",
          route: "/customer/contact",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <CustomerScreen
      title="AEROPULSE Assistant"
      subtitle="Customer help for Cold Air ACT"
      scroll={false}
      withBottomNav={false}
      onBack={() => router.back()}
      contentContainerStyle={{ paddingTop: 0 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.screen}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
          renderItem={({ item }) => {
            const fromUser = item.from === "user";
            return (
              <View style={{ alignItems: fromUser ? "flex-end" : "flex-start" }}>
                <View
                  style={[
                    styles.messageBubble,
                    fromUser ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: fromUser ? "#FFFFFF" : COLORS.textPrimary },
                    ]}
                  >
                    {item.text}
                  </Text>
                  {item.route ? (
                    <Pressable
                      onPress={() => router.push(item.route)}
                      accessibilityRole="button"
                      accessibilityLabel="Open suggested page"
                      style={{ alignSelf: "flex-start", marginTop: SPACING.sm }}
                    >
                      <Text style={{ color: fromUser ? "#FFFFFF" : COLORS.primary, fontWeight: FONT.bold }}>
                        Open page
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListFooterComponent={sending ? (
            <View style={styles.thinkingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ color: COLORS.textSecondary }}>AEROPULSE is thinking…</Text>
            </View>
          ) : null}
        />

        <View style={styles.quickSection}>
          <Text style={styles.quickLabel}>Quick questions</Text>
          <FlatList
            horizontal
            data={QUICK_QUESTIONS}
            keyExtractor={(item) => item}
            testID="quick-question-list"
            style={styles.quickList}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.quickListContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => send(item)}
                disabled={sending}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.quickChip,
                  sending && styles.controlDisabled,
                  pressed && !sending && styles.quickChipPressed,
                ]}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
                <Text numberOfLines={2} style={styles.quickText}>{item}</Text>
              </Pressable>
            )}
          />
        </View>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            editable={!sending}
            maxLength={1000}
            multiline
            placeholder="Ask about customer features…"
            placeholderTextColor={COLORS.textMuted}
            accessibilityLabel="Message AEROPULSE assistant"
            style={styles.input}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={sending || !input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: sending || !input.trim() }}
            style={[
              styles.sendButton,
              { backgroundColor: sending || !input.trim() ? "#CBD5E1" : COLORS.primary },
            ]}
          >
            <Ionicons name="send-sharp" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
  },
  messageList: {
    flex: 1,
    minHeight: 0,
  },
  messageListContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  messageBubble: {
    maxWidth: "88%",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 3,
    borderRadius: RADIUS.lg,
  },
  botBubble: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: RADIUS.sm,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: RADIUS.sm,
  },
  messageText: {
    fontSize: FONT.base,
    lineHeight: 21,
  },
  thinkingRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  quickSection: {
    flexShrink: 0,
    marginBottom: SPACING.sm,
  },
  quickLabel: {
    marginBottom: SPACING.xs,
    color: COLORS.textSecondary,
    fontSize: FONT.sm,
    fontWeight: FONT.bold,
  },
  quickList: {
    flexGrow: 0,
    flexShrink: 0,
  },
  quickListContent: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  quickChip: {
    width: 224,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  quickChipPressed: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  quickText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT.sm,
    lineHeight: 17,
    fontWeight: "600",
  },
  controlDisabled: {
    opacity: 0.55,
  },
  composer: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 112,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    fontSize: FONT.base,
    lineHeight: 20,
  },
  sendButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
  },
});
