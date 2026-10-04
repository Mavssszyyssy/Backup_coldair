import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../config/api';
import { chatbotKnowledge, fallbackChatReply } from './chatbotKnowledge';
import './CustomerChatbot.css';

const defaultBotMessage = {
  id: 'welcome',
  from: 'bot',
  text: 'Hi! I am AeroPulse Assistant. Ask me about Shop, Services, My Unit, Orders, Settings, or Contact support.'
};

const CustomerChatbot = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([defaultBotMessage]);
  const [isSending, setIsSending] = useState(false);

  const quickQuestions = useMemo(() => chatbotKnowledge.quickQuestions, []);

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
        body: JSON.stringify({ message: text, history, currentPage: location.pathname })
      });
      const response = result?.reply || fallbackChatReply(text);
      pushMessage({
        id: `bot-${Date.now() + 1}`,
        from: 'bot',
        text: response.text,
        route: response.route
      });
    } catch (_error) {
      const response = fallbackChatReply(text);
      pushMessage({
        id: `bot-${Date.now() + 1}`,
        from: 'bot',
        text: response.text,
        route: response.route
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
    <div className="customer-chatbot-root" aria-live="polite">
      {isOpen && (
        <section className="customer-chatbot-panel" role="dialog" aria-label="Customer chatbot">
          <header className="customer-chatbot-header">
            <div>
              <h3>AeroPulse Assistant</h3>
              <p>Automated support for customer pages</p>
            </div>
            <button
              type="button"
              className="customer-chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              ×
            </button>
          </header>

          <div className="customer-chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`customer-chatbot-message ${message.from === 'user' ? 'user' : 'bot'}`}
              >
                <p>{message.text}</p>
                {message.route && message.route !== location.pathname && (
                  <button
                    type="button"
                    className="customer-chatbot-route-btn"
                    onClick={() => navigate(message.route)}
                  >
                    Open page
                  </button>
                )}
              </div>
            ))}
            {isSending ? (
              <div className="customer-chatbot-message bot customer-chatbot-thinking" role="status">
                <p>AEROPULSE is thinking…</p>
              </div>
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
                {question}
              </button>
            ))}
          </div>

          <form className="customer-chatbot-input-row" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about customer features..."
              aria-label="Chatbot input"
              maxLength={1000}
              disabled={isSending}
            />
            <button type="submit" disabled={isSending || !input.trim()}>Send</button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="customer-chatbot-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Hide chatbot' : 'Open chatbot'}
      >
        Chat
      </button>
    </div>
  );
};

export default CustomerChatbot;
