const test = require("node:test");
const assert = require("node:assert/strict");
const env = require("../src/config/env");
const {
  getCustomerChatReply,
  sanitizeHistory,
  validateReply,
  MAX_HISTORY_ITEMS,
} = require("../src/services/openAiCustomerChatService");

test("customer chat uses a useful system answer when OpenAI is not configured", async () => {
  const originalKey = env.openAiApiKey;
  env.openAiApiKey = "";
  try {
    const result = await getCustomerChatReply({ message: "How can I pay again with GCash?" });
    assert.equal(result.provider, "system-fallback");
    assert.match(result.reply.text, /up to three payment attempts/i);
    assert.equal(result.reply.route, "/my-orders");
  } finally {
    env.openAiApiKey = originalKey;
  }
});

test("customer chat sends limited conversation context and accepts only an allowed route", async () => {
  const originalKey = env.openAiApiKey;
  const originalFetch = global.fetch;
  let requestBody;
  env.openAiApiKey = "test-key";
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      text: async () => JSON.stringify({
        output_text: JSON.stringify({
          text: "Open My Orders and choose Pay Again.",
          route: "/my-orders",
        }),
      }),
    };
  };
  try {
    const history = Array.from({ length: 14 }, (_, index) => ({
      role: index % 2 ? "assistant" : "user",
      content: `message ${index}`,
    }));
    const result = await getCustomerChatReply({
      message: "Where can I retry?",
      history,
      currentPage: "/my-orders",
      safetyIdentifier: "customer-1",
    });
    const supplied = JSON.parse(requestBody.input[1].content[0].text);
    assert.equal(result.provider, "openai");
    assert.equal(result.reply.route, "/my-orders");
    assert.equal(requestBody.store, false);
    assert.equal(supplied.conversation.length, MAX_HISTORY_ITEMS);
    assert.equal(supplied.conversation[0].content, "message 4");
    assert.equal(supplied.currentPage, "/my-orders");
  } finally {
    env.openAiApiKey = originalKey;
    global.fetch = originalFetch;
  }
});

test("customer chat validation removes unsupported navigation and empty history", () => {
  assert.deepEqual(validateReply({ text: " Contact support. ", route: "/admin" }), {
    text: "Contact support.",
    route: "",
  });
  assert.deepEqual(sanitizeHistory([{ role: "user", content: "" }, { role: "assistant", content: "Ready" }]), [
    { role: "assistant", content: "Ready" },
  ]);
});
