import { useState, useEffect } from 'react';
import { Megaphone, BarChart3, TrendingUp, Eye, MousePointer, Pause, Play, Plus, Package, Zap } from 'lucide-react';
import { adsApi } from '../../services/api';
import type { Ad } from '../../types';

// AD_PACKAGES mirrors backend AD_PACKAGES
const PACKAGES = [
  { id: 'starter',     label: 'Starter',     price: 9.99,  days: 7,  reach: '5k–20k',    desc: 'Get found in your city',           tier: 'BANNER',    color: 'gray',   popular: false },
  { id: 'boost',       label: 'Boost',       price: 29.99, days: 30, reach: '50k–200k',   desc: 'Country-wide visibility',           tier: 'SPONSORED', color: 'blue',   popular: false },
  { id: 'pro',         label: 'Pro',         price: 79.99, days: 30, reach: '100k–500k',  desc: 'Top of category results',           tier: 'FEATURED',  color: 'purple', popular: true  },
  { id: 'growth',      label: 'Growth',      price: 199,   days: 30, reach: '300k–1M',    desc: 'Multi-country Featured',            tier: 'FEATURED',  color: 'indigo', popular: false },
  { id: 'continental', label: 'Continental', price: 499,   days: 30, reach: '1M–5M',      desc: 'All of Africa, Sponsored',         tier: 'SPONSORED', color: 'orange', popular: false },
  { id: 'premium',     label: 'Premium',     price: 999,   days: 30, reach: '5M+',        desc: 'Homepage + all categories',        tier: 'PREMIUM',   color: 'yellow', popular: false },
] as const;

type PackageId = typeof PACKAGES[number]['id'];

const COLOR_MAP: Record<string, string> = {
  gray: 'border-gray-200 bg-gray-50',
  blue: 'border-blue-200 bg-blue-50',
  purple: 'border-purple-300 bg-purple-50',
  indigo: 'border-indigo-300 bg-indigo-50',
  orange: 'border-orange-300 bg-orange-50',
  yellow: 'border-yellow-400 bg-yellow-50',
};

const SELECTED_COLOR: Record<string, string> = {
  gray: 'border-gray-500 bg-gray-100',
  blue: 'border-blue-500 bg-blue-100',
  purple: 'border-purple-500 bg-purple-100',
  indigo: 'border-indigo-500 bg-indigo-100',
  orange: 'border-orange-500 bg-orange-100',
  yellow: 'border-yellow-500 bg-yellow-100',
};

type Tab = 'new' | 'campaigns' | 'enterprise';

export default function AdvertiserPortal() {
  const [tab, setTab] = useState<Tab>('new');
  const [selectedPackage, setSelectedPackage] = useState<PackageId | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', advertiser: '', contactPhone: '', targetUrl: '', imageUrl: '',
    country: '', city: '', category: '',
    targetKeywords: '', targetInterests: '',
    startDate: new Date().toISOString().split('T')[0],
    budget: 0,
  });
  const [launched, setLaunched] = useState(false);
  const [campaigns, setCampaigns] = useState<Ad[]>([]);
  const [stats, setStats] = useState<{ campaigns: number; active: number; totalImpressions: number; totalClicks: number; avgCtr: string; totalSpent: number; remainingBudget: number } | null>(null);

  useEffect(() => {
    if (tab === 'campaigns') {
      adsApi.myAds().then(r => setCampaigns(r.data)).catch(() => {});
      adsApi.myStats().then(r => setStats(r.data)).catch(() => {});
    }
  }, [tab]);

  const pkg = PACKAGES.find(p => p.id === selectedPackage);

  const handleLaunch = async () => {
    if (!pkg || !selectedPackage) return;
    const endDate = new Date(form.startDate);
    endDate.setDate(endDate.getDate() + pkg.days);

    try {
      await adsApi.create({
        ...form,
        tier: pkg.tier as Ad['tier'],
        packageId: selectedPackage,
        budget: pkg.price,
        startDate: form.startDate,
        endDate: endDate.toISOString().split('T')[0],
        targetKeywords: form.targetKeywords.split(',').map(s => s.trim()).filter(Boolean),
        targetInterests: form.targetInterests.split(',').map(s => s.trim()).filter(Boolean),
      });
      setLaunched(true);
    } catch { alert('Error launching campaign. Please try again.'); }
  };

  const toggleActive = async (ad: Ad) => {
    await adsApi.update(ad.id, { active: !ad.active });
    setCampaigns(cs => cs.map(c => c.id === ad.id ? { ...c, active: !c.active } : c));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
          <Megaphone className="text-orange-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advertise on Seshaa</h1>
          <p className="text-sm text-gray-500">Reach 1.4 billion Africans across 54 countries</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 gap-1">
        {([
          { id: 'new', label: 'New Campaign', icon: <Plus size={15}/> },
          { id: 'campaigns', label: 'My Campaigns', icon: <BarChart3 size={15}/> },
          { id: 'enterprise', label: 'Enterprise / Custom', icon: <Zap size={15}/> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ——— NEW CAMPAIGN ——— */}
      {tab === 'new' && (
        launched ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Campaign Launched!</h2>
            <p className="text-green-600 mb-6">Your ad will go live on the start date. We'll notify you when it's active.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setLaunched(false); setStep(1); setSelectedPackage(null); }}
                className="px-5 py-2.5 bg-white border rounded-full text-sm font-medium hover:bg-gray-50"
              >
                Create Another
              </button>
              <button
                onClick={() => setTab('campaigns')}
                className="px-5 py-2.5 text-white rounded-full text-sm font-semibold"
                style={{ backgroundColor: 'var(--cp)' }}
              >
                View Campaigns
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6 text-sm">
              {['Choose Package', 'Ad Details', 'Targeting', 'Launch'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-green-100 text-green-700' : step === i + 1 ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
                    style={step === i + 1 ? { backgroundColor: 'var(--cp)' } : {}}
                  >
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span className={step === i + 1 ? 'font-semibold text-gray-800' : 'text-gray-400'}>{s}</span>
                  {i < 3 && <span className="text-gray-300 mx-1">›</span>}
                </div>
              ))}
            </div>

            {/* Step 1: Pick package */}
            {step === 1 && (
              <div>
                <h2 className="font-bold text-gray-800 text-lg mb-4">Choose your advertising package</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {PACKAGES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPackage(p.id)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                        selectedPackage === p.id ? SELECTED_COLOR[p.color] : COLOR_MAP[p.color] + ' hover:shadow-md'
                      }`}
                    >
                      {p.popular && (
                        <span className="absolute -top-2.5 left-4 text-xs bg-orange-500 text-white px-3 py-0.5 rounded-full font-semibold">
                          Most Popular
                        </span>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gray-900 text-lg">{p.label}</span>
                        <div className="text-right">
                          <span className="font-black text-xl text-gray-900">${p.price}</span>
                          <p className="text-xs text-gray-500">/ {p.days} days</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{p.desc}</p>
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-700">{p.reach} impressions</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full font-medium text-gray-600">{p.tier}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    disabled={!selectedPackage}
                    onClick={() => setStep(2)}
                    className="px-8 py-3 text-white rounded-full font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--cp)' }}
                  >
                    Continue with {pkg?.label || '...'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Ad details */}
            {step === 2 && (
              <div className="bg-white rounded-2xl border p-6">
                <h2 className="font-bold text-gray-800 text-lg mb-5">Ad Details</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Ad Title *</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Best Pharmacy in Lagos" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Business Name *</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.advertiser} onChange={e => setForm(f => ({ ...f, advertiser: e.target.value }))}
                      placeholder="Your business name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Landing URL *</label>
                    <input type="url" className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.targetUrl} onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))}
                      placeholder="https://yourbusiness.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Contact Phone</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                      placeholder="+234 800 000 0000" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Ad Image URL (optional)</label>
                    <input type="url" className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="https://yourcdn.com/banner.jpg" />
                  </div>
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => setStep(1)} className="px-5 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50">Back</button>
                  <button
                    disabled={!form.title || !form.advertiser || !form.targetUrl}
                    onClick={() => setStep(3)}
                    className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                    style={{ backgroundColor: 'var(--cp)' }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Targeting */}
            {step === 3 && (
              <div className="bg-white rounded-2xl border p-6">
                <h2 className="font-bold text-gray-800 text-lg mb-1">Targeting</h2>
                <p className="text-sm text-gray-500 mb-5">Leave blank for Africa-wide reach</p>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Country</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                      placeholder="e.g. Nigeria" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">City</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="e.g. Lagos" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. health" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Keywords (comma-separated)</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.targetKeywords} onChange={e => setForm(f => ({ ...f, targetKeywords: e.target.value }))}
                      placeholder="pharmacy, medicine, health" />
                    <p className="text-xs text-gray-400 mt-1">Shown when users search these terms</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Interests (comma-separated)</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400"
                      value={form.targetInterests} onChange={e => setForm(f => ({ ...f, targetInterests: e.target.value }))}
                      placeholder="health, wellness, beauty" />
                    <p className="text-xs text-gray-400 mt-1">Shown to users interested in these topics</p>
                  </div>
                </div>

                {/* Reach estimate */}
                <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                    <TrendingUp size={15} /> Estimated Reach
                  </div>
                  <p className="text-2xl font-black text-blue-700">{pkg?.reach}</p>
                  <p className="text-xs text-blue-500 mt-0.5">impressions over {pkg?.days} days</p>
                </div>

                <div className="flex justify-between mt-6">
                  <button onClick={() => setStep(2)} className="px-5 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50">Back</button>
                  <button onClick={() => setStep(4)} className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold" style={{ backgroundColor: 'var(--cp)' }}>Continue</button>
                </div>
              </div>
            )}

            {/* Step 4: Launch */}
            {step === 4 && (
              <div className="bg-white rounded-2xl border p-6">
                <h2 className="font-bold text-gray-800 text-lg mb-5">Review & Launch</h2>
                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Package</span><span className="font-semibold">{pkg?.label}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Ad Title</span><span className="font-semibold">{form.title}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Business</span><span className="font-semibold">{form.advertiser}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Target</span><span className="font-semibold">{[form.city, form.country].filter(Boolean).join(', ') || 'Africa-wide'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Duration</span><span className="font-semibold">{pkg?.days} days from {form.startDate}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Estimated Reach</span><span className="font-semibold text-blue-700">{pkg?.reach} impressions</span></div>
                  <div className="flex justify-between py-2"><span className="text-gray-500">Total Cost</span><span className="font-black text-xl text-orange-600">${pkg?.price}</span></div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 mb-5">
                  Payment will be processed securely. Campaign goes live on {form.startDate}.
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(3)} className="px-5 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50">Back</button>
                  <button onClick={handleLaunch} className="px-8 py-3 text-white rounded-xl font-bold text-sm" style={{ backgroundColor: 'var(--cp)' }}>
                    Launch Campaign — ${pkg?.price}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ——— MY CAMPAIGNS ——— */}
      {tab === 'campaigns' && (
        <div>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Campaigns', value: stats.campaigns, icon: <Package size={18}/> },
                { label: 'Active Now', value: stats.active, icon: <Zap size={18}/>, green: true },
                { label: 'Total Impressions', value: stats.totalImpressions.toLocaleString(), icon: <Eye size={18}/> },
                { label: 'Total Clicks', value: stats.totalClicks.toLocaleString(), icon: <MousePointer size={18}/>, sub: stats.avgCtr + ' CTR' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border p-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${s.green ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  {s.sub && <p className="text-xs text-gray-400">{s.sub}</p>}
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No campaigns yet</p>
              <button onClick={() => setTab('new')} className="mt-3 text-sm text-orange-600 font-semibold">Create your first ad</button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => {
                const isExpired = new Date(c.endDate) < new Date();
                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0.0';
                return (
                  <div key={c.id} className="bg-white rounded-2xl border p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 truncate">{c.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isExpired ? 'bg-gray-100 text-gray-500' : c.active ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {isExpired ? 'Expired' : c.active ? 'Active' : 'Paused'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{c.tier}</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye size={11}/> {c.impressions.toLocaleString()} impr.</span>
                        <span className="flex items-center gap-1"><MousePointer size={11}/> {c.clicks} clicks</span>
                        <span>{ctr}% CTR</span>
                        <span>Ends {new Date(c.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {!isExpired && (
                      <button
                        onClick={() => toggleActive(c)}
                        className={`p-2 rounded-full ${c.active ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      >
                        {c.active ? <Pause size={16}/> : <Play size={16}/>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ——— ENTERPRISE ——— */}
      {tab === 'enterprise' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-black mb-2">Enterprise Advertising</h2>
            <p className="text-gray-300 mb-6">Custom campaigns for large brands, governments, NGOs and pan-African campaigns. Managed service included.</p>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Custom Targeting', desc: 'Multi-country, language, demographic, and behavioral targeting' },
                { label: 'Managed Service', desc: 'Dedicated account manager, creative support, reporting' },
                { label: 'Flexible Budget', desc: 'Monthly retainer, CPM, or performance-based pricing' },
              ].map(f => (
                <div key={f.label} className="bg-white/10 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">{f.label}</p>
                  <p className="text-xs text-gray-400">{f.desc}</p>
                </div>
              ))}
            </div>
            <a
              href="mailto:ads@seshaa.africa"
              className="inline-block bg-white text-gray-900 px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors"
            >
              Contact Our Ad Team →
            </a>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-bold text-gray-800 mb-4">Enterprise Enquiry Form</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { label: 'Company Name', placeholder: 'Your company' },
                { label: 'Contact Email', placeholder: 'ads@yourcompany.com' },
                { label: 'Monthly Budget (USD)', placeholder: '1,000+' },
                { label: 'Target Countries', placeholder: 'Nigeria, Kenya, Ghana...' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-sm font-medium text-gray-600">{f.label}</label>
                  <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400" placeholder={f.placeholder} />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Campaign Goals</label>
                <textarea className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400 h-24 resize-none" placeholder="Describe your campaign goals, target audience, and any specific requirements..." />
              </div>
            </div>
            <button className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800">
              Send Enquiry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
