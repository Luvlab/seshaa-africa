import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send, Sparkles, MessageCircle, Lock, Users, Globe,
  ChevronDown, Hash, Bot, RefreshCw, Plus,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import api, { aiSearchApi } from '../services/api';
import SeshaaTitle from '../components/brand/SeshaaTitle';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMsg {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  content: string;
  messageType: string;
  createdAt: string;
}
interface FixedChannel { channelId: string; channelType: string; label: string }
interface DmChannel    { channelId: string; lastMsg: string; lastAt: string; unread: number }
type Tab = 'ai' | 'messages' | 'admin';

const ROLE_COLOR: Record<string, string> = {
  ADMIN:          'bg-red-100 text-red-700',
  SALES_REP:      'bg-blue-100 text-blue-700',
  AMBASSADOR:     'bg-purple-100 text-purple-700',
  BUSINESS_OWNER: 'bg-green-100 text-green-700',
  USER:           'bg-gray-100 text-gray-600',
};

// ── Message bubble ────────────────────────────────────────────────────────────
function MsgBubble({ msg, myId }: { msg: ChatMsg; myId: string }) {
  const isMine = msg.senderId === myId;
  return (
    <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''} mb-3`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        isMine ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
      }`}>
        {msg.senderName.charAt(0).toUpperCase()}
      </div>
      <div className="max-w-[78%] min-w-0">
        {!isMine && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] font-semibold text-gray-700">{msg.senderName}</span>
            {msg.senderRole && (
              <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${ROLE_COLOR[msg.senderRole] ?? ROLE_COLOR.USER}`}>
                {msg.senderRole.replace('_', ' ')}
              </span>
            )}
          </div>
        )}
        <div className={`rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
          isMine ? 'text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
        }`}
          style={isMine ? { backgroundColor: 'var(--cp,#008751)' } : {}}>
          {msg.content}
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5 block px-1">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── Channel pane (3-second poll) ──────────────────────────────────────────────
function ChannelPane({ channelId, myId }: { channelId: string; myId: string }) {
  const [msgs, setMsgs]       = useState<ChatMsg[]>([]);
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAt    = useRef<string>('');

  const fetchMsgs = useCallback(async () => {
    try {
      const r = await api.get<ChatMsg[]>(`/messages/${channelId}`, {
        params: lastAt.current ? { after: lastAt.current } : {},
      });
      if (r.data.length) {
        setMsgs(prev => {
          const fresh = r.data.filter(m => !prev.some(p => p.id === m.id));
          if (!fresh.length) return prev;
          lastAt.current = fresh[fresh.length - 1].createdAt;
          return [...prev, ...fresh];
        });
      }
    } catch {}
  }, [channelId]);

  useEffect(() => {
    lastAt.current = '';
    setMsgs([]);
    fetchMsgs();
    const iv = setInterval(fetchMsgs, 3000);
    return () => clearInterval(iv);
  }, [channelId, fetchMsgs]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setSending(true); setInput('');
    try {
      const r = await api.post<ChatMsg>(`/messages/${channelId}`, { content: text });
      setMsgs(p => [...p, r.data]);
      lastAt.current = r.data.createdAt;
    } catch {}
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 gap-2">
            <MessageCircle size={32} strokeWidth={1} />
            <p className="text-sm">No messages yet — say hello!</p>
          </div>
        )}
        {msgs.map(m => <MsgBubble key={m.id} msg={m} myId={myId} />)}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-3 border-t bg-white shrink-0">
        <div className="flex gap-2 items-center bg-gray-50 rounded-2xl border px-3 py-1">
          <input className="flex-1 outline-none bg-transparent text-sm py-2 placeholder-gray-400"
            placeholder="Type a message…" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
          <button disabled={!input.trim() || sending} onClick={send}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-40 shrink-0"
            style={{ backgroundColor: 'var(--cp,#008751)' }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI pane ───────────────────────────────────────────────────────────────────
function AiPane({ isAdmin, stats }: { isAdmin: boolean; stats: Record<string, unknown> | null }) {
  const [msgs, setMsgs]   = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoad] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const PROMPTS = isAdmin ? [
    '📊 Write a marketing plan for next month based on our stats',
    '💰 Summarise financial performance and suggest improvements',
    '📣 Create a country-specific promotional strategy',
    '📈 What growth levers should we focus on this quarter?',
    '🤝 Draft a sales-rep recruitment announcement',
    '📋 Summarise all app features for an investor pitch',
  ] : [
    '🏪 Find me the best restaurants in Kampala',
    '🌍 What countries does Seshaa cover?',
    '📱 How do I list my business on Seshaa?',
    '💡 Tell me about business opportunities in Africa',
  ];

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg = { role: 'user', content };
    setMsgs(p => [...p, userMsg]);
    setInput('');
    setLoad(true);
    try {
      const ctx: Record<string, unknown> = {};
      if (isAdmin && stats) ctx.appStats = stats;
      const r = await aiSearchApi.chat([...msgs, userMsg], ctx);
      const reply = (r.data as Record<string, string>)?.reply
        ?? (r.data as Record<string, string>)?.content
        ?? (r.data as Record<string, string>)?.message
        ?? '(no response)';
      setMsgs(p => [...p, { role: 'assistant', content: reply }]);
    } catch {
      setMsgs(p => [...p, { role: 'assistant', content: '⚠️ Could not reach AI. Please try again.' }]);
    }
    setLoad(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {msgs.length === 0 && (
          <div className="py-6">
            <div className="flex flex-col items-center gap-3 mb-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles size={26} className="text-white" />
              </div>
              {/* Dynamic title: seshaa.ai */}
              <SeshaaTitle staticSuffix="ai" size="lg" />
              <p className="text-xs text-gray-500 max-w-xs">
                {isAdmin
                  ? 'I have access to your live app stats. Ask me to write plans, analyse performance, or generate content.'
                  : 'Ask me anything about African businesses, listings, or Seshaa.'}
              </p>
            </div>
            <div className="space-y-2">
              {PROMPTS.map(p => (
                <button key={p} onClick={() => send(p)}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-sm text-purple-800 transition-colors border border-purple-100">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 mb-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              m.role === 'user' ? 'bg-green-500 text-white' : 'bg-purple-600 text-white'
            }`}>
              {m.role === 'user' ? 'U' : <Bot size={14} />}
            </div>
            <div className={`max-w-[80%] min-w-0 rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
              m.role === 'user'
                ? 'text-white rounded-tr-none'
                : 'bg-purple-50 text-purple-900 rounded-tl-none border border-purple-100'
            }`}
              style={m.role === 'user' ? { backgroundColor: 'var(--cp,#008751)' } : {}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-3 border-t bg-white shrink-0">
        <div className="flex gap-2 items-center bg-gray-50 rounded-2xl border px-3 py-1">
          <Sparkles size={15} className="text-purple-400 shrink-0" />
          <input className="flex-1 outline-none bg-transparent text-sm py-2 placeholder-gray-400"
            placeholder="Ask the AI…" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
          <button disabled={!input.trim() || loading} onClick={() => send()}
            className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white disabled:opacity-40 shrink-0">
            <Send size={14} />
          </button>
        </div>
        {msgs.length > 0 && (
          <button onClick={() => setMsgs([])} className="text-[10px] text-gray-400 hover:text-gray-600 mt-1 ml-1">
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  useTranslation();
  const { user } = useAuthStore();
  const isAdmin      = user?.role === 'ADMIN';
  const isSalesRep   = user?.role === 'SALES_REP';
  const isAmbassador = user?.role === 'AMBASSADOR';
  const hasHub = isAdmin || isSalesRep || isAmbassador;

  const [tab, setTab]             = useState<Tab>('ai');
  const [fixedChs, setFixed]      = useState<FixedChannel[]>([]);
  const [dmChs, setDms]           = useState<DmChannel[]>([]);
  const [active, setActive]       = useState<string | null>(null);
  const [newDmId, setNewDmId]     = useState('');
  const [showNewDm, setShowNewDm] = useState(false);
  const [stats, setStats]         = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded]       = useState(false);
  const [dmOpen, setDmOpen]       = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get('/messages/channels/list')
      .then(r => { setFixed(r.data.fixed || []); setDms(r.data.dms || []); setLoaded(true); })
      .catch(() => setLoaded(true));
    if (isAdmin) api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, [user, isAdmin]);

  const refreshDms = () => {
    api.get('/messages/channels/list').then(r => { setFixed(r.data.fixed || []); setDms(r.data.dms || []); }).catch(() => {});
  };

  const startDm = async () => {
    if (!newDmId.trim()) return;
    try {
      const r = await api.post('/messages/dm/start', { recipientId: newDmId.trim() });
      setActive(r.data.channelId); setTab('messages');
      setShowNewDm(false); setNewDmId('');
    } catch {}
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <MessageCircle size={48} className="text-gray-300 mb-4" strokeWidth={1} />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Sign in to chat</h2>
        <p className="text-sm text-gray-500 mb-5">Chat with sellers, listing owners, and Seshaa AI.</p>
        <a href="/auth" className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ backgroundColor: 'var(--cp,#008751)' }}>Sign In</a>
      </div>
    );
  }

  // Tab metadata — dynamic title changes the SeshaaTitle suffix in Navbar
  const TABS = [
    { id: 'ai' as Tab,       icon: <Sparkles size={13} />,      label: 'AI',        suffix: 'ai'   },
    { id: 'messages' as Tab, icon: <MessageCircle size={13} />, label: 'Chat',      suffix: 'chat' },
    ...(hasHub ? [{ id: 'admin' as Tab, icon: <Lock size={13} />, label: 'Staff Hub', suffix: 'staff' }] : []),
  ];

  return (
    <div className="flex h-[calc(100svh-86px-var(--player-bar-h,0px))] overflow-hidden bg-gray-50">

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <div className="hidden md:flex w-60 shrink-0 flex-col bg-white border-r border-gray-200">
        {/* Tab strip */}
        <div className="flex border-b border-gray-200 shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                tab === t.id ? 'border-b-2' : 'text-gray-400 hover:text-gray-600'
              }`}
              style={tab === t.id ? { borderBottomColor: 'var(--cp,#008751)', color: 'var(--cp,#008751)' } : {}}>
              {t.icon}
              {/* Dynamic SeshaaTitle per tab */}
              <SeshaaTitle staticSuffix={t.suffix} size="sm" />
            </button>
          ))}
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto py-2">
          {tab === 'ai' && (
            <div className="px-4 py-8 text-center">
              <Bot size={28} className="mx-auto mb-2 text-purple-300" />
              <p className="text-xs text-gray-500 mt-1">Powered by OpenRouter</p>
            </div>
          )}
          {tab === 'messages' && (
            <>
              <div className="px-3 py-1.5 flex items-center justify-between">
                <button onClick={() => setDmOpen(v => !v)}
                  className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider">
                  <ChevronDown size={11} className={`transition-transform ${dmOpen ? '' : '-rotate-90'}`} />
                  Direct Messages
                </button>
                <div className="flex gap-0.5">
                  <button onClick={refreshDms} className="p-1 text-gray-400 hover:text-gray-600"><RefreshCw size={11} /></button>
                  <button onClick={() => setShowNewDm(v => !v)} className="p-1 text-gray-400 hover:text-gray-600"><Plus size={13} /></button>
                </div>
              </div>
              {showNewDm && (
                <div className="px-3 pb-2 flex gap-1">
                  <input className="flex-1 text-xs border rounded-lg px-2 py-1.5 outline-none min-w-0"
                    placeholder="User ID…" value={newDmId}
                    onChange={e => setNewDmId(e.target.value)} onKeyDown={e => e.key === 'Enter' && startDm()} />
                  <button onClick={startDm} className="px-2 py-1.5 rounded-lg text-white text-xs font-bold shrink-0" style={{ backgroundColor: 'var(--cp,#008751)' }}>Go</button>
                </div>
              )}
              {dmOpen && dmChs.map(dm => (
                <button key={dm.channelId} onClick={() => setActive(dm.channelId)}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors ${active === dm.channelId ? 'bg-gray-100' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                    {dm.channelId.replace('dm:', '').replace(user.id, '').replace(':', '').charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{dm.channelId.replace('dm:', '').replace(user.id, '').replace(/^:/, '')}</p>
                    <p className="text-[10px] text-gray-400 truncate">{dm.lastMsg}</p>
                  </div>
                  {dm.unread > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: 'var(--cp,#008751)' }}>{dm.unread}</span>}
                </button>
              ))}
              {dmOpen && loaded && dmChs.length === 0 && <p className="px-4 py-2 text-xs text-gray-400">No conversations yet</p>}
            </>
          )}
          {tab === 'admin' && hasHub && (
            <>
              <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staff Channels</p>
              {fixedChs.map(ch => (
                <button key={ch.channelId} onClick={() => setActive(ch.channelId)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors ${active === ch.channelId ? 'bg-gray-100' : ''}`}>
                  <Hash size={13} className="text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{ch.label}</span>
                </button>
              ))}
              {fixedChs.length === 0 && <p className="px-4 py-2 text-xs text-gray-400">No channels for your role</p>}
            </>
          )}
        </div>
      </div>

      {/* ── Main pane ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile tab bar */}
        <div className="md:hidden flex border-b border-gray-200 bg-white shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${tab === t.id ? 'border-b-2' : 'text-gray-400'}`}
              style={tab === t.id ? { borderBottomColor: 'var(--cp,#008751)', color: 'var(--cp,#008751)' } : {}}>
              {t.icon}
              <SeshaaTitle staticSuffix={t.suffix} size="sm" />
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* AI tab */}
          {tab === 'ai' && <AiPane isAdmin={isAdmin} stats={stats} />}

          {/* Messages tab */}
          {tab === 'messages' && (
            active ? (
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 bg-white border-b flex items-center gap-2 shrink-0">
                  <button onClick={() => setActive(null)} className="md:hidden text-gray-400 mr-1 text-lg">‹</button>
                  <SeshaaTitle staticSuffix="chat" size="sm" />
                  <span className="text-xs text-gray-400 ml-1">/ {active.replace('dm:', '').replace(user.id, '').replace(/^:/, '') || 'Chat'}</span>
                  <span className="ml-auto text-[10px] text-gray-400 shrink-0">3 s poll</span>
                </div>
                <div className="flex-1 overflow-hidden"><ChannelPane channelId={active} myId={user.id} /></div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                <MessageCircle size={40} className="text-gray-300 mb-3" strokeWidth={1} />
                <SeshaaTitle staticSuffix="chat" size="md" className="mb-1" />
                <p className="text-sm text-gray-500 mb-4">Direct-message listing owners or other users</p>
                {dmChs.length > 0 && (
                  <div className="w-full max-w-xs space-y-1 text-left mb-4">
                    {dmChs.slice(0, 5).map(dm => (
                      <button key={dm.channelId} onClick={() => setActive(dm.channelId)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white border hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-500 shrink-0">
                          {dm.channelId.replace('dm:', '').replace(user.id, '').replace(':', '').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{dm.channelId.replace('dm:', '').replace(user.id, '').replace(/^:/, '')}</p>
                          <p className="text-[10px] text-gray-400 truncate">{dm.lastMsg}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowNewDm(v => !v)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
                  style={{ backgroundColor: 'var(--cp,#008751)' }}>
                  <Plus size={15} /> New Message
                </button>
                {showNewDm && (
                  <div className="mt-3 flex gap-2 w-full max-w-xs">
                    <input className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none min-w-0"
                      placeholder="User ID…" value={newDmId}
                      onChange={e => setNewDmId(e.target.value)} onKeyDown={e => e.key === 'Enter' && startDm()} />
                    <button onClick={startDm} className="px-3 py-2 rounded-xl text-white text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--cp,#008751)' }}>Go</button>
                  </div>
                )}
              </div>
            )
          )}

          {/* Admin Hub */}
          {tab === 'admin' && hasHub && (
            active ? (
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 bg-white border-b flex items-center gap-2 shrink-0">
                  <button onClick={() => setActive(null)} className="md:hidden text-gray-400 mr-1 text-lg">‹</button>
                  <Lock size={14} className="text-gray-400" />
                  <span className="font-semibold text-sm text-gray-800">{fixedChs.find(c => c.channelId === active)?.label ?? active}</span>
                  <span className="ml-auto text-[10px] text-gray-400 shrink-0">Staff only</span>
                </div>
                <div className="flex-1 overflow-hidden"><ChannelPane channelId={active} myId={user.id} /></div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                <Lock size={40} className="text-gray-300 mb-3" strokeWidth={1} />
                <p className="font-semibold text-gray-700 mb-1">Staff Hub</p>
                <p className="text-sm text-gray-500 mb-5">Dedicated channels for coordination</p>
                <div className="w-full max-w-xs space-y-2">
                  {fixedChs.map(ch => (
                    <button key={ch.channelId} onClick={() => setActive(ch.channelId)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border hover:bg-gray-50 transition-colors">
                      {ch.channelType === 'admin'       && <Lock  size={15} className="text-red-400" />}
                      {ch.channelType === 'salesreps'   && <Users size={15} className="text-blue-400" />}
                      {ch.channelType === 'ambassadors' && <Globe size={15} className="text-purple-400" />}
                      <span className="font-medium text-gray-800 text-sm">{ch.label}</span>
                    </button>
                  ))}
                  {fixedChs.length === 0 && <p className="text-sm text-gray-400">No channels for your role</p>}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
