import { useState, useEffect } from 'react';
import { obituariesApi, type ObitItem } from '../services/api';
import { usePageview } from '../hooks/useAnalytics';
import { Scroll, ExternalLink, Loader2, RefreshCw, Globe2, PlusCircle, X, CheckCircle2 } from 'lucide-react';

const COUNTRY_ORDER = ['Uganda', 'Kenya', 'Tanzania', 'East Africa', 'Nigeria', 'Pan-Africa'];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function countryFlag(name: string): string {
  const flags: Record<string, string> = {
    Uganda: '🇺🇬', Kenya: '🇰🇪', Tanzania: '🇹🇿', Nigeria: '🇳🇬',
    'East Africa': '🌍', 'Pan-Africa': '🌍',
  };
  return flags[name] || '🌍';
}

const TRIBES = [
  'Baganda', 'Banyankole', 'Basoga', 'Bakiga', 'Langi', 'Acholi', 'Bagisu', 'Lugbara',
  'Bunyoro', 'Alur', 'Jopadhola', 'Banyoro', 'Iteso', 'Karamojong', 'Sabiny', 'Other',
];

const emptyForm = { name: '', area: '', tribe: '', profession: '', description: '', submittedBy: '' };

function SubmitForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) { setErr('Name and description are required.'); return; }
    setErr(''); setSubmitting(true);
    try {
      await obituariesApi.submit({ ...form });
      setDone(true);
    } catch { setErr('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const fieldCls = 'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors';
  const fieldStyle = { borderColor: 'var(--border, #e5e7eb)', background: 'var(--surface, #fff)' };
  const label = (txt: string, req?: boolean) => (
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {txt}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  if (done) return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <CheckCircle2 size={40} className="text-emerald-500" />
      <p className="font-bold text-gray-800">Thank you for sharing</p>
      <p className="text-sm text-gray-500 max-w-xs">The notice has been received and will be reviewed shortly.</p>
      <button onClick={onClose} className="mt-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gray-800 text-white hover:bg-gray-700 transition-colors">
        Close
      </button>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          {label('Full name of deceased', true)}
          <input className={fieldCls} style={fieldStyle} placeholder="e.g. John Mukasa" value={form.name} onChange={set('name')} />
        </div>
        <div>
          {label('Location / Area')}
          <input className={fieldCls} style={fieldStyle} placeholder="e.g. Kampala, Mbale" value={form.area} onChange={set('area')} />
        </div>
        <div>
          {label('Tribe')}
          <select className={fieldCls} style={fieldStyle} value={form.tribe} onChange={set('tribe')}>
            <option value="">Select tribe…</option>
            {TRIBES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          {label('Profession')}
          <input className={fieldCls} style={fieldStyle} placeholder="e.g. Teacher, Farmer, Engineer" value={form.profession} onChange={set('profession')} />
        </div>
      </div>
      <div>
        {label('Obituary / Notice', true)}
        <textarea
          className={`${fieldCls} resize-none`} style={fieldStyle} rows={4}
          placeholder="Write a brief tribute or notice…"
          value={form.description} onChange={set('description')}
        />
      </div>
      <div>
        {label('Submitted by (optional)')}
        <input className={fieldCls} style={fieldStyle} placeholder="Your name or organisation" value={form.submittedBy} onChange={set('submittedBy')} />
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {submitting ? 'Submitting…' : 'Submit notice'}
        </button>
        <button type="button" onClick={onClose}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold border text-gray-600 hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--border, #e5e7eb)' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ObituariesPage() {
  usePageview();
  const [items, setItems]       = useState<ObitItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [search, setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const r = await obituariesApi.list();
      setItems(r.data);
    } catch { /* ok */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  // Unique countries present in result, ordered Uganda-first
  const countries = COUNTRY_ORDER.filter(c => items.some(i => i.country === c));

  const filtered = items.filter(i => {
    if (filter && i.country !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.excerpt.toLowerCase().includes(q) && !i.source.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg, #f8f7f4)' }}>
      {/* ── Header ── */}
      <div className="sticky top-[var(--nav-h,56px)] z-20 border-b" style={{ background: 'var(--bg, #f8f7f4)', borderColor: 'var(--border, #e5e7eb)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-auto">
            <Scroll size={18} className="text-gray-500 shrink-0" />
            <h1 className="text-base font-bold text-gray-800">Obituaries</h1>
            {!loading && <span className="text-xs text-gray-400">{filtered.length} notices</span>}
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--border, #e5e7eb)' }}
          >
            {showForm ? <X size={12} /> : <PlusCircle size={12} />}
            {showForm ? 'Close' : 'Submit a notice'}
          </button>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Country filters */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilter('')}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              !filter ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            All
          </button>
          {countries.map(c => (
            <button key={c}
              onClick={() => setFilter(f => f === c ? '' : c)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1 ${
                filter === c ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {countryFlag(c)} {c}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <input
            className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none focus:border-gray-400"
            style={{ borderColor: 'var(--border, #e5e7eb)', background: 'var(--surface, #fff)' }}
            placeholder="Search obituaries…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Submit form panel ── */}
      {showForm && (
        <div className="max-w-4xl mx-auto px-4 py-5 border-b" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
          <div className="rounded-2xl border p-5" style={{ background: 'var(--surface, #fff)', borderColor: 'var(--border, #e5e7eb)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🕊️</span>
              <h2 className="text-sm font-bold text-gray-800">Submit an Obituary Notice</h2>
            </div>
            <SubmitForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="max-w-4xl mx-auto px-4 py-5">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Gathering obituaries…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Scroll size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No obituaries found</p>
            {search && <p className="text-xs mt-1 text-gray-400">Try a different search term</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-4 rounded-2xl border transition-all hover:border-gray-300 hover:shadow-sm group"
                style={{ background: 'var(--surface, #fff)', borderColor: 'var(--border, #e5e7eb)' }}
              >
                {/* Image */}
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                {!item.image && (
                  <div className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-2xl"
                    style={{ background: 'var(--bg, #f8f7f4)' }}>
                    🕊️
                  </div>
                )}

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800 leading-snug group-hover:text-gray-900 line-clamp-2">
                      {item.title}
                    </p>
                    <ExternalLink size={13} className="shrink-0 text-gray-300 group-hover:text-gray-500 mt-0.5" />
                  </div>
                  {item.excerpt && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                      {countryFlag(item.country)} {item.source}
                    </span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(item.date)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Attribution */}
        {!loading && filtered.length > 0 && (
          <p className="text-[11px] text-gray-400 text-center mt-8 flex items-center justify-center gap-1">
            <Globe2 size={11} />
            Notices sourced from African publications. All links go to the original source.
          </p>
        )}
      </div>
    </div>
  );
}
