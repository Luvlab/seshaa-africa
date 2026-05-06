import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send, Sparkles, MessageCircle, Lock, Users, Globe,
  Bot, Plus, X, ArrowLeft, Building2, User2, Trash2,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import api, { aiSearchApi } from '../services/api';
import SeshaaTitle from '../components/brand/SeshaaTitle';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMsg {
  id: string; channelId: string; senderId: string;
  senderName: string; senderRole?: string;
  content: string; messageType: string; createdAt: string;
}
interface FixedChannel  { channelId: string; channelType: string; label: string }
interface DmChannel     { channelId: string; lastMsg: string; lastAt: string; unread: number }
interface FollowItem {
  id: string;
  followingUser?:    { id: string; name: string; role: string; avatarUrl?: string } | null;
  followingListing?: { id: string; name: string; city?: string; country?: string } | null;
}
interface ChatGroup {
  id: string; name: string; creatorId: string; creatorName?: string;
  memberIds: string[]; channelId: string; createdAt: string;
}
type Tab = 'ai' | 'dms' | 'follows' | 'groups' | 'staff';

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700', SALES_REP: 'bg-blue-100 text-blue-700',
  AMBASSADOR: 'bg-purple-100 text-purple-700', BUSINESS_OWNER: 'bg-green-100 text-green-700',
  USER: 'bg-gray-100 text-gray-600',
};

// ── Message bubble ────────────────────────────────────────────────────────────
function MsgBubble({ msg, myId }: { msg: ChatMsg; myId: string }) {
  const isMine = msg.senderId === myId;
  return (
    <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''} mb-3`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMine ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
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
        <div className={`rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${isMine ? 'text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}
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

// ── Channel pane ──────────────────────────────────────────────────────────────
function ChannelPane({ channelId, myId, label, onBack }: { channelId: string; myId: string; label?: string; onBack: () => void }) {
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

  useEffect(() => { lastAt.current = ''; setMsgs([]); fetchMsgs(); const iv = setInterval(fetchMsgs, 3000); return () => clearInterval(iv); }, [channelId, fetchMsgs]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim(); setSending(true); setInput('');
    try {
      const r = await api.post<ChatMsg>(`/messages/${channelId}`, { content: text });
      setMsgs(p => [...p, r.data]); lastAt.current = r.data.createdAt;
    } catch {}
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-white border-b flex items-center gap-2 shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <span className="font-semibold text-sm text-gray-800 truncate flex-1">{label ?? channelId}</span>
        <span className="text-[10px] text-gray-400 shrink-0">live</span>
      </div>
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
    '📊 Write a marketing plan for next month',
    '💰 Summarise financial performance',
    '📣 Create a country-specific promo strategy',
    '🤝 Draft a sales-rep recruitment announcement',
  ] : [
    '🏪 Find me the best restaurants in Kampala',
    '🌍 What countries does Seshaa cover?',
    '📱 How do I list my business on Seshaa?',
    '💡 Business opportunities in Africa',
  ];

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg = { role: 'user', content };
    setMsgs(p => [...p, userMsg]); setInput(''); setLoad(true);
    try {
      const ctx: Record<string, unknown> = {};
      if (isAdmin && stats) ctx.appStats = stats;
      const r = await aiSearchApi.chat([...msgs, userMsg], ctx);
      const reply = (r.data as Record<string, string>)?.reply ?? (r.data as Record<string, string>)?.content ?? '(no response)';
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
              <SeshaaTitle staticSuffix="ai" size="lg" />
              <p className="text-xs text-gray-500 max-w-xs">
                {isAdmin ? 'Access to live app stats. Ask me to analyse, write plans, or generate content.' : 'Ask me anything about African businesses, listings, or Seshaa.'}
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
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.role === 'user' ? 'bg-green-500 text-white' : 'bg-purple-600 text-white'}`}>
              {m.role === 'user' ? 'U' : <Bot size={14} />}
            </div>
            <div className={`max-w-[80%] min-w-0 rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${m.role === 'user' ? 'text-white rounded-tr-none' : 'bg-purple-50 text-purple-900 rounded-tl-none border border-purple-100'}`}
              style={m.role === 'user' ? { backgroundColor: 'var(--cp,#008751)' } : {}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0"><Bot size={14} className="text-white" /></div>
            <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
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
          <button onClick={() => setMsgs([])} className="text-[10px] text-gray-400 hover:text-gray-600 mt-1 ml-1">Clear conversation</button>
        )}
      </div>
    </div>
  );
}

// ── Create Group Modal ────────────────────────────────────────────────────────
function CreateGroupModal({ follows, onCreated, onClose }: {
  follows: FollowItem[];
  onCreated: (g: ChatGroup) => void;
  onClose: () => void;
}) {
  const [name, setName]       = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving]   = useState(false);

  const userFollows = follows.filter(f => f.followingUser);

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const create = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const r = await api.post<ChatGroup>('/groups', { name: name.trim(), memberIds: selected });
      onCreated(r.data);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-4 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">New Group Chat</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <input
            className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none"
            placeholder="Group name…"
            value={name} onChange={e => setName(e.target.value)}
            autoFocus
          />
          {userFollows.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Add from follows</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {userFollows.map(f => {
                  const u = f.followingUser!;
                  const on = selected.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggle(u.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${on ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-800 truncate flex-1">{u.name}</span>
                      {on && <span className="text-green-500 text-xs font-bold shrink-0">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={create} disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: 'var(--cp,#008751)' }}>
            {saving ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ChatPage ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  useTranslation();
  const { user } = useAuthStore();
  const isAdmin      = user?.role === 'ADMIN';
  const isSalesRep   = user?.role === 'SALES_REP';
  const isAmbassador = user?.role === 'AMBASSADOR';
  const hasHub = isAdmin || isSalesRep || isAmbassador;

  const [tab, setTab]           = useState<Tab>('ai');
  const [activeChannel, setActiveChannel] = useState<{ id: string; label: string } | null>(null);

  // DMs data
  const [fixedChs, setFixed]    = useState<FixedChannel[]>([]);
  const [dmChs, setDms]         = useState<DmChannel[]>([]);
  const [listingChs, setListing] = useState<{ channelId: string; label: string }[]>([]);

  // Follows
  const [follows, setFollows]   = useState<FollowItem[]>([]);
  const [followsLoaded, setFollowsLoaded] = useState(false);

  // Groups
  const [groups, setGroups]     = useState<ChatGroup[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // AI stats (admin only)
  const [stats, setStats]       = useState<Record<string, unknown> | null>(null);

  // New DM
  const [newDmId, setNewDmId]   = useState('');
  const [showNewDm, setShowNewDm] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/messages/channels/list')
      .then(r => { setFixed(r.data.fixed || []); setDms(r.data.dms || []); setListing(r.data.listingChannels || []); })
      .catch(() => {});
    if (isAdmin) api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || tab !== 'follows' || followsLoaded) return;
    api.get<FollowItem[]>('/follows/my').then(r => { setFollows(r.data); setFollowsLoaded(true); }).catch(() => setFollowsLoaded(true));
  }, [user, tab, followsLoaded]);

  useEffect(() => {
    if (!user || tab !== 'groups' || groupsLoaded) return;
    api.get<ChatGroup[]>('/groups').then(r => { setGroups(r.data); setGroupsLoaded(true); }).catch(() => setGroupsLoaded(true));
  }, [user, tab, groupsLoaded]);

  const openChannel = (channelId: string, label: string) => {
    setActiveChannel({ id: channelId, label });
  };

  const startDm = async () => {
    if (!newDmId.trim()) return;
    try {
      const r = await api.post('/messages/dm/start', { recipientId: newDmId.trim() });
      openChannel(r.data.channelId, `DM · ${newDmId.trim()}`);
      setTab('dms'); setShowNewDm(false); setNewDmId('');
    } catch {}
  };

  const startDmWithUser = async (userId: string, name: string) => {
    try {
      const r = await api.post('/messages/dm/start', { recipientId: userId });
      openChannel(r.data.channelId, name);
      setTab('dms');
    } catch {}
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await api.delete(`/groups/${groupId}`);
      setGroups(gs => gs.filter(g => g.id !== groupId));
      if (activeChannel?.id === `group:${groupId}`) setActiveChannel(null);
    } catch {}
  };

  // ── If channel active, show full-screen pane ────────────────────────────────
  if (activeChannel) {
    return (
      <div className="flex flex-col h-[calc(100svh-var(--nav-h,56px)-var(--tab-h,60px)-var(--player-bar-h,0px))] md:h-[calc(100svh-var(--nav-h,92px)-var(--player-bar-h,0px))] overflow-hidden bg-gray-50">
        <ChannelPane
          channelId={activeChannel.id}
          myId={user!.id}
          label={activeChannel.label}
          onBack={() => setActiveChannel(null)}
        />
      </div>
    );
  }

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

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'ai',      icon: <Sparkles size={15} />,      label: 'AI' },
    { id: 'dms',     icon: <MessageCircle size={15} />, label: 'DMs' },
    { id: 'follows', icon: <User2 size={15} />,         label: 'Follows' },
    { id: 'groups',  icon: <Users size={15} />,         label: 'Groups' },
    ...(hasHub ? [{ id: 'staff' as Tab, icon: <Lock size={15} />, label: 'Staff' }] : []),
  ];

  return (
    <div className="flex flex-col h-[calc(100svh-var(--nav-h,56px)-var(--tab-h,60px)-var(--player-bar-h,0px))] md:h-[calc(100svh-var(--nav-h,92px)-var(--player-bar-h,0px))] overflow-hidden bg-gray-50">

      {/* ── Tab bar ── */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors border-b-2 ${
              tab === t.id ? 'border-b-2' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
            style={tab === t.id ? { borderBottomColor: 'var(--cp,#008751)', color: 'var(--cp,#008751)' } : {}}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* AI */}
        {tab === 'ai' && <AiPane isAdmin={isAdmin} stats={stats} />}

        {/* DMs */}
        {tab === 'dms' && (
          <div className="h-full overflow-y-auto">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Direct Messages</p>
              <button onClick={() => setShowNewDm(v => !v)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
                style={{ backgroundColor: 'var(--cp,#008751)' }}>
                <Plus size={12} /> New DM
              </button>
            </div>
            {showNewDm && (
              <div className="px-4 pb-3 flex gap-2">
                <input className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none min-w-0"
                  placeholder="Paste a User ID to start a DM…"
                  value={newDmId} onChange={e => setNewDmId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startDm()} />
                <button onClick={startDm} className="px-3 py-2 rounded-xl text-white text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--cp,#008751)' }}>Go</button>
              </div>
            )}
            {dmChs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <MessageCircle size={36} strokeWidth={1} />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs text-gray-400">Start by messaging someone from your Follows tab</p>
              </div>
            )}
            <div className="px-3 space-y-1">
              {dmChs.map(dm => {
                const otherId = dm.channelId.replace('dm:', '').replace(user.id, '').replace(/^:|:$/, '');
                return (
                  <button key={dm.channelId} onClick={() => openChannel(dm.channelId, `DM · ${otherId}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">
                      {otherId.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{otherId}</p>
                      <p className="text-xs text-gray-400 truncate">{dm.lastMsg}</p>
                    </div>
                    {dm.unread > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: 'var(--cp,#008751)' }}>{dm.unread}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {listingChs.length > 0 && (
              <>
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Business Channels</p>
                </div>
                <div className="px-3 space-y-1">
                  {listingChs.map(ch => (
                    <button key={ch.channelId} onClick={() => openChannel(ch.channelId, ch.label)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-800 truncate flex-1">{ch.label.replace('🏢 ', '')}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="h-4" />
          </div>
        )}

        {/* Follows */}
        {tab === 'follows' && (
          <div className="h-full overflow-y-auto">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">People you follow</p>
            </div>
            {!followsLoaded && <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>}
            {followsLoaded && follows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <User2 size={36} strokeWidth={1} />
                <p className="text-sm">Not following anyone yet</p>
                <p className="text-xs">Follow users or businesses from their profiles</p>
              </div>
            )}
            <div className="px-3 space-y-1">
              {follows.filter(f => f.followingUser).map(f => {
                const u = f.followingUser!;
                return (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                        : u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.role.replace('_', ' ')}</p>
                    </div>
                    <button onClick={() => startDmWithUser(u.id, u.name)}
                      className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                      style={{ backgroundColor: 'var(--cp,#008751)' }}>
                      Message
                    </button>
                  </div>
                );
              })}
            </div>
            {follows.filter(f => f.followingListing).length > 0 && (
              <>
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Businesses you follow</p>
                </div>
                <div className="px-3 space-y-1">
                  {follows.filter(f => f.followingListing).map(f => {
                    const l = f.followingListing!;
                    return (
                      <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Building2 size={16} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{l.name}</p>
                          <p className="text-xs text-gray-400">{l.city}{l.country ? `, ${l.country}` : ''}</p>
                        </div>
                        <button onClick={() => openChannel(`listing:${l.id}`, l.name)}
                          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                          style={{ backgroundColor: 'var(--cp,#008751)' }}>
                          Chat
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <div className="h-4" />
          </div>
        )}

        {/* Groups */}
        {tab === 'groups' && (
          <div className="h-full overflow-y-auto">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Group Chats</p>
              <button onClick={() => setShowCreateGroup(true)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
                style={{ backgroundColor: 'var(--cp,#008751)' }}>
                <Plus size={12} /> New Group
              </button>
            </div>
            {!groupsLoaded && <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>}
            {groupsLoaded && groups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <Users size={36} strokeWidth={1} />
                <p className="text-sm">No group chats yet</p>
                <p className="text-xs">Create a group to chat with multiple people at once</p>
              </div>
            )}
            <div className="px-3 space-y-1">
              {groups.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm"
                    style={{ backgroundColor: 'var(--cp,#008751)' }}>
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.memberIds.length} member{g.memberIds.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openChannel(g.channelId, g.name)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                      style={{ backgroundColor: 'var(--cp,#008751)' }}>
                      Open
                    </button>
                    {g.creatorId === user.id && (
                      <button onClick={() => deleteGroup(g.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="h-4" />
            {showCreateGroup && (
              <CreateGroupModal
                follows={followsLoaded ? follows : []}
                onCreated={g => { setGroups(gs => [g, ...gs]); setShowCreateGroup(false); openChannel(g.channelId, g.name); }}
                onClose={() => setShowCreateGroup(false)}
              />
            )}
          </div>
        )}

        {/* Staff Hub */}
        {tab === 'staff' && hasHub && (
          <div className="h-full overflow-y-auto">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Channels</p>
            </div>
            {fixedChs.length === 0 && <p className="px-4 py-2 text-sm text-gray-400">No channels for your role</p>}
            <div className="px-3 space-y-1">
              {fixedChs.map(ch => (
                <button key={ch.channelId} onClick={() => openChannel(ch.channelId, ch.label)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border hover:bg-gray-50 transition-colors">
                  {ch.channelType === 'admin'       && <Lock  size={15} className="text-red-400 shrink-0" />}
                  {ch.channelType === 'salesreps'   && <Users size={15} className="text-blue-400 shrink-0" />}
                  {ch.channelType === 'ambassadors' && <Globe size={15} className="text-purple-400 shrink-0" />}
                  <span className="font-medium text-gray-800 text-sm">{ch.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
