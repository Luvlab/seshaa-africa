import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, Megaphone, Trophy, Plus, CheckCircle, Send, MapPin, Phone, User } from 'lucide-react';
import { salesRepApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';

interface DashboardData {
  stats: { totalEarned: number; unpaid: number; paid: number; adCount: number; commissionRate: string };
  recentCommissions: { id: string; amount: number; rate: number; paid: boolean; ad: { title: string; advertiser: string }; createdAt: string }[];
  salesRep: { territory: string; country: string };
}

export default function SalesRepPortal() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [data, setData]             = useState<DashboardData | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ name: string; country?: string; territory: string; totalEarned: number }[]>([]);
  const [isSalesRep, setIsSalesRep] = useState(false);
  const [applying, setApplying]     = useState(false);
  const [applied, setApplied]       = useState(false);
  const [form, setForm]             = useState({ name: user?.name || '', phone: '', country: '', city: '', why: '' });
  const [error, setError]           = useState('');

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

  // ── Dashboard view for existing reps ─────────────────────────────────────
  if (isSalesRep && data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
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
            { label: t('salesrep.totalEarned'), value: `$${data.stats.totalEarned.toFixed(2)}`, icon: <DollarSign size={20} />, color: 'green' },
            { label: t('salesrep.unpaidBalance'), value: `$${data.stats.unpaid.toFixed(2)}`, icon: <DollarSign size={20} />, color: 'orange' },
            { label: t('salesrep.adsPlaced'), value: data.stats.adCount, icon: <Megaphone size={20} />, color: 'blue' },
            { label: 'Commission Rate', value: data.stats.commissionRate, icon: <TrendingUp size={20} />, color: 'purple' },
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
    );
  }

  // ── Apply / landing view ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
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

      {/* Stats row */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Left: perks + how it works */}
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

            {/* How it works */}
            <h2 className="text-2xl font-black text-gray-900 mb-4">How It Works</h2>
            <div className="space-y-3">
              {[
                { step: '01', text: 'Apply below — takes 2 minutes, no qualifications needed' },
                { step: '02', text: 'Get your unique rep code and access to sales materials' },
                { step: '03', text: 'Visit local businesses: restaurants, clinics, hotels, schools' },
                { step: '04', text: 'Show them Seshaa — packages start at just $20/month' },
                { step: '05', text: 'Close the deal and earn your 20% commission instantly' },
                { step: '06', text: 'Get paid every week — directly to your mobile money' },
              ].map(s => (
                <div key={s.step} className="flex gap-4 items-start">
                  <span className="text-purple-500 font-black text-sm w-8 shrink-0">{s.step}</span>
                  <p className="text-gray-700 text-sm">{s.text}</p>
                </div>
              ))}
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="mt-10">
                <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <Trophy size={20} className="text-yellow-500" /> Top Earners This Month
                </h3>
                <div className="bg-white rounded-2xl border divide-y">
                  {leaderboard.slice(0, 5).map((rep, i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-500'
                      }`}>{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{rep.name}</p>
                        <p className="text-xs text-gray-400">{rep.territory}, {rep.country}</p>
                      </div>
                      <p className="font-black text-green-600">${rep.totalEarned.toFixed(0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Application form */}
          <div id="apply">
            <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-xl p-7 sticky top-4">
              {applied ? (
                <div className="text-center py-8">
                  <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Application Sent! 🎉</h3>
                  <p className="text-gray-500">
                    We'll review your application and get back to you within 24 hours.
                    Check your phone for a confirmation message.
                  </p>
                  <div className="mt-6 p-4 bg-purple-50 rounded-2xl text-sm text-purple-700">
                    While you wait — browse the
                    <a href="/advertise" className="font-bold mx-1 underline">ad packages</a>
                    so you know what to sell.
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-black text-gray-900 mb-1">Apply to Become a Rep</h3>
                  <p className="text-sm text-gray-500 mb-6">Free · Takes 2 minutes · Start earning this week</p>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
                  )}

                  <div className="space-y-4">
                    {/* Name */}
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Full Name *"
                        className="w-full border-2 border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-base outline-none focus:border-purple-500"
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                      />
                    </div>
                    {/* Phone */}
                    <div className="relative">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="Phone / WhatsApp *"
                        className="w-full border-2 border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-base outline-none focus:border-purple-500"
                        value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                      />
                    </div>
                    {/* Country */}
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Country *"
                        className="w-full border-2 border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-base outline-none focus:border-purple-500"
                        value={form.country}
                        onChange={e => set('country', e.target.value)}
                      />
                    </div>
                    {/* City */}
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="City / Territory *"
                        className="w-full border-2 border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-base outline-none focus:border-purple-500"
                        value={form.city}
                        onChange={e => set('city', e.target.value)}
                      />
                    </div>
                    {/* Why */}
                    <textarea
                      placeholder="Tell us a little about yourself (optional)"
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base outline-none focus:border-purple-500 resize-none"
                      rows={3}
                      value={form.why}
                      onChange={e => set('why', e.target.value)}
                    />

                    <button
                      onClick={handleApply}
                      disabled={applying}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-lg font-black disabled:opacity-60"
                      style={{ backgroundColor: '#7c3aed' }}
                    >
                      {applying ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><Send size={20} /> Apply Now — It's Free</>
                      )}
                    </button>

                    <p className="text-xs text-center text-gray-400">
                      By applying you agree to our Sales Rep terms. We'll contact you within 24 hours.
                    </p>
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
