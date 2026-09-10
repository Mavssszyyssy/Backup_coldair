import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";

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
      <View style={{ flex: 1, minHeight: 0 }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: SPACING.sm, gap: SPACING.sm }}
          onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
          renderItem={({ item }) => {
            const fromUser = item.from === "user";
            return (
              <View style={{ alignItems: fromUser ? "flex-end" : "flex-start" }}>
                <View
                  style={{
                    maxWidth: "88%",
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.sm + 3,
                    borderRadius: RADIUS.lg,
                    backgroundColor: fromUser ? COLORS.primary : COLORS.surface,
                    borderWidth: fromUser ? 0 : 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Text style={{ color: fromUser ? "#FFFFFF" : COLORS.textPrimary, fontSize: FONT.base, lineHeight: 21 }}>
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
            <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: SPACING.sm, padding: SPACING.sm }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ color: COLORS.textSecondary }}>AEROPULSE is thinking…</Text>
            </View>
          ) : null}
        />

        <FlatList
          horizontal
          data={QUICK_QUESTIONS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm, paddingVertical: SPACING.sm }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => send(item)}
              disabled={sending}
              accessibilityRole="button"
              style={{ borderWidth: 1, borderColor: COLORS.borderInput, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: COLORS.surface }}
            >
              <Text style={{ color: COLORS.textPrimary, fontSize: FONT.sm }}>{item}</Text>
            </Pressable>
          )}
        />

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            editable={!sending}
            maxLength={1000}
            multiline
            placeholder="Ask about customer features…"
            placeholderTextColor={COLORS.textMuted}
            accessibilityLabel="Message AEROPULSE assistant"
            style={{ flex: 1, maxHeight: 112, minHeight: 48, borderWidth: 1, borderColor: COLORS.borderInput, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: 12, color: COLORS.textPrimary, fontSize: FONT.base }}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={sending || !input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: sending || !input.trim() }}
            style={{ width: 48, height: 48, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", backgroundColor: sending || !input.trim() ? "#CBD5E1" : COLORS.primary }}
          >
            <Ionicons name="send-sharp" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </CustomerScreen>
  );
}
