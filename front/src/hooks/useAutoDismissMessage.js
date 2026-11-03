import { useEffect } from 'react';

// Success feedback is transient; errors stay visible until the next action.
export default function useAutoDismissMessage(message, clearMessage, delay = 5000) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => clearMessage(''), delay);
    return () => window.clearTimeout(timer);
  }, [message, clearMessage, delay]);
}
