import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFallbackReply, quickActions } from '../data/chatbotContext';
import apiServerClient from '../lib/apiServerClient';

const starterMessage = {
  role: 'assistant',
  content: "Hi! I'm Dmitri's portfolio assistant. Ask me about his projects, skills, background, or how to get in touch.",
};

// Determine if a URL is internal (same-origin path) or external
const isInternal = (url) => url.startsWith('/') && !url.startsWith('//');

// Parse **bold** and [label](url) markdown, render bold as <strong> and links as chips.
function MessageContent({ text }) {
  const SEGMENT_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  const parts = [];
  let last = 0;
  let match;

  while ((match = SEGMENT_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      parts.push({ type: 'bold', value: match[1] });
    } else {
      parts.push({ type: 'link', label: match[2], url: match[3] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: 'text', value: text.slice(last) });
  }

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.value}</span>;
        if (p.type === 'bold') return <strong key={i} style={{ color: '#e8f4ff', fontWeight: 650 }}>{p.value}</strong>;
        return isInternal(p.url) ? (
          <a key={i} href={p.url} className="chatbot-link-chip">
            {p.label} ↗
          </a>
        ) : (
          <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="chatbot-link-chip">
            {p.label} ↗
          </a>
        );
      })}
    </>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([starterMessage]);
  const bottomRef = useRef(null);

  const visibleMessages = useMemo(() => messages.slice(-20), [messages]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, loading, open]);

  const sendMessage = async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await apiServerClient.fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error('chat_failed');
      const data = await res.json();
      const reply = (data?.reply || '').trim();
      if (!reply) throw new Error('empty');
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: getFallbackReply(trimmed, prev) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        className="chatbot-trigger"
        aria-label="Open portfolio assistant"
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
      >
        <svg className="chatbot-bot-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 4V2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <rect x="5" y="7" width="14" height="11" rx="4" stroke="currentColor" strokeWidth="1.8"/>
          <circle cx="10" cy="12" r="1.1" fill="currentColor"/>
          <circle cx="14" cy="12" r="1.1" fill="currentColor"/>
          <path d="M9 15.2C9.9 16 11 16.4 12 16.4C13 16.4 14.1 16 15 15.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M5 12H3.6M20.4 12H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            className="chatbot-panel"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            role="dialog"
            aria-label="Portfolio assistant"
          >
            <div className="chatbot-header">
              <strong style={{ fontSize: '0.82rem', letterSpacing: '0.06em' }}>PORTFOLIO ASSISTANT</strong>
              <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
            </div>

            <div className="chatbot-quick-actions">
              {quickActions.map(a => (
                <button key={a.id} className="chatbot-chip" onClick={() => sendMessage(a.prompt)}>
                  {a.label}
                </button>
              ))}
            </div>

            <div className="chatbot-messages" aria-live="polite">
              {visibleMessages.map((m, i) => (
                <div key={`${m.role}-${i}`} className={`chatbot-bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>
                  <MessageContent text={m.content} />
                </div>
              ))}
              {loading && (
                <div className="chatbot-bubble assistant chatbot-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form className="chatbot-input-row" onSubmit={e => { e.preventDefault(); sendMessage(input); }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about projects, skills, resume…"
                maxLength={250}
              />
              <button type="submit" disabled={loading || !input.trim()}>Send</button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
