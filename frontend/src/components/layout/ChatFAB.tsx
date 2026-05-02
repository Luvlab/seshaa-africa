/**
 * ChatFAB — Global chat overlay for Seshaa.
 *
 * • Always-on Seshaa AI assistant (no login required)
 * • DM access (requires login) — full chat is at /messages
 * • Opened from header (desktop) and footer menu (mobile)
 */
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Sparkles, Send, MessagesSquare, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import api from '../../services/api';
import type { ChatRoom } from '../../types';

interface AIMsg { role: 'user' | 'assistant'; content: string; }

const SHARE_LINKS = [
  { label: 'Home', url: 'https://www.seshaa.africa/' },
  { label: 'Directory', url: 'https://www.seshaa.africa/search' },
  { label: 'News', url: 'https://www.seshaa.africa/news' },
  { label: 'Classifieds', url: 'https://www.seshaa.africa/classifieds' },
  { label: 'Prices', url: 'https://www.seshaa.africa/prices' },
  { label: 'Events', url: 'https://www.seshaa.africa/events' },
];

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) => (
        /^https?:\/\//.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">{part}</a>
          : <span key={i}>{part}</span>
      ))}
    </>
  );
}

export default function ChatFAB() {
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen]       = useState(false);
  const [tab, setTab]         = useState<'ai' | 'messages'>('ai');
  const [aiInput, setAiInput] = useState('');
  const [aiMsgs, setAiMsgs]   = useState<AIMsg[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [rooms, setRooms]     = useState<ChatRoom[]>([]);
  const [unread, setUnread]   = useState(0);
  const [shareCopied, setShareCopied] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: 'ai' | 'messages' }>).detail;
      if (detail?.tab) setTab(detail.tab);
      setOpen(true);
    };
    const onToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: 'ai' | 'messages' }>).detail;
      if (detail?.tab) setTab(detail.tab);
      setOpen(v => !v);
    };
    const onClose = () => setOpen(false);
    window.addEventListener('seshaa:chat-open', onOpen as EventListener);
    window.addEventListener('seshaa:chat-toggle', onToggle as EventListener);
    window.addEventListener('seshaa:chat-close', onClose as EventListener);
    return () => {
      window.removeEventListener('seshaa:chat-open', onOpen as EventListener);
      window.removeEventListener('seshaa:chat-toggle', onToggle as EventListener);
      window.removeEventListener('seshaa:chat-close', onClose as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setOpen(false);
  }, [pathname]);

  // Poll unread count every 30 s when user is logged in
  useEffect(() => {
    if (!user) return;
    const load = () =>
      api.get('/chat/rooms').then(r => {
        setRooms(r.data);
        setUnread(r.data.reduce((s: number, room: ChatRoom) => s + (room.unreadCount || 0), 0));
      }).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMsgs]);

  const sendAI = async () => {
    const msg = aiInput.trim();
    if (!msg) return;
    const userMsg: AIMsg = { role: 'user', content: msg };
    setAiMsgs(m => [...m, userMsg]);
    setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/ai/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [...aiMsgs, userMsg] }),
        }
      );
      const reader = res.body?.getReader();
      if (!reader) return;
      let text = '';
      setAiMsgs(m => [...m, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of new TextDecoder().decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const { text: t } = JSON.parse(data);
            text += t;
            setAiMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: text }]);
          } catch { /* ignore partial */ }
        }
      }
    } catch {
      setAiMsgs(m => [...m, { role: 'assistant', content: 'Something went wrong — please try again.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const QUICK = ['Hotels in Nairobi', 'Salons in Lagos', 'Send money to Ghana', 'Hospitals in Accra'];

  const shareLink = async (label: string, url: string) => {
    const msg = `Check this on Seshaa: ${url}`;
    setAiMsgs(m => [...m, { role: 'user', content: msg }]);
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(label);
      setTimeout(() => setShareCopied(''), 1400);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <>
      {/* ── Panel ── */}
      {open && (
        <div
          className="fixed chat-overlay z-40 flex flex-col overflow-hidden bg-white border border-gray-200 shadow-2xl md:rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ background: 'var(--cp, #008751)' }}>
            <MessageCircle size={18} className="text-white shrink-0" />
            <span className="font-bold text-white flex-1 text-sm">Seshaa Chat</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b bg-gray-50 shrink-0 text-sm">
            <button
              onClick={() => setTab('ai')}
              className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                tab === 'ai' ? 'text-purple-700 border-b-2 border-purple-500 bg-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles size={13} /> AI Support
            </button>
            <button
              onClick={() => {
                if (!user) { setOpen(false); navigate('/auth'); return; }
                setTab('messages');
              }}
              className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-colors relative ${
                tab === 'messages' ? 'bg-white border-b-2' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={tab === 'messages' ? { color: 'var(--cp)', borderColor: 'var(--cp)' } : {}}
            >
              <MessagesSquare size={13} />
              {user ? 'Messages' : 'Messages (login)'}
              {unread > 0 && (
                <span className="absolute top-1.5 right-4 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </div>

          {/* ── AI panel ── */}
          {tab === 'ai' && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {aiMsgs.length === 0 && (
                  <div className="text-center py-6 px-2">
                    <Sparkles size={28} className="mx-auto mb-2 text-purple-400" />
                    <p className="text-sm font-semibold text-gray-700">Ask Seshaa AI</p>
                    <p className="text-xs text-gray-400 mt-1">Businesses, hotels, prices, news across Africa</p>
                    <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                      {QUICK.map(s => (
                        <button
                          key={s}
                          onClick={() => setAiInput(s)}
                          className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200 hover:bg-purple-100"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 text-left">
                      <p className="text-[11px] text-gray-400 mb-1.5">Share Seshaa links</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SHARE_LINKS.map(s => (
                          <button
                            key={s.label}
                            onClick={() => shareLink(s.label, s.url)}
                            className="text-[11px] bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-200"
                          >
                            {shareCopied === s.label ? `Copied ${s.label}` : s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {aiMsgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        m.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-800'
                      }`}
                      style={m.role === 'user' ? { background: 'var(--cp, #008751)' } : {}}
                    >
                      {m.content ? <LinkifiedText text={m.content} /> : <span className="text-gray-400 animate-pulse">…</span>}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t shrink-0 flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400"
                  placeholder="Ask anything about Africa…"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendAI()}
                />
                <button
                  onClick={sendAI}
                  disabled={!aiInput.trim() || aiLoading}
                  className="bg-purple-600 text-white px-3 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50 shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}

          {/* ── Messages panel ── */}
          {tab === 'messages' && user && (
            <>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {rooms.length === 0 ? (
                  <div className="text-center text-gray-400 p-6 text-sm">
                    <MessagesSquare size={28} className="mx-auto mb-2 opacity-30" />
                    No conversations yet.<br />
                    Start by messaging a listing!
                  </div>
                ) : (
                  rooms.slice(0, 10).map(room => (
                    <button
                      key={room.id}
                      onClick={() => { setOpen(false); navigate(`/messages`); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                        style={{ background: 'var(--cp, #008751)' }}>
                        {(room.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{room.name || 'Direct Message'}</p>
                        {room.lastMessage && (
                          <p className="text-xs text-gray-400 truncate">{room.lastMessage.content}</p>
                        )}
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold">
                          {room.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
              <div className="p-3 border-t shrink-0">
                <button
                  onClick={() => { setOpen(false); navigate('/messages'); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white"
                  style={{ background: 'var(--cp, #008751)' }}
                >
                  Open full Messages <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
