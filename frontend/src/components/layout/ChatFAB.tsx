/**
 * ChatFAB — Global chat overlay for Seshaa.
 *
 * Opens as a single window defaulting to Seshaa.ai Support.
 * Messages list is accessible via the header link.
 * Starts exactly below the navbar and stops above the bottom tab bar on mobile.
 */
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Sparkles, Send, MessagesSquare, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import api from '../../services/api';
import type { ChatRoom } from '../../types';
import SeshaaTitle from '../brand/SeshaaTitle';

interface AIMsg { role: 'user' | 'assistant'; content: string; }

const SHARE_LINKS = [
  { label: 'Home',        url: 'https://www.seshaa.africa/' },
  { label: 'Directory',   url: 'https://www.seshaa.africa/search' },
  { label: 'News',        url: 'https://www.seshaa.africa/news' },
  { label: 'Classifieds', url: 'https://www.seshaa.africa/classifieds' },
  { label: 'Prices',      url: 'https://www.seshaa.africa/prices' },
  { label: 'Events',      url: 'https://www.seshaa.africa/events' },
];

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">{part}</a>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

interface LMsg { id: string; senderId: string; senderName: string; content: string; createdAt: string; }

function ListingChatPane({ channelId, label, onBack, userId }: { channelId: string; label: string; onBack: () => void; userId: string }) {
  const [msgs, setMsgs] = useState<LMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get<LMsg[]>(`/messages/${channelId}`);
        setMsgs(r.data);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [channelId]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await api.post(`/messages/${channelId}`, { content });
      setInput('');
      const r = await api.get<LMsg[]>(`/messages/${channelId}`);
      setMsgs(r.data);
    } catch { /* ignore */ }
    setSending(false);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center gap-2 shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-lg leading-none">‹</button>
        <span className="text-sm font-semibold text-gray-800 truncate flex-1">{label.replace('🏢 ', '')}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 overscroll-contain">
        {msgs.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-xs">No messages yet. Start the conversation!</div>
        )}
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.senderId === userId ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              {m.senderId !== userId && (
                <p className="text-[10px] text-gray-500 mb-0.5 px-1">{m.senderName}</p>
              )}
              <div className={`rounded-2xl px-3 py-2 text-sm ${m.senderId === userId ? 'text-white' : 'bg-gray-100 text-gray-800'}`}
                style={m.senderId === userId ? { background: 'var(--cp,#008751)' } : {}}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t shrink-0 flex gap-2">
        <input
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-400"
          placeholder="Message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={send} disabled={!input.trim() || sending}
          className="text-white px-3 py-2 rounded-xl disabled:opacity-50 shrink-0"
          style={{ background: 'var(--cp,#008751)' }}>
          <Send size={16} />
        </button>
      </div>
    </>
  );
}

export default function ChatFAB() {
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [open, setOpen]           = useState(false);
  // 'ai' = Seshaa AI support (default), 'messages' = DM list
  const [view, setView]           = useState<'ai' | 'messages'>('ai');
  const [aiInput, setAiInput]     = useState('');
  const [aiMsgs, setAiMsgs]       = useState<AIMsg[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [rooms, setRooms]         = useState<ChatRoom[]>([]);
  const [unread, setUnread]       = useState(0);
  const [shareCopied, setShareCopied] = useState('');
  const [listingChannels, setListingChannels] = useState<{ channelId: string; label: string }[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Event listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: 'ai' | 'messages' }>).detail;
      // Default to 'ai' unless explicitly set to 'messages'
      setView(detail?.tab === 'messages' ? 'messages' : 'ai');
      setOpen(true);
    };
    const onToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: 'ai' | 'messages' }>).detail;
      setView(detail?.tab === 'messages' ? 'messages' : 'ai');
      setOpen(v => !v);
    };
    const onClose = () => setOpen(false);

    window.addEventListener('seshaa:chat-open',   onOpen    as EventListener);
    window.addEventListener('seshaa:chat-toggle', onToggle  as EventListener);
    window.addEventListener('seshaa:chat-close',  onClose);
    return () => {
      window.removeEventListener('seshaa:chat-open',   onOpen    as EventListener);
      window.removeEventListener('seshaa:chat-toggle', onToggle  as EventListener);
      window.removeEventListener('seshaa:chat-close',  onClose);
    };
  }, []);

  // Close when navigating
  useEffect(() => { setOpen(false); }, [pathname]);

  // Poll unread DM count and listing channels
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [roomsRes, chRes] = await Promise.all([
          api.get('/chat/rooms'),
          api.get('/messages/channels/list'),
        ]);
        setRooms(roomsRes.data);
        setUnread(roomsRes.data.reduce((s: number, room: ChatRoom) => s + (room.unreadCount || 0), 0));
        setListingChannels(chRes.data.listingChannels || []);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [user]);

  // Auto-scroll to newest AI message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMsgs]);

  // ── AI chat send ──────────────────────────────────────────────────────────
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

  const shareLink = async (label: string, url: string) => {
    setAiMsgs(m => [...m, { role: 'user', content: `Check this on Seshaa: ${url}` }]);
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(label);
      setTimeout(() => setShareCopied(''), 1400);
    } catch { /* ignore */ }
  };

  const QUICK = ['Hotels in Nairobi', 'Salons in Lagos', 'Send money to Ghana', 'Hospitals in Accra'];

  if (!open) return null;

  return (
    <div className="fixed chat-overlay z-40 flex flex-col overflow-hidden bg-white md:border md:border-gray-200 md:shadow-2xl md:rounded-2xl">

      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ background: 'var(--cp, #008751)' }}
      >
        {view === 'ai' ? (
          <Sparkles size={16} className="text-white/80 shrink-0" />
        ) : (
          <MessagesSquare size={16} className="text-white/80 shrink-0" />
        )}
        <div className="flex-1">
          <SeshaaTitle staticSuffix={view === 'ai' ? 'ai' : 'chat'} size="sm" />
        </div>

        {/* Toggle to messages / back to AI */}
        {user && view === 'ai' && (
          <button
            onClick={() => setView('messages')}
            className="flex items-center gap-1 text-white/75 hover:text-white text-xs font-medium px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <MessagesSquare size={12} />
            DMs
            {unread > 0 && (
              <span className="ml-0.5 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        )}
        {view === 'messages' && (
          <button
            onClick={() => setView('ai')}
            className="flex items-center gap-1 text-white/75 hover:text-white text-xs font-medium px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Sparkles size={12} /> AI
          </button>
        )}

        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white ml-1">
          <X size={16} />
        </button>
      </div>

      {/* ── AI Support view ── */}
      {view === 'ai' && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 overscroll-contain">
            {aiMsgs.length === 0 && (
              <div className="text-center py-6 px-2">
                <Sparkles size={28} className="mx-auto mb-2 text-theme" />
                <p className="text-sm font-semibold text-gray-700">Ask Seshaa AI</p>
                <p className="text-xs text-gray-400 mt-1">Businesses, hotels, prices, news across Africa</p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {QUICK.map(s => (
                    <button
                      key={s}
                      onClick={() => setAiInput(s)}
                      className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-200"
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
                        {shareCopied === s.label ? `✓ ${s.label}` : s.label}
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
                  {m.content
                    ? <LinkifiedText text={m.content} />
                    : <span className="text-gray-400 animate-pulse">…</span>}
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

      {/* ── Listing channel chat view ── */}
      {view === 'messages' && activeChannel && (
        <ListingChatPane
          channelId={activeChannel}
          label={listingChannels.find(c => c.channelId === activeChannel)?.label ?? activeChannel}
          onBack={() => setActiveChannel(null)}
          userId={user?.id ?? ''}
        />
      )}

      {/* ── Messages (DMs) view ── */}
      {view === 'messages' && !activeChannel && (
        <>
          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <MessagesSquare size={32} className="text-gray-300" />
              <p className="text-sm text-gray-500">Sign in to view your messages</p>
              <button
                onClick={() => { setOpen(false); navigate('/auth'); }}
                className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
                style={{ background: 'var(--cp, #008751)' }}
              >
                Sign in
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50 overscroll-contain">
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
                      onClick={() => { setOpen(false); navigate('/messages'); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                        style={{ background: 'var(--cp, #008751)' }}
                      >
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
                {listingChannels.length > 0 && (
                  <div className="border-t border-gray-100">
                    <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business Chats</p>
                    {listingChannels.map(ch => (
                      <button
                        key={ch.channelId}
                        onClick={() => setActiveChannel(ch.channelId)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white bg-emerald-600">
                          🏢
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{ch.label.replace('🏢 ', '')}</p>
                          <p className="text-xs text-gray-400">Community chat</p>
                        </div>
                      </button>
                    ))}
                  </div>
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
        </>
      )}
    </div>
  );
}
