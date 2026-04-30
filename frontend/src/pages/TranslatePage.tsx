/**
 * TranslatePage — Community translation contribution hub.
 * Ambassadors and users can suggest + vote on translations for any language.
 * Rewards: discounts on Seshaa print-on-demand merchandise.
 */
import { useState, useEffect, useMemo } from 'react';
import { Languages, ChevronDown, ThumbsUp, Plus, CheckCircle, Gift, Globe, Users } from 'lucide-react';
import { translationApi } from '../services/api';
import { LANGUAGES } from '../i18n';
import { useAuthStore } from '../store/auth';
import en from '../i18n/locales/en.json';
import clsx from 'clsx';

// Flatten nested JSON into dot-notation keys
function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') result[key] = v;
    else if (typeof v === 'object' && v !== null) Object.assign(result, flatten(v as Record<string, unknown>, key));
  }
  return result;
}

const EN_KEYS = flatten(en as unknown as Record<string, unknown>);
const TOTAL_KEYS = Object.keys(EN_KEYS).length;

interface Suggestion {
  id: string;
  value: string;
  votes: number;
  user?: { name: string };
  createdAt?: string;
}

interface LangStats {
  lang: string;
  uniqueKeys: number;
  totalVotes: number;
  completionPct: number;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TranslatePage() {
  const { user } = useAuthStore();
  const [selectedLang, setSelectedLang] = useState(
    () => localStorage.getItem('seshaa-lang') || 'sw'
  );
  const [stats, setStats] = useState<LangStats[]>([]);
  const [byKey, setByKey] = useState<Record<string, Suggestion[]>>({});
  const [loading, setLoading] = useState(false);
  const [suggestKey, setSuggestKey] = useState('');
  const [suggestValue, setSuggestValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);

  // Load stats on mount
  useEffect(() => {
    translationApi.stats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  // Load suggestions when language changes
  useEffect(() => {
    setLoading(true);
    translationApi.full(selectedLang)
      .then(r => setByKey(r.data.byKey || {}))
      .catch(() => setByKey({}))
      .finally(() => setLoading(false));
  }, [selectedLang]);

  const langStat = stats.find(s => s.lang === selectedLang);
  const completionPct = langStat?.completionPct ?? 0;

  const filteredKeys = useMemo(() => {
    let keys = Object.keys(EN_KEYS);
    if (search.trim()) {
      const lc = search.toLowerCase();
      keys = keys.filter(k => k.toLowerCase().includes(lc) || EN_KEYS[k].toLowerCase().includes(lc));
    }
    if (showOnlyMissing) {
      keys = keys.filter(k => !byKey[k]?.length);
    }
    return keys;
  }, [search, showOnlyMissing, byKey]);

  const handleVote = async (suggId: string) => {
    if (!user) return alert('Sign in to vote');
    if (votedIds.has(suggId)) return;
    try {
      await translationApi.vote(suggId);
      setVotedIds(prev => new Set(prev).add(suggId));
      setByKey(prev => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = next[k].map(s => s.id === suggId ? { ...s, votes: s.votes + 1 } : s);
        }
        return next;
      });
    } catch { /* already voted */ }
  };

  const handleSuggest = async (key: string) => {
    if (!suggestValue.trim()) return;
    if (!user) return alert('Sign in to suggest translations');
    setSubmitting(true);
    try {
      await translationApi.suggest(selectedLang, key, suggestValue);
      // Refresh suggestions for this language
      const r = await translationApi.full(selectedLang);
      setByKey(r.data.byKey || {});
      setSuggestKey('');
      setSuggestValue('');
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const langInfo = LANGUAGES.find(l => l.code === selectedLang);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* ── Hero ── */}
      <div className="rounded-3xl overflow-hidden mb-8" style={{ background: 'linear-gradient(135deg, var(--cp, #008751), #005f3a)' }}>
        <div className="p-8 md:p-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Languages size={28} className="text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-black text-white">Help Translate Seshaa</h1>
              <p className="text-white/80 mt-2 text-sm md:text-base">
                Make Seshaa accessible to every African. Suggest translations, vote for the best ones,
                and earn exclusive rewards.
              </p>
            </div>
          </div>

          {/* Rewards banner */}
          <div className="mt-6 bg-white/15 rounded-2xl p-4 flex items-start gap-3">
            <Gift size={20} className="text-yellow-300 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="text-sm text-white/90">
              <strong className="text-white">Earn rewards for translating!</strong> Top contributors in each language
              earn discounts on Seshaa print merchandise (t-shirts, notebooks, stickers) and ambassador perks.
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Languages', value: LANGUAGES.length },
              { label: 'Total Keys', value: TOTAL_KEYS },
              { label: 'Contributors', value: stats.reduce((s, l) => s + l.totalVotes, 0) },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-xs text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Language Progress Grid ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Globe size={16} strokeWidth={1.5} /> Language Progress
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {LANGUAGES.map(lang => {
            const s = stats.find(x => x.lang === lang.code);
            const pct = s?.completionPct ?? 0;
            const isSelected = lang.code === selectedLang;
            return (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={clsx(
                  'text-left p-3 rounded-xl border-2 transition-all',
                  isSelected ? 'border-green-400 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-700 truncate">{lang.nativeName}</span>
                  <span className="text-xs text-gray-400 ml-1">{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }}
                  />
                </div>
                {pct < 40 && (
                  <p className="text-xs text-orange-500 font-semibold mt-1">Needs help!</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Translation Editor ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Editor header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{langInfo?.nativeName} — {langInfo?.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {completionPct}% complete · {Object.keys(byKey).length} of {TOTAL_KEYS} keys translated
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOnlyMissing(v => !v)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  showOnlyMissing ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                )}
              >
                {showOnlyMissing ? '⚠️ Missing only' : 'All keys'}
              </button>
            </div>
          </div>

          {/* Search */}
          <input
            className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500"
            placeholder="Search keys…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Keys list */}
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading translations…</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[65vh] overflow-y-auto">
            {filteredKeys.length === 0 && (
              <div className="p-10 text-center text-gray-400">
                <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
                <p>All keys are translated for this filter!</p>
              </div>
            )}
            {filteredKeys.map(key => {
              const suggestions = (byKey[key] || []).sort((a, b) => b.votes - a.votes);
              const best = suggestions[0];
              const isExpanded = suggestKey === key;

              return (
                <div key={key} className="p-4">
                  {/* Key info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-gray-400 mb-1">{key}</p>
                      <p className="text-sm text-gray-600 mb-2">🇬🇧 {EN_KEYS[key]}</p>
                      {best ? (
                        <p className="text-sm font-semibold text-gray-900">
                          ✓ {best.value}
                          {suggestions.length > 1 && (
                            <span className="ml-2 text-xs text-gray-400">{suggestions.length} suggestions</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-sm text-orange-500 italic">No translation yet — be first!</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setSuggestKey(isExpanded ? '' : key); setSuggestValue(''); }}
                      className={clsx(
                        'shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        isExpanded ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      <Plus size={12} /> Suggest
                    </button>
                  </div>

                  {/* Existing suggestions with vote buttons */}
                  {suggestions.length > 0 && (
                    <div className="mt-3 space-y-2 pl-3 border-l-2 border-gray-100">
                      {suggestions.map(s => (
                        <div key={s.id} className="flex items-center gap-2">
                          <button
                            onClick={() => handleVote(s.id)}
                            className={clsx(
                              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors',
                              votedIds.has(s.id) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                            )}
                          >
                            <ThumbsUp size={11} strokeWidth={1.5} /> {s.votes}
                          </button>
                          <span className="text-sm text-gray-800 flex-1">{s.value}</span>
                          {s.user?.name && <span className="text-xs text-gray-400">{s.user.name}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggest form */}
                  {isExpanded && (
                    <div className="mt-3 flex gap-2">
                      <input
                        autoFocus
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500"
                        placeholder={`Translate: "${EN_KEYS[key]}"`}
                        value={suggestValue}
                        onChange={e => setSuggestValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSuggest(key)}
                      />
                      <button
                        disabled={submitting || !suggestValue.trim()}
                        onClick={() => handleSuggest(key)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                        style={{ background: 'var(--cp, #008751)' }}
                      >
                        {submitting ? '…' : 'Submit'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Call to Action ── */}
      {!user && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
          <Users size={24} className="mx-auto mb-2 text-blue-500" strokeWidth={1.5} />
          <p className="font-bold text-gray-800 mb-1">Join to earn translation rewards</p>
          <p className="text-sm text-gray-500 mb-4">Create a free account to submit translations and vote.</p>
          <a
            href="/auth"
            className="inline-block px-6 py-2.5 rounded-xl font-bold text-white text-sm"
            style={{ background: 'var(--cp, #008751)' }}
          >
            Create Free Account
          </a>
        </div>
      )}

      {/* Lang selector dropdown (mobile-friendly) */}
      <details className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <summary className="p-4 font-semibold text-gray-700 flex items-center justify-between cursor-pointer list-none">
          <span>Switch language: {langInfo?.nativeName}</span>
          <ChevronDown size={16} className="text-gray-400" />
        </summary>
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setSelectedLang(l.code)}
              className={clsx(
                'text-left px-3 py-2 rounded-lg text-sm transition-colors',
                l.code === selectedLang ? 'font-bold' : 'text-gray-600 hover:bg-gray-50'
              )}
              style={l.code === selectedLang ? { color: 'var(--cp, #008751)' } : {}}
            >
              {l.nativeName}
              <span className="text-xs text-gray-400 ml-1">({l.code})</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
