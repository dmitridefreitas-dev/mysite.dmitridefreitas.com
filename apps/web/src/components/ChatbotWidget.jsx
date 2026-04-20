import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getFallbackReply, quickActions } from '../data/chatbotContext';
import apiServerClient from '../lib/apiServerClient';

const starterMessage = {
  role: 'assistant',
  content: "Hi! I'm Dmitri's portfolio assistant. Ask me anything — or tap the mic and speak. I can also navigate the site for you.",
};

// Parse [NAV:/path] tag from bot reply
const NAV_RE = /\[NAV:(\/[^\]]*)\]/;
function extractNav(text) {
  const m = text.match(NAV_RE);
  if (!m) return { reply: text, navPath: null };
  return { reply: text.replace(NAV_RE, '').trim(), navPath: m[1] };
}

const isInternal = (url) => url.startsWith('/') && !url.startsWith('//');

function MessageContent({ text }) {
  const SEGMENT_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = SEGMENT_RE.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
    if (match[1] !== undefined) parts.push({ type: 'bold', value: match[1] });
    else parts.push({ type: 'link', label: match[2], url: match[3] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.value}</span>;
        if (p.type === 'bold') return <strong key={i} style={{ color: 'var(--cb-bold-text)', fontWeight: 650 }}>{p.value}</strong>;
        return isInternal(p.url) ? (
          <a key={i} href={p.url} className="chatbot-link-chip">{p.label} ↗</a>
        ) : (
          <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="chatbot-link-chip">{p.label} ↗</a>
        );
      })}
    </>
  );
}

function MicIcon({ recording }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" fill={recording ? 'currentColor' : 'none'} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerIcon({ active }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} />
      {active ? (
        <path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      ) : (
        <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      )}
    </svg>
  );
}

// Strip markdown for clean TTS output
function toPlainText(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[NAV:[^\]]+\]/g, '')
    .replace(/↗/g, '')
    .trim();
}

function pickVoice(voices) {
  if (!voices.length) return null;
  // Priority list — first match wins
  const tests = [
    v => /aria/i.test(v.name) && v.lang.startsWith('en'),
    v => /jenny/i.test(v.name) && v.lang.startsWith('en'),
    v => /ana/i.test(v.name) && /natural|online/i.test(v.name) && v.lang.startsWith('en'),
    v => /natural|online/i.test(v.name) && !v.localService && v.lang.startsWith('en'),
    v => /google us english/i.test(v.name),
    v => v.lang === 'en-US' && !v.localService,
    v => v.lang === 'en-US',
  ];
  for (const t of tests) {
    const m = voices.find(t);
    if (m) return m;
  }
  return voices.find(v => v.lang.startsWith('en')) || null;
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([starterMessage]);
  const [recording, setRecording] = useState(false);
  const [micStatus, setMicStatus] = useState(''); // '' | 'recording' | 'processing' | error string
  const [speakingId, setSpeakingId] = useState(null);
  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const autoStopRef = useRef(null);
  const recordingStartRef = useRef(null);
  const messagesRef = useRef(messages);
  const loadingRef = useRef(loading);
  const ttsAudioRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Stop TTS when panel closes
  useEffect(() => {
    if (!open) {
      ttsAudioRef.current?.pause();
      setSpeakingId(null);
    }
  }, [open]);

  const speak = async (id, text) => {
    // Toggle off
    if (speakingId === id) {
      ttsAudioRef.current?.pause();
      setSpeakingId(null);
      return;
    }
    ttsAudioRef.current?.pause();
    setSpeakingId(id);

    try {
      const res = await apiServerClient.fetch('/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: toPlainText(text).slice(0, 800) }),
      });
      if (!res.ok) throw new Error('tts_failed');

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const audio = new Audio(objUrl);
      audio.volume = 0.45;
      ttsAudioRef.current = audio;
      audio.onended = () => { setSpeakingId(null); URL.revokeObjectURL(objUrl); };
      audio.onerror = () => { setSpeakingId(null); URL.revokeObjectURL(objUrl); };
      audio.play().catch(() => setSpeakingId(null));
    } catch (err) {
      console.error('[tts]', err);
      setSpeakingId(null);
    }
  };

  const visibleMessages = useMemo(() => messages.slice(-20), [messages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, loading, open]);

  const sendMessage = async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || loadingRef.current) return;

    const nextMessages = [...messagesRef.current, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    // Add streaming placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const res = await apiServerClient.fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('chat_failed');

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        // Fallback: non-streaming response
        const data = await res.json();
        const raw = (data?.reply || '').trim();
        if (!raw) throw new Error('empty');
        const { reply, navPath } = extractNav(raw);
        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: 'assistant', content: reply, streaming: false };
          return msgs;
        });
        if (navPath) setTimeout(() => navigate(navPath), 700);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              accumulated += delta;
              setMessages(prev => {
                const msgs = [...prev];
                msgs[msgs.length - 1] = { role: 'assistant', content: accumulated, streaming: true };
                return msgs;
              });
            }
          } catch { /* skip malformed chunk */ }
        }
      }

      // Finalise — extract nav tag
      const { reply, navPath } = extractNav(accumulated || getFallbackReply(trimmed, nextMessages));
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'assistant', content: reply, streaming: false };
        return msgs;
      });
      if (navPath) setTimeout(() => navigate(navPath), 700);

    } catch {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'assistant', content: getFallbackReply(trimmed, nextMessages), streaming: false };
        return msgs;
      });
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = () => {
    clearTimeout(autoStopRef.current);
    const elapsed = Date.now() - (recordingStartRef.current || 0);
    const MIN_MS = 1000;
    const doStop = () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
    if (elapsed < MIN_MS) {
      setTimeout(doStop, MIN_MS - elapsed);
    } else {
      doStop();
    }
  };

  const startRecording = async () => {
    if (recording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        setMicStatus('processing');

        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const res = await apiServerClient.fetch('/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: reader.result, mimeType: mimeType || 'audio/webm' }),
            });
            const data = await res.json();
            if (data?.transcript) {
              setMicStatus('');
              if (!open) setOpen(true);
              sendMessage(data.transcript);
            } else {
              setMicStatus('Could not understand. Try again.');
              setTimeout(() => setMicStatus(''), 3500);
            }
          } catch {
            setMicStatus('Transcription failed. Try again.');
            setTimeout(() => setMicStatus(''), 3500);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(100); // collect chunks every 100ms
      recordingStartRef.current = Date.now();
      setRecording(true);
      setMicStatus('recording');

      // Auto-stop after 15 seconds
      autoStopRef.current = setTimeout(() => stopRecording(), 15000);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicStatus('Mic access denied — check browser permissions.');
      } else {
        setMicStatus('Could not access microphone.');
      }
      setTimeout(() => setMicStatus(''), 4000);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(autoStopRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      ttsAudioRef.current?.pause();
    };
  }, []);

  const statusLabel =
    micStatus === 'recording' ? 'Recording… tap mic to send' :
    micStatus === 'processing' ? 'Transcribing…' :
    micStatus;

  return (
    <>
      <motion.button
        className="chatbot-trigger"
        aria-label="Open portfolio assistant"
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
      >
        <svg className="chatbot-bot-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V14C20 15.1 19.1 16 18 16H13L9 21V16H6C4.9 16 4 15.1 4 14V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          <line x1="9" y1="11.5" x2="13" y2="11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite"/>
          </line>
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
              {visibleMessages.map((m, i) => {
                const msgId = `${m.role}-${i}`;
                const isActive = speakingId === msgId;
                return (
                  <div key={msgId} className={`chatbot-bubble ${m.role === 'user' ? 'user' : 'assistant'}`} style={{ position: 'relative' }}>
                    <MessageContent text={m.content} />
                    {m.streaming && <span style={{ animation: 'chatbot-pulse 1s ease-in-out infinite', marginLeft: 2 }}>▋</span>}
                    {m.role === 'assistant' && !m.streaming && (
                      <button
                        onClick={() => speak(msgId, m.content)}
                        aria-label={isActive ? 'Stop reading' : 'Read aloud'}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                          color: isActive ? 'var(--cb-primary)' : 'var(--cb-muted)',
                          opacity: isActive ? 1 : 0.45,
                          transition: 'opacity 0.2s, color 0.2s',
                          lineHeight: 1,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = isActive ? '1' : '0.45'}
                      >
                        <SpeakerIcon active={isActive} />
                      </button>
                    )}
                  </div>
                );
              })}
              {loading && (
                <div className="chatbot-bubble assistant chatbot-thinking">
                  <span /><span /><span />
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {micStatus && (
              <div style={{
                padding: '4px 12px',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: micStatus === 'recording' ? 'var(--cb-primary)' : micStatus === 'processing' ? 'var(--cb-muted)' : 'var(--cb-muted)',
              }}>
                {(micStatus === 'recording' || micStatus === 'processing') && (
                  <span style={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: 'currentColor',
                    animation: 'chatbot-pulse 1s ease-in-out infinite',
                  }} />
                )}
                {statusLabel}
              </div>
            )}

            <form className="chatbot-input-row" onSubmit={e => { e.preventDefault(); sendMessage(input); }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={recording ? 'Recording… tap mic to send' : 'Ask anything, or navigate the site…'}
                maxLength={250}
                disabled={recording || micStatus === 'processing'}
              />
              <button
                type="button"
                onClick={startRecording}
                disabled={loading || micStatus === 'processing'}
                aria-label={recording ? 'Stop recording' : 'Voice input'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: (loading || micStatus === 'processing') ? 'not-allowed' : 'pointer',
                  padding: '0 8px',
                  color: recording ? 'var(--cb-primary)' : 'var(--cb-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s',
                  animation: recording ? 'chatbot-pulse 1.2s ease-in-out infinite' : 'none',
                }}
              >
                <MicIcon recording={recording} />
              </button>
              <button type="submit" disabled={loading || !input.trim() || recording || micStatus === 'processing'}>Send</button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
