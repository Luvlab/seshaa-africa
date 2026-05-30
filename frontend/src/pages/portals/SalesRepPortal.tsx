import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, DollarSign, Megaphone, Trophy, Plus, CheckCircle, Send,
  MapPin, Phone, User, Bot, MessageSquare, Lightbulb, Bug, ChevronUp,
  RefreshCw, CheckCheck, Clock, XCircle, AlertCircle, Sparkles,
  BarChart2, Users,
} from 'lucide-react';
import { salesRepApi, feedbackApi, messagesApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  stats: { totalEarned: number; unpaid: number; paid: number; adCount: number; commissionRate: string };
  recentCommissions: { id: string; amount: number; rate: number; paid: boolean; ad: { title: string; advertiser: string }; createdAt: string }[];
  salesRep: { territory: string; country: string };
}
interface FeedbackItem {
  id: string; userId: string; userName?: string; userAvatar?: string;
  type: 'bug' | 'feature' | 'other'; title: string; description?: string;
  status: 'open' | 'in_progress' | 'done' | 'wont_fix'; priority: 'low' | 'normal' | 'high';
  upvotes: number; upvoterIds: string[]; adminReply?: string;
  createdAt: string;
}
interface ChatMsg { role: 'user' | 'assistant'; content: string; }
interface DmMsg   { id: string; content: string; senderId: string; createdAt: string; }

type DashTab = 'dashboard' | 'ai' | 'chat' | 'feedback';

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  open:        { label: 'Open',        cls: 'bg-blue-100 text-blue-700',   icon: <Clock size={12} /> },
  in_progress: { label: 'In Progress', cls: 'bg-yellow-100 text-yellow-700', icon: <RefreshCw size={12} /> },
  done:        { label: 'Done',        cls: 'bg-green-100 text-green-700', icon: <CheckCheck size={12} /> },
  wont_fix:    { label: "Won't Fix",   cls: 'bg-gray-100 text-gray-500',   icon: <XCircle size={12} /> },
};
const TYPE_STYLE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  bug:     { label: 'Bug',     cls: 'bg-red-100 text-red-700',     icon: <Bug size={12} /> },
  feature: { label: 'Feature', cls: 'bg-purple-100 text-purple-700', icon: <Lightbulb size={12} /> },
  other:   { label: 'Other',   cls: 'bg-gray-100 text-gray-600',   icon: <AlertCircle size={12} /> },
};

const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001/api';

// ─── AI Chat ─────────────────────────────────────────────────────────────────
function AiChatTab({ user }: { user: { name?: string } | null }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'assistant', content: `Hey${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! 👋 I'm your Seshaa Sales AI.\n\nAsk me anything — pricing, how to pitch clients, objection handling, your territory, or how the platform works.` },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('seshaa-token');

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    const newMsgs: ChatMsg[] = [...msgs, { role: 'user', content: q }];
    setMsgs(newMsgs);
    setBusy(true);

    const history = newMsgs.slice(-10).map(m => ({ role: m.role, content: m.content }));
    const context = { role: 'sales_rep', platform: 'Seshaa Africa' };

    try {
      const resp = await fetch(`${BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `[SALES REP CONTEXT] You are a dedicated sales coach and assistant for Seshaa Africa sales reps. Help them close deals, handle objections, understand packages, earn more commissions, and use the Seshaa platform effectively. Be encouraging, practical, and Africa-focused.\n\nRep question: ${q}`,
            },
          ].concat(history.slice(1).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))),
          context,
        }),
      });

      if (!resp.body) throw new Error('no stream');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';
      setMsgs(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { text } = JSON.parse(payload) as { text: string };
            if (text) {
              aiText += text;
              setMsgs(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: aiText };
                return next;
              });
            }
          } catch { /* ok */ }
        }
      }
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${
              m.role === 'user' ? 'bg-purple-600' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
            }`}>
              {m.role === 'user' ? (user?.name?.[0] || 'Y') : <Sparkles size={14} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-purple-600 text-white rounded-tr-sm'
                : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm'
            }`}>
              {m.content || <span className="inline-block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-400"
            placeholder="Ask anything about selling Seshaa…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={busy}
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--cp)' }}
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">AI responses may not always be accurate — verify important info with your manager.</p>
      </div>
    </div>
  );
}

// ─── Team Chat (DM to admin channel) ─────────────────────────────────────────
const SALES_CHANNEL = 'salesreps';

function TeamChatTab({ user }: { user: { id: string; name?: string } | null }) {
  const [msgs,    setMsgs]    = useState<DmMsg[]>([]);
  const [input,   setInput]   = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMsgs = useCallback(async () => {
    try {
      const r = await messagesApi.list(SALES_CHANNEL, undefined, 80);
      setMsgs((r.data as DmMsg[]).reverse());
    } catch { /* ok */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadMsgs(); }, [loadMsgs]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const sendMsg = async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setInput('');
    setSending(true);
    try {
      await messagesApi.send(SALES_CHANNEL, txt);
      await loadMsgs();
    } catch { /* ok */ }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
          <Users size={18} className="text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Sales Management</p>
          <p className="text-xs text-green-500 font-medium">● Online</p>
        </div>
        <button onClick={loadMsgs} className="ml-auto text-gray-400 hover:text-gray-600">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && msgs.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No messages yet. Say hi to your sales manager!</p>
          </div>
        )}
        {msgs.map(m => {
          const isMe = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                isMe ? 'bg-purple-600' : 'bg-gray-400'
              }`}>
                {isMe ? (user?.name?.[0] || 'Y') : 'S'}
              </div>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                isMe ? 'bg-purple-600 text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm'
              }`}>
                {m.content}
                <span className={`block text-[10px] mt-0.5 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white flex gap-2">
        <input
          className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-400"
          placeholder="Message your sales team…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
          disabled={sending}
        />
        <button
          onClick={sendMsg}
          disabled={sending || !input.trim()}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--cp)' }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Feedback & Wishlist ─────────────────────────────────────────────────────
function FeedbackTab({ userId }: { userId: string }) {
  const [items,    setItems]    = useState<FeedbackItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'all' | 'bug' | 'feature'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'feature', title: '', description: '', priority: 'normal' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await feedbackApi.list(filter === 'all' ? {} : { type: filter });
      setItems(r.data as FeedbackItem[]);
    } catch { /* ok */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  const submit = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setSubmitting(true); setErr('');
    try {
      await feedbackApi.create(form);
      setForm({ type: 'feature', title: '', description: '', priority: 'normal' });
      setShowForm(false);
      await load();
    } catch { setErr('Submit failed — please try again'); }
    setSubmitting(false);
  };

  const upvote = async (id: string) => {
    try {
      const r = await feedbackApi.upvote(id);
      const { upvotes, upvoterIds } = r.data as { upvotes: number; upvoterIds: string[]; voted: boolean };
      setItems(prev => prev.map(it => it.id === id ? { ...it, upvotes, upvoterIds } : it));
    } catch { /* ok */ }
  };

  const st  = STATUS_STYLE;
  const tp  = TYPE_STYLE;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b bg-white flex items-center gap-2 flex-wrap">
        {(['all','feature','bug'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === f ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}>
            {f === 'all' ? '🌐 All' : f === 'feature' ? '💡 Feature Requests' : '🐛 Bug Reports'}
          </button>
        ))}
        <button
          onClick={() => setShowForm(v => !v)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: 'var(--cp)' }}
        >
          <Plus size={15} /> {showForm ? 'Cancel' : 'Submit'}
        </button>
      </div>

      {/* New item form */}
      {showForm && (
        <div className="px-4 py-4 border-b bg-purple-50/60">
          <p className="text-sm font-bold text-gray-700 mb-3">Submit feedback or request</p>
          {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="feature">💡 Feature Request</option>
                <option value="bug">🐛 Bug Report</option>
                <option value="other">💬 Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">🔥 High</option>
              </select>
            </div>
          </div>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2 bg-white outline-none focus:border-purple-400"
            placeholder="Short title (e.g. 'Add bulk lead upload')"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 bg-white outline-none focus:border-purple-400 resize-none"
            placeholder="Describe the issue or idea in detail…"
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <button onClick={submit} disabled={submitting}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--cp)' }}>
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Lightbulb size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No items yet. Submit the first one!</p>
          </div>
        )}
        {items.map(item => {
          const voted   = item.upvoterIds.includes(userId);
          const typeInfo   = tp[item.type]   || tp.other;
          const statusInfo = st[item.status] || st.open;
          return (
            <div key={item.id} className="bg-white rounded-2xl border p-4 flex gap-3 shadow-sm">
              {/* Upvote */}
              <button
                onClick={() => upvote(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border transition-colors shrink-0 ${
                  voted
                    ? 'border-purple-300 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-600'
                }`}
              >
                <ChevronUp size={16} strokeWidth={2.5} />
                <span className="text-xs font-bold">{item.upvotes}</span>
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${typeInfo.cls}`}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.cls}`}>
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                  {item.priority === 'high' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">🔥 High</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
                )}
                {item.adminReply && (
                  <div className="mt-2 pl-3 border-l-2 border-purple-300">
                    <p className="text-[11px] font-bold text-purple-600 mb-0.5">Admin reply:</p>
                    <p className="text-xs text-gray-700">{item.adminReply}</p>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{item.userName || 'Sales Rep'}</span>
                  <span>·</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────
export default function SalesRepPortal() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [data, setData]               = useState<DashboardData | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ name: string; country?: string; territory: string; totalEarned: number }[]>([]);
  const [isSalesRep, setIsSalesRep]   = useState(false);
  const [applying, setApplying]       = useState(false);
  const [applied, setApplied]         = useState(false);
  const [form, setForm]               = useState({ name: user?.name || '', phone: '', country: '', city: '', why: '' });
  const [error, setError]             = useState('');
  const [tab, setTab]                 = useState<DashTab>('dashboard');

  useEffect(() => {
    salesRepApi.leaderboard().then(r => setLeaderboard(r.data)).catch(() => {});
    if (user) {
      salesRepApi.dashboard()
        .then(r => { setData(r.data); setIsSalesRep(true); })
        .catch(() => setIsSalesRep(false));
    }
  }, [user]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleApply = async () => {
    if (!form.name || !form.phone || !form.country || !form.city) {
      setError('Please fill in all required fields');
      return;
    }
    setApplying(true);
    setError('');
    try {
      await salesRepApi.apply(form);
      setApplied(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Application failed — please try again');
    } finally {
      setApplying(false);
    }
  };

  // ── Tabs config ──
  const TABS: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard',  icon: <BarChart2   size={16} /> },
    { id: 'ai',        label: 'AI Coach',   icon: <Bot         size={16} /> },
    { id: 'chat',      label: 'Team Chat',  icon: <MessageSquare size={16} /> },
    { id: 'feedback',  label: 'Feedback',   icon: <Lightbulb   size={16} /> },
  ];

  // ── Dashboard view ──────────────────────────────────────────────────────────
  if (isSalesRep && data) {
    return (
      <div className="w-full flex flex-col" style={{ minHeight: '100dvh' }}>

        {/* Tab bar */}
        <div className="bg-white border-b sticky top-0 z-20 overflow-x-auto">
          <div className="flex gap-0 px-4 sm:px-6 max-w-7xl mx-auto min-w-max">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === 'dashboard' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="text-purple-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('salesrep.dashboard')}</h1>
                <p className="text-gray-500">{data.salesRep.territory}, {data.salesRep.country}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: t('salesrep.totalEarned'),   value: `$${data.stats.totalEarned.toFixed(2)}`,  icon: <DollarSign size={20} />, color: 'green' },
                { label: t('salesrep.unpaidBalance'), value: `$${data.stats.unpaid.toFixed(2)}`,        icon: <DollarSign size={20} />, color: 'orange' },
                { label: t('salesrep.adsPlaced'),     value: data.stats.adCount,                        icon: <Megaphone  size={20} />, color: 'blue' },
                { label: 'Commission Rate',            value: data.stats.commissionRate,                 icon: <TrendingUp size={20} />, color: 'purple' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border p-5 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full bg-${s.color}-100 text-${s.color}-600 flex items-center justify-center shrink-0`}>
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent commissions */}
              <div className="bg-white rounded-xl border">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">Recent Commissions</h2>
                  <a href="/advertise" className="flex items-center gap-1 text-sm text-green-600 font-medium hover:text-green-700">
                    <Plus size={14} /> New Ad
                  </a>
                </div>
                <div className="divide-y">
                  {data.recentCommissions.length === 0 && (
                    <p className="text-sm text-gray-400 p-4">No commissions yet. Start selling ads!</p>
                  )}
                  {data.recentCommissions.map(c => (
                    <div key={c.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.ad.advertiser}</p>
                        <p className="text-xs text-gray-400">{c.ad.title}</p>
                        <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${c.amount.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {c.paid ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-white rounded-xl border">
                <div className="p-4 border-b flex items-center gap-2">
                  <Trophy size={18} className="text-yellow-500" />
                  <h2 className="font-semibold text-gray-800">{t('salesrep.leaderboard')}</h2>
                </div>
                <div className="divide-y">
                  {leaderboard.map((rep, i) => (
                    <div key={i} className="p-4 flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'
                      }`}>{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{rep.name}</p>
                        <p className="text-xs text-gray-400">{rep.territory}, {rep.country}</p>
                      </div>
                      <p className="font-bold text-green-600">${rep.totalEarned.toFixed(0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pitch materials */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '📊', title: 'Pitch Deck', desc: 'Slides to show potential advertisers', action: 'Download', link: '#' },
                { icon: '📱', title: 'Business Cards', desc: 'Printable cards with your rep code', action: 'Download', link: '#' },
                { icon: '💬', title: 'WhatsApp Script', desc: 'Ready-made messages to send businesses', action: 'Copy', link: '#' },
              ].map(m => (
                <div key={m.title} className="bg-white rounded-xl border p-5">
                  <p className="text-3xl mb-2">{m.icon}</p>
                  <h3 className="font-bold text-gray-800">{m.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-3">{m.desc}</p>
                  <a href={m.link} className="text-sm font-semibold text-purple-600 hover:text-purple-700">{m.action} →</a>
                </div>
              ))}
            </div>

            {/* Quick-access to other tabs */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'ai' as DashTab, icon: <Bot size={22} className="text-purple-500" />, title: 'AI Sales Coach', desc: 'Get instant help with pitches, objections, and scripts.', cta: 'Open AI Chat →' },
                { id: 'chat' as DashTab, icon: <MessageSquare size={22} className="text-blue-500" />, title: 'Team Chat', desc: 'Message your sales manager directly. Get support fast.', cta: 'Open Chat →' },
                { id: 'feedback' as DashTab, icon: <Lightbulb size={22} className="text-yellow-500" />, title: 'Feedback & Wishlist', desc: 'Report bugs, request features, and vote on ideas.', cta: 'Give Feedback →' },
              ].map(card => (
                <button key={card.id} onClick={() => setTab(card.id)}
                  className="bg-white rounded-xl border p-5 text-left hover:border-purple-300 hover:shadow-sm transition-all">
                  <div className="mb-3">{card.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-1">{card.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">{card.desc}</p>
                  <p className="text-sm font-semibold text-purple-600">{card.cta}</p>
                </button>
              ))}
            </div>

            {/* How it works */}
            <div className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">How to Earn More</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { step: '1', title: 'Find businesses in your area', desc: 'Talk to local shops, clinics, hotels, and services' },
                  { step: '2', title: 'Sell them an ad package', desc: 'Banner, Featured, Sponsored, or Premium placements' },
                  { step: '3', title: 'Earn your commission', desc: `You keep ${data.stats.commissionRate} of every ad budget` },
                ].map(s => (
                  <div key={s.step} className="bg-white/20 rounded-xl p-4">
                    <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center font-bold mb-2">{s.step}</div>
                    <h3 className="font-semibold mb-1">{s.title}</h3>
                    <p className="text-sm text-purple-100">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI / Team Chat / Feedback — full-height panels */}
        {(tab === 'ai' || tab === 'chat' || tab === 'feedback') && (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 57px - 57px)' }}>
            {tab === 'ai'       && <AiChatTab   user={user} />}
            {tab === 'chat'     && <TeamChatTab user={user as { id: string; name?: string } | null} />}
            {tab === 'feedback' && <FeedbackTab userId={user?.id || ''} />}
          </div>
        )}
      </div>
    );
  }

  // ── Apply / landing view ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="text-white py-16 px-4" style={{ background: 'linear-gradient(135deg, #7c3aed, #3730a3)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-purple-300 text-sm font-bold uppercase tracking-widest mb-3">💼 Earn from Anywhere in Africa</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">Become a Seshaa Sales Rep</h1>
          <p className="text-purple-100 text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
            Earn <strong className="text-white">20% commission</strong> on every advertising deal you close.
            Work from your phone, sell to local businesses, get paid weekly.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#apply" className="bg-white text-purple-700 font-black px-8 py-4 rounded-2xl text-lg hover:bg-purple-50 transition-colors shadow-xl">
              Apply Now — It's Free
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white border-b">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: '20%',    label: 'Your Commission' },
            { value: '$20–$500', label: 'Per Deal' },
            { value: '54',     label: 'Countries to Sell In' },
            { value: 'Weekly', label: 'Payout Frequency' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-black text-purple-700">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Why become a Seshaa Rep?</h2>
            <ul className="space-y-4 mb-10">
              {[
                { icon: '💸', title: 'Real money — fast', desc: 'Average rep earns $100–$600/month. Top reps earn $2,000+. No cap on commissions.' },
                { icon: '📱', title: 'Work from your phone', desc: 'No office, no commute. Sell from anywhere in your city using our mobile app.' },
                { icon: '🏦', title: 'Paid your way', desc: 'M-Pesa, MTN MoMo, Airtel Money, Orange Money, bank transfer. You choose.' },
                { icon: '🤝', title: 'We give you everything', desc: 'Pitch deck, business cards, WhatsApp scripts, training videos — all free.' },
                { icon: '📊', title: 'Your own dashboard', desc: 'Track every deal, every commission, every payment in real time.' },
                { icon: '🌍', title: 'Serve your community', desc: 'Help local businesses get found. You\'re building Africa\'s economy.' },
              ].map(p => (
                <li key={p.icon} className="flex gap-4">
                  <span className="text-2xl shrink-0 mt-0.5">{p.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900">{p.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{p.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div id="apply">
            <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-xl p-7 sticky top-4">
              {applied ? (
                <div className="text-center py-8">
                  <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Application Sent! 🎉</h3>
                  <p className="text-gray-500">We'll review your application and get back to you within 24 hours.</p>
                  <div className="mt-6 p-4 bg-purple-50 rounded-2xl text-sm text-purple-700">
                    While you wait — browse the <a href="/advertise" className="font-bold mx-1 underline">ad packages</a> so you know what to sell.
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-black text-gray-900 mb-1">Apply to Become a Rep</h3>
                  <p className="text-sm text-gray-500 mb-6">Free · Takes 2 minutes · Start earning this week</p>
                  {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
                  <div className="space-y-4">
                    {[
                      { k: 'name',    placeholder: 'Full Name *',          Icon: User,  type: 'text' },
                      { k: 'phone',   placeholder: 'Phone / WhatsApp *',   Icon: Phone, type: 'tel' },
                      { k: 'country', placeholder: 'Country *',            Icon: MapPin, type: 'text' },
                      { k: 'city',    placeholder: 'City / Territory *',   Icon: MapPin, type: 'text' },
                    ].map(({ k, placeholder, Icon, type }) => (
                      <div key={k} className="relative">
                        <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type={type} placeholder={placeholder}
                          className="w-full border-2 border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-base outline-none focus:border-purple-500"
                          value={(form as Record<string, string>)[k]}
                          onChange={e => set(k, e.target.value)} />
                      </div>
                    ))}
                    <textarea placeholder="Tell us a little about yourself (optional)"
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base outline-none focus:border-purple-500 resize-none"
                      rows={3} value={form.why} onChange={e => set('why', e.target.value)} />
                    <button onClick={handleApply} disabled={applying}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-lg font-black disabled:opacity-60"
                      style={{ backgroundColor: '#7c3aed' }}>
                      {applying
                        ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><Send size={20} /> Apply Now — It's Free</>}
                    </button>
                    <p className="text-xs text-center text-gray-400">By applying you agree to our Sales Rep terms. We'll contact you within 24 hours.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
