import { Sparkle } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../config/api';
import { useUser } from '../../context/UserContext';
import { translateText } from '../../utils/customerI18n';
import LoadingSkeleton from '../common/LoadingSkeleton';
import { quickQuestions } from './chatbotKnowledge';
import './CustomerChatbot.css';

const defaultBotMessage = {
  id: 'welcome',
  from: 'bot',
  text: 'Ask me about AC stock by branch, product prices, orders, payments, or Cold Air services.'
};

const CustomerChatbot = () => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([defaultBotMessage]);
  const [isSending, setIsSending] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    const list = messagesRef.current;
    if (isOpen && list) list.scrollTop = list.scrollHeight;
  }, [isOpen, messages, isSending]);

  const pushMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const sendUserMessage = async (rawText) => {
    const text = rawText.trim();
    if (!text || isSending) return;

    const history = messages
      .filter((message) => message.id !== 'welcome')
      .slice(-10)
      .map((message) => ({
        role: message.from === 'bot' ? 'assistant' : 'user',
        content: message.text
      }));

    pushMessage({
      id: `user-${Date.now()}`,
      from: 'user',
      text
    });
    setIsSending(true);
    try {
      const result = await apiRequest('/ai/customer-chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, history, currentPage: location.pathname, language: currentLanguage })
      });
      const response = result?.reply;
      if (!response?.text) throw new Error('Missing chat reply');
      pushMessage({
        id: `bot-${Date.now() + 1}`,
        from: 'bot',
        text: response.text,
        route: response.route
      });
    } catch (_error) {
      pushMessage({
        id: `bot-${Date.now() + 1}`,
        from: 'bot',
        text: t('The AEROPULSE assistant is unavailable right now.')
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    void sendUserMessage(input);
    setInput('');
  };

  return (
    <div className="customer-chatbot-root">
      {isOpen && (
        <section className="customer-chatbot-panel" id="customer-chatbot" role="dialog" aria-label={t('AEROPULSE Assistant')}>
          <header className="customer-chatbot-header">
            <div>
              <h3><Sparkle size={18} weight="fill" aria-hidden="true" /> {t('AEROPULSE Assistant')}</h3>
              <p>{t('Customer help for Cold Air ACT')}</p>
            </div>
            <button
              type="button"
              className="customer-chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label={t('Close assistant')}
            >
              ×
            </button>
          </header>

          <div className="customer-chatbot-messages" ref={messagesRef} role="log" aria-label={t('Chat')}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`customer-chatbot-message ${message.from === 'user' ? 'user' : 'bot'}`}
              >
                <p>{message.id === 'welcome' ? t(message.text) : message.text}</p>
                {message.route && message.route !== location.pathname && (
                  <button
                    type="button"
                    className="customer-chatbot-route-btn"
                    onClick={() => navigate(message.route)}
                  >
                    {t('Open page')}
                  </button>
                )}
              </div>
            ))}
            {isSending ? (
              <LoadingSkeleton label={translateText('AEROPULSE is thinking…', currentLanguage)} variant="inline" count={1} />
            ) : null}
          </div>

          <div className="customer-chatbot-quick-questions">
            {quickQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void sendUserMessage(question)}
                disabled={isSending}
              >
                {t(question)}
              </button>
            ))}
          </div>

          <form className="customer-chatbot-input-row" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('Ask about stock, prices, or orders…')}
              aria-label={t('Question for the assistant')}
              maxLength={1000}
              disabled={isSending}
            />
            <button type="submit" disabled={isSending || !input.trim()}>{t('Send')}</button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="customer-chatbot-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'customer-chatbot' : undefined}
        aria-label={t(isOpen ? 'Close assistant' : 'Open AEROPULSE assistant')}
      >
        <Sparkle size={18} weight="fill" aria-hidden="true" />
        {t('Chat')}
      </button>
    </div>
  );
};

export default CustomerChatbot;
