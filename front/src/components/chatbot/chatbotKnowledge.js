const customerFaqEntries = [
  {
    id: 'shop-products',
    question: 'What can I buy in the shop?',
    keywords: ['shop', 'buy', 'product', 'ac unit', 'aircon', 'brand', 'price'],
    answer:
      'In Shop, you can browse AC units by category (Split, Window, Floor Mounted), filter by brand, set a price range, and sort products. You can also add items to cart or use Buy Now to go directly to checkout.',
    route: '/shop'
  },
  {
    id: 'shop-cart',
    question: 'How do I open my cart and checkout?',
    keywords: ['cart', 'checkout', 'order', 'buy now', 'payment'],
    answer:
      'Use the cart icon in the Shop header to review items and update quantities. From there, choose Checkout to continue your order.',
    route: '/shop'
  },
  {
    id: 'services-booking',
    question: 'How do I request a service?',
    keywords: ['service', 'book', 'maintenance', 'repair', 'cleaning', 'schedule'],
    answer:
      'Service requests, maintenance scheduling, and technician coordination are handled in the AeroPulse Mobile App. Open Get the App for the official mobile-app access link.',
    route: '/services'
  },
  {
    id: 'services-pricing',
    question: 'How much do services cost?',
    keywords: ['service price', 'cost', 'fee', 'pricing', 'senior technician', 'express'],
    answer:
      'Service pricing and appointment details are shown in the AeroPulse Mobile App as part of the official service-request workflow.',
    route: '/services'
  },
  {
    id: 'myunit-add',
    question: 'How do I add or register my AC unit?',
    keywords: ['my unit', 'add unit', 'register unit', 'qr', 'warranty'],
    answer:
      'In My Unit, click Add New Unit to register your AC details. You can also register through the QR unit flow and then track warranty and service history.',
    route: '/myunit'
  },
  {
    id: 'myunit-history',
    question: 'Where can I view service history and warranty?',
    keywords: ['history', 'service history', 'warranty', 'unit details', 'status'],
    answer:
      'Open My Unit and select your unit to view details, service history, and warranty status. Service requests are managed in the AeroPulse Mobile App.',
    route: '/myunit'
  },
  {
    id: 'orders-track',
    question: 'Where do I see my orders?',
    keywords: ['orders', 'my orders', 'track', 'invoice', 'receipt'],
    answer:
      'You can view your purchase history and order details in My Orders.',
    route: '/my-orders'
  },
  {
    id: 'settings-account',
    question: 'How can I update my account settings?',
    keywords: ['settings', 'profile', 'password', 'notification', 'privacy', 'dark mode'],
    answer:
      'In Settings, you can edit profile info, change password, adjust notifications, privacy, preferences, and toggle dark mode.',
    route: '/settings'
  },
  {
    id: 'contact-support',
    question: 'How do I contact support?',
    keywords: ['contact', 'support', 'help', 'office', 'location', 'hotline'],
    answer:
      'Use the Contact page for support details, office information, and service assistance options.',
    route: '/contact'
  },
  {
    id: 'faq-page',
    question: 'Where can I read common questions?',
    keywords: ['faq', 'questions', 'common questions'],
    answer:
      'You can visit the FAQ page to view frequently asked questions and quick guidance.',
    route: '/faq'
  }
];

const quickQuestions = [
  'How do I buy in the shop?',
  'How do I request a service?',
  'How do I add my AC unit?',
  'Where can I track my orders?',
  'How do I contact support?'
];

const normalizeText = (value = '') => value.toLowerCase().trim();

export const findBestFaqMatch = (message) => {
  const normalizedMessage = normalizeText(message);
  if (!normalizedMessage) return null;

  let bestMatch = null;
  let bestScore = 0;

  customerFaqEntries.forEach((entry) => {
    let score = 0;
    entry.keywords.forEach((keyword) => {
      if (normalizedMessage.includes(keyword)) {
        score += keyword.length;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  });

  return bestScore > 0 ? bestMatch : null;
};

export const chatbotKnowledge = {
  entries: customerFaqEntries,
  quickQuestions
};
