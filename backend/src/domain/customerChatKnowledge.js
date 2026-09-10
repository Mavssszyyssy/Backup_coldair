const CUSTOMER_CHAT_ROUTES = [
  "",
  "/shop",
  "/services",
  "/myunit",
  "/my-orders",
  "/settings",
  "/contact",
  "/faq",
];

const CUSTOMER_CHAT_ENTRIES = [
  {
    keywords: ["shop", "buy", "product", "ac unit", "aircon", "brand", "price"],
    answer: "Open Shop to browse available AC units, compare products, and add an item to your cart.",
    route: "/shop",
  },
  {
    keywords: ["cart", "checkout", "quantity", "remove item", "delete item"],
    answer: "Use the cart in Shop or the order controls in Checkout to review items and change quantities before placing your order.",
    route: "/shop",
  },
  {
    keywords: ["gcash", "payment", "pay again", "failed", "cancelled", "retry"],
    answer: "Open My Orders and select Pay Again for an unpaid GCash order. You can make up to three payment attempts, and the order is marked paid only after GCash confirms payment.",
    route: "/my-orders",
  },
  {
    keywords: ["service", "book", "maintenance", "repair", "cleaning", "schedule", "warranty claim"],
    answer: "Open Services in the Cold Air mobile app to request cleaning, maintenance, repair, or warranty assistance and choose the AC unit that needs service.",
    route: "/services",
  },
  {
    keywords: ["my unit", "add unit", "register unit", "qr", "warranty", "service history"],
    answer: "Open My Unit to view your registered AC units, warranty details, suggested service date, and recorded service history.",
    route: "/myunit",
  },
  {
    keywords: ["ai", "aeropulse", "suggested service", "prediction", "next cleaning"],
    answer: "AEROPULSE reviews verified cleaning history to suggest the next cleaning interval. When there is not enough verified history, it clearly shows the system baseline instead of presenting it as an AI prediction.",
    route: "/myunit",
  },
  {
    keywords: ["orders", "my orders", "track", "delivery", "invoice", "receipt"],
    answer: "Open My Orders to review payment, delivery, installation, and receipt information for your purchases.",
    route: "/my-orders",
  },
  {
    keywords: ["settings", "profile", "password", "notification", "privacy"],
    answer: "Open Settings to update your customer profile, saved locations, password, notifications, and privacy preferences.",
    route: "/settings",
  },
  {
    keywords: ["contact", "support", "help", "office", "location", "hotline", "human"],
    answer: "Open Contact to send a support request or view Cold Air contact details.",
    route: "/contact",
  },
  {
    keywords: ["faq", "questions", "common questions"],
    answer: "Open FAQ for quick guidance about orders, payments, AC care, warranty, and technician visits.",
    route: "/faq",
  },
];

const normalizeText = (value = "") => String(value || "").trim().toLowerCase();

const deterministicCustomerChatReply = (message = "") => {
  const normalized = normalizeText(message);
  if (!normalized) return null;
  if (/^(hi|hello|hey|good (morning|afternoon|evening))[!. ]*$/i.test(normalized)) {
    return {
      text: "Hello! How can I help with your order, payment, AC unit, or service request?",
      route: "",
    };
  }

  let best = null;
  let score = 0;
  CUSTOMER_CHAT_ENTRIES.forEach((entry) => {
    const nextScore = entry.keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword) ? keyword.length : 0),
      0,
    );
    if (nextScore > score) {
      best = entry;
      score = nextScore;
    }
  });

  return best
    ? { text: best.answer, route: best.route }
    : {
      text: "I could not confirm that from the customer help information. Please open Contact so our support team can check it for you.",
      route: "/contact",
    };
};

module.exports = {
  CUSTOMER_CHAT_ENTRIES,
  CUSTOMER_CHAT_ROUTES,
  deterministicCustomerChatReply,
};
