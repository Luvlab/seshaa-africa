import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Target, BarChart3, Globe, MapPin, Users } from 'lucide-react';
import { adsApi } from '../../services/api';

const TIERS = [
  { tier: 'BANNER', price: 50, label: 'Banner', desc: 'Standard display ad, shown across search results', color: 'gray' },
  { tier: 'FEATURED', price: 150, label: 'Featured', desc: 'Highlighted placement in category pages', color: 'blue' },
  { tier: 'SPONSORED', price: 300, label: 'Sponsored', desc: 'Top of search results + category page hero', color: 'yellow' },
  { tier: 'PREMIUM', price: 600, label: 'Premium', desc: 'Homepage placement + all category pages + notifications', color: 'orange' },
] as const;

export default function AdvertiserPortal() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', advertiser: '', contactPhone: '', targetUrl: '',
    imageUrl: '', tier: 'BANNER', country: '', city: '', category: '',
    startDate: '', endDate: '', budget: 0,
  });

  const selectedTier = TIERS.find(t => t.tier === form.tier);

  const handleSubmit = async () => {
    try {
      await adsApi.create({ ...form, tier: form.tier as import('../../types').AdTier });
      setStep(4);
    } catch { alert('Error creating ad. Please try again.'); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
          <Megaphone className="text-orange-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advertise on {t('app.name')}</h1>
          <p className="text-gray-500">{t('ads.getStarted')}</p>
        </div>
      </div>

      {/* Why advertise */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: <Globe size={20} />, label: '54 Countries', desc: 'Africa-wide reach' },
          { icon: <Users size={20} />, label: '1M+ Users', desc: 'Growing community' },
          { icon: <Target size={20} />, label: 'Targeted', desc: 'City, country & category' },
        ].map(f => (
          <div key={f.label} className="bg-white rounded-xl border p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-2">{f.icon}</div>
            <p className="font-semibold text-gray-800">{f.label}</p>
            <p className="text-xs text-gray-400">{f.desc}</p>
          </div>
        ))}
      </div>

      {step === 4 ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Ad Campaign Created!</h2>
          <p className="text-green-600">Your ad will go live on the start date. Track performance in your dashboard.</p>
          <a href="/advertiser" className="mt-4 inline-block bg-green-600 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-green-700">View Dashboard</a>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border">
          {/* Steps */}
          <div className="flex border-b">
            {['Ad Details', 'Targeting', 'Budget & Dates'].map((s, i) => (
              <div key={s} className={`flex-1 text-center py-4 text-sm font-medium ${step === i + 1 ? 'text-orange-600 border-b-2 border-orange-500' : step > i + 1 ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 ${step === i + 1 ? 'bg-orange-100' : step > i + 1 ? 'bg-green-100' : 'bg-gray-100'}`}>{i + 1}</span>
                {s}
              </div>
            ))}
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-800 mb-4">Ad Details</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Ad Title *</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Best Pharmacy in Lagos" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Business Name *</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.advertiser} onChange={e => setForm(f => ({ ...f, advertiser: e.target.value }))} placeholder="Your business name" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Landing URL *</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.targetUrl} onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))} placeholder="https://yourbusiness.com" type="url" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Contact Phone</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+234 800 000 0000" />
                  </div>
                </div>

                {/* Tier selection */}
                <div>
                  <label className="text-sm text-gray-600 font-medium mb-2 block">Ad Placement Tier</label>
                  <div className="grid grid-cols-2 gap-3">
                    {TIERS.map(tier => (
                      <button
                        key={tier.tier}
                        className={`text-left p-4 rounded-xl border-2 transition-colors ${form.tier === tier.tier ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                        onClick={() => setForm(f => ({ ...f, tier: tier.tier }))}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-800">{tier.label}</span>
                          <span className="text-orange-600 font-bold">${tier.price}/mo</span>
                        </div>
                        <p className="text-xs text-gray-500">{tier.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-800 mb-4">Targeting <span className="text-gray-400 font-normal text-sm">(leave blank for Africa-wide)</span></h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 font-medium flex items-center gap-1"><Globe size={14}/> Country</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. Nigeria" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-medium flex items-center gap-1"><MapPin size={14}/> City</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Lagos" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-medium flex items-center gap-1"><Target size={14}/> Category</label>
                    <input className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. health" />
                  </div>
                </div>

                {/* Audience estimate */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                    <BarChart3 size={16} /> Estimated Reach
                  </p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">
                    {form.country && form.city ? '5,000–20,000' : form.country ? '50,000–200,000' : '500,000–2,000,000'}
                  </p>
                  <p className="text-xs text-blue-500">impressions / month</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-800 mb-4">Budget & Dates</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Start Date</label>
                    <input type="date" className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-medium">End Date</label>
                    <input type="date" className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} min={form.startDate} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-medium">Total Budget (USD)</label>
                    <input type="number" className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-orange-400" value={form.budget || ''} onChange={e => setForm(f => ({ ...f, budget: parseFloat(e.target.value) || 0 }))} placeholder={`Min $${selectedTier?.price}`} min={selectedTier?.price} />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <h3 className="font-semibold text-gray-700 mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Ad Tier</span><span className="font-medium">{selectedTier?.label}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Targeting</span><span className="font-medium">{[form.city, form.country].filter(Boolean).join(', ') || 'Africa-wide'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Budget</span><span className="font-bold text-orange-600">${form.budget}</span></div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6 pt-4 border-t">
              {step > 1 ? (
                <button className="px-5 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50" onClick={() => setStep(s => s - 1)}>Back</button>
              ) : <span />}
              {step < 3 ? (
                <button className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600" onClick={() => setStep(s => s + 1)}>Continue</button>
              ) : (
                <button className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600" onClick={handleSubmit}>Launch Campaign</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
