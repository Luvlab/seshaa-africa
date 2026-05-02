/**
 * PriceComparePage — seshaa.prices
 *
 * Compare prices for common goods & services across African cities.
 * Data comes from:
 *   1. Businesses that listed their own prices
 *   2. Crowd-sourced entries from users
 *   3. Auto-enrichment from business websites (backend scraper)
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, TrendingUp, Star, MapPin, Phone, RefreshCw,
  Plus, X, DollarSign, Globe, Building2,
  BarChart2, ArrowUpDown, CheckCircle,
} from 'lucide-react';
import { pricesApi, listingsApi } from '../services/api';
import type { PriceEntry } from '../types';
import { useAuthStore } from '../store/auth';

const CATEGORIES = [
  { id: 'Health',      emoji: '🏥', items: ['Consultation (GP)', 'Blood Test', 'Paracetamol 500mg', 'Malaria Test', 'Ambulance Service', 'Dental Cleaning', 'Eye Test', 'X-Ray'] },
  { id: 'Transport',   emoji: '🚗', items: ['Taxi per km', 'Airport Transfer', 'Car Wash', 'Oil Change', 'Tyre Change', 'MOT/Inspection', 'Boda-boda ride 5km'] },
  { id: 'Mechanics',   emoji: '🔧', items: ['Engine Service', 'Brake Pads', 'AC Regas', 'Tyre Balancing', 'Battery Replacement', 'Diagnostics', 'Wheel Alignment'] },
  { id: 'Beauty',      emoji: '💅', items: ['Haircut (Men)', 'Hair Styling (Women)', 'Manicure', 'Pedicure', 'Facial', 'Braiding (medium)', 'Wax (full body)', 'Nail Art'] },
  { id: 'Banking',     emoji: '💳', items: ['Cash Transfer Fee', 'USD Exchange Rate', 'Mobile Money Fee', 'Loan Interest Rate (monthly)', 'Account Opening'] },
  { id: 'Building',    emoji: '🏗️', items: ['Cement (50kg bag)', 'Iron Rod (12mm)', 'Roofing Sheet', 'Tiles (per m²)', 'Plumber (per hour)', 'Electrician (per hour)', 'Labour (per day)'] },
  { id: 'Agriculture', emoji: '🌾', items: ['Maize (per bag)', 'Rice (50kg)', 'Tomatoes (crate)', 'Palm Oil (litre)', 'Fertiliser (50kg)', 'Day Old Chicks (each)'] },
  { id: 'Food',        emoji: '🍽️', items: ['Jollof Rice plate', 'Pounded Yam', 'Suya 100g', 'Bottled Water 500ml', 'Soft Drink 350ml', 'Chicken & Chips'] },
  { id: 'Education',   emoji: '📚', items: ['Tutoring (per hour)', 'School Fees (term)', 'Exam Registration', 'Driving Lessons (pkg)', 'Computer Class (month)'] },
  { id: 'Utilities',   emoji: '💡', items: ['Electricity Prepaid (100 units)', 'Internet 10Mbps (month)', 'Generator Fuel (litre)', 'Water Delivery (20L)', 'Gas Cylinder Refill'] },
  { id: 'Real Estate', emoji: '🏠', items: ['1BR Apartment (month)', '2BR House (month)', 'Shop (month)', 'Land per sqm', 'Office (month)'] },
  { id: 'Wholesale',   emoji: '📦', items: ['Airtime recharge 100', 'Cooking Oil (20L)', 'Sugar (50kg)', 'Flour (50kg)', 'Pure Water (carton)'] },
];

const CURRENCIES = ['USD', 'KES', 'NGN', 'GHS', 'ZAR', 'UGX', 'ETB', 'TZS', 'XOF', 'XAF', 'EGP', 'MAD', 'DZD', 'ZMW', 'RWF'];

type SortOrder = 'price_asc' | 'price_desc' | 'rating';

interface SubmitForm {
  listingSearch: string;
  listingId: string;
  listingName: string;
  price: string;
  currency: string;
  unit: string;
}

export default function PriceComparePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [selectedItem, setSelectedItem]     = useState('');
  const [searchCity, setSearchCity]         = useState('');
  const [searchCountry, setSearchCountry]   = useState('');
  const [entries, setEntries]               = useState<PriceEntry[]>([]);
  const [trending, setTrending]             = useState<{ item: string; category: string; _count: { item: number } }[]>([]);
  const [loading, setLoading]               = useState(false);
  const [sortOrder, setSortOrder]           = useState<SortOrder>('price_asc');
  const [searched, setSearched]             = useState(false);
  const [showSubmit, setShowSubmit]         = useState(false);
  const [submitDone, setSubmitDone]         = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [listingSuggestions, setListingSuggestions] = useState<{ id: string; name: string; city: string }[]>([]);
  const [form, setForm] = useState<SubmitForm>({
    listingSearch: '', listingId: '', listingName: '',
    price: '', currency: 'USD', unit: '',
  });

  const cat = CATEGORIES.find(c => c.id === activeCategory)!;

  useEffect(() => {
    pricesApi.trending({ country: searchCountry || undefined }).then(r => setTrending(r.data)).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!selectedItem) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await pricesApi.compare({ item: selectedItem, city: searchCity || undefined, country: searchCountry || undefined });
      setEntries(r.data.entries);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  };

  // Search for listings when user types business name in submit form
  useEffect(() => {
    if (form.listingSearch.length < 2) { setListingSuggestions([]); return; }
    const t = setTimeout(() => {
      listingsApi.search({ q: form.listingSearch, city: searchCity || undefined, country: searchCountry || undefined, limit: 6 })
        .then(r => setListingSuggestions(r.data.listings.map((l: { id: string; name: string; city: string }) => ({ id: l.id, name: l.name, city: l.city }))))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [form.listingSearch, searchCity, searchCountry]);

  const submitPrice = async () => {
    if (!form.listingId || !form.price || !selectedItem) return;
    setSubmitting(true);
    try {
      await pricesApi.add({
        listingId: form.listingId,
        item: selectedItem,
        price: parseFloat(form.price),
        currency: form.currency,
        unit: form.unit || undefined,
        category: activeCategory,
      });
      setSubmitDone(true);
      setForm({ listingSearch: '', listingId: '', listingName: '', price: '', currency: 'USD', unit: '' });
      await handleSearch(); // refresh results
      setTimeout(() => { setSubmitDone(false); setShowSubmit(false); }, 2500);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const sorted = [...entries].sort((a, b) => {
    if (sortOrder === 'price_asc')  return a.price - b.price;
    if (sortOrder === 'price_desc') return b.price - a.price;
    return (b.listing?.avgRating || 0) - (a.listing?.avgRating || 0);
  });

  const lowestPrice = sorted.length ? sorted[0] : null;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <BarChart2 size={22} className="text-green-600" /> {t('priceCompare.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('priceCompare.subtitle')}</p>
        </div>
        {selectedItem && (
          <button onClick={() => setShowSubmit(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shrink-0"
            style={{ background: 'var(--cp, #008751)' }}>
            <Plus size={15} /> {t('priceCompare.submitPrice')}
          </button>
        )}
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* ── Left: Category + Trending ── */}
        <div className="lg:w-56 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('priceCompare.categories')}</p>
            </div>
            <div className="divide-y max-h-[45vh] lg:max-h-none overflow-y-auto">
              {CATEGORIES.map(c => (
                <button key={c.id}
                  onClick={() => { setActiveCategory(c.id); setSelectedItem(''); setEntries([]); setSearched(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${activeCategory === c.id ? 'font-semibold' : ''}`}
                  style={activeCategory === c.id ? { color: 'var(--cp)', backgroundColor: 'var(--cp-light, #e6f4ec)' } : {}}>
                  <span className="text-xl">{c.emoji}</span>
                  <span>{c.id}</span>
                </button>
              ))}
            </div>
          </div>

          {trending.length > 0 && (
            <div className="bg-white rounded-2xl border p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                <TrendingUp size={12} /> {t('priceCompare.trending')}
              </div>
              {trending.slice(0, 6).map(t => (
                <button key={t.item}
                  onClick={() => {
                    const c = CATEGORIES.find(x => x.id === t.category);
                    if (c) setActiveCategory(c.id);
                    setSelectedItem(t.item);
                  }}
                  className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1.5 flex items-center justify-between border-b border-gray-50 last:border-0">
                  <span className="truncate">{t.item}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{t._count.item}</span>
                </button>
              ))}
            </div>
          )}

          {/* How data is collected */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800 space-y-1.5">
            <p className="font-bold flex items-center gap-1"><Globe size={12} /> {t('priceCompare.whereFrom')}</p>
            <p>✓ Business self-reported prices</p>
            <p>✓ User submissions (you!)</p>
            <p>✓ Auto-extracted from business websites</p>
            <p className="text-blue-600 mt-1">Help keep prices accurate — submit what you paid.</p>
          </div>
        </div>

        {/* ── Right: Items + Results ── */}
        <div className="flex-1 space-y-4">
          {/* Item picker + location */}
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-sm font-bold text-gray-700 mb-3">{cat.emoji} {cat.id} — pick an item</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {cat.items.map(item => (
                <button key={item} onClick={() => setSelectedItem(item)}
                  className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all font-medium ${
                    selectedItem === item ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={selectedItem === item ? { backgroundColor: 'var(--cp)', borderColor: 'var(--cp)' } : {}}>
                  {item}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <input className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--cp)] min-w-28"
                placeholder="City (optional)" value={searchCity} onChange={e => setSearchCity(e.target.value)} />
              <input className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--cp)] min-w-28"
                placeholder="Country code" value={searchCountry} onChange={e => setSearchCountry(e.target.value.toUpperCase())} />
              <button onClick={handleSearch} disabled={!selectedItem || loading}
                className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ backgroundColor: 'var(--cp)' }}>
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                Compare
              </button>
            </div>
          </div>

          {/* Submit a Price drawer */}
          {showSubmit && selectedItem && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-green-900">{t('priceCompare.submitPrice')}</h3>
                  <p className="text-xs text-green-700 mt-0.5">For: <strong>{selectedItem}</strong></p>
                </div>
                <button onClick={() => setShowSubmit(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              {submitDone ? (
                <div className="text-center py-4">
                  <CheckCircle size={36} className="mx-auto mb-2 text-green-500" />
                  <p className="font-bold text-green-800">{t('priceCompare.submitted_done')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Business search */}
                  <div className="relative">
                    <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white"
                      placeholder="Search business name…"
                      value={form.listingSearch}
                      onChange={e => setForm(f => ({ ...f, listingSearch: e.target.value, listingId: '', listingName: '' }))} />
                    {form.listingId && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle size={16} className="text-green-500" />
                      </div>
                    )}
                    {listingSuggestions.length > 0 && !form.listingId && (
                      <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white rounded-xl border shadow-lg overflow-hidden">
                        {listingSuggestions.map(s => (
                          <button key={s.id}
                            onClick={() => setForm(f => ({ ...f, listingId: s.id, listingName: s.name, listingSearch: s.name }))}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                            <Building2 size={13} className="text-gray-400 shrink-0" />
                            <span className="font-medium truncate">{s.name}</span>
                            <span className="text-gray-400 text-xs shrink-0">{s.city}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price + currency */}
                  <div className="flex gap-2">
                    <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white flex-1">
                      <DollarSign size={16} className="text-gray-400 ml-3 shrink-0" />
                      <input className="flex-1 px-2 py-3 text-sm outline-none"
                        type="number" placeholder="Price amount"
                        value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                    </div>
                    <select className="border-2 border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500 bg-white"
                      value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white"
                    placeholder="Unit (optional) — e.g. per kg, per visit, per hour"
                    value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />

                  {!user && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <a href="/auth" className="font-bold underline">Sign in</a> to submit prices and earn contributor credits.
                    </p>
                  )}

                  <button onClick={submitPrice}
                    disabled={submitting || !form.listingId || !form.price}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                    style={{ background: 'var(--cp, #008751)' }}>
                    {submitting ? t('priceCompare.submitting') : `✓ ${t('priceCompare.submitPrice')}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {searched && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-sm text-gray-600">
                  <span className="font-bold">{entries.length}</span> price{entries.length !== 1 ? 's' : ''} found
                  {searchCity && ` in ${searchCity}`}
                  {searchCountry && ` · ${searchCountry}`}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowSubmit(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-colors"
                    style={{ borderColor: 'var(--cp)', color: 'var(--cp)' }}>
                    <Plus size={12} /> Add Price
                  </button>
                  <select className="text-sm border-2 border-gray-200 rounded-xl px-3 py-1.5 outline-none bg-white"
                    value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)}>
                    <option value="price_asc">Cheapest first</option>
                    <option value="price_desc">Most expensive</option>
                    <option value="rating">Best rated</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border p-4 h-20 animate-pulse" />)}
                </div>
              ) : sorted.length === 0 ? (
                <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
                  <Search size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-gray-600">{t('priceCompare.noResults')}</p>
                  <p className="text-sm mt-1 mb-4">{t('priceCompare.noResultsHint')}</p>
                  <button onClick={() => setShowSubmit(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                    style={{ background: 'var(--cp)' }}>
                    <Plus size={14} /> {t('priceCompare.submitPrice')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Best price banner */}
                  {lowestPrice && sortOrder === 'price_asc' && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-3 flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <p className="text-sm font-black text-green-800">Best price: {lowestPrice.currency} {lowestPrice.price.toLocaleString()}</p>
                        <p className="text-xs text-green-600">{lowestPrice.listing?.name} · {lowestPrice.listing?.city}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {sorted.map((entry, idx) => {
                      const isBest  = idx === 0 && sortOrder === 'price_asc';
                      const diff    = lowestPrice && idx > 0
                        ? ((entry.price - lowestPrice.price) / lowestPrice.price * 100).toFixed(0)
                        : null;
                      return (
                        <div key={entry.id}
                          className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-shadow hover:shadow-md ${isBest ? 'border-green-300 ring-1 ring-green-200' : ''}`}>
                          {entry.listing?.logoUrl ? (
                            <img src={entry.listing.logoUrl} alt={entry.listing.name} className="w-12 h-12 object-cover rounded-xl shrink-0" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center text-xl">{cat.emoji}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{entry.listing?.name || 'Business'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {entry.listing?.verified && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Verified</span>
                              )}
                              {entry.listing?.avgRating ? (
                                <span className="flex items-center gap-0.5 text-xs text-amber-600">
                                  <Star size={10} fill="currentColor" /> {entry.listing.avgRating.toFixed(1)}
                                  <span className="text-gray-400">({entry.listing.reviewCount})</span>
                                </span>
                              ) : null}
                              {entry.listing?.city && (
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <MapPin size={10} /> {entry.listing.city}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xl font-black ${isBest ? 'text-green-700' : 'text-gray-900'}`}>
                              {entry.currency} {entry.price.toLocaleString()}
                            </p>
                            {entry.unit && <p className="text-xs text-gray-400">per {entry.unit}</p>}
                            {diff && <p className="text-xs text-red-500 font-medium">+{diff}% vs best</p>}
                          </div>
                          {entry.listing?.phone && (
                            <a href={`tel:${entry.listing.phone}`}
                              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-green-100 hover:text-green-600 shrink-0">
                              <Phone size={15} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-gray-400 text-center mt-4">{t('priceCompare.disclaimer')}</p>
                </>
              )}
            </div>
          )}

          {/* Empty prompt */}
          {!searched && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
              <ArrowUpDown size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-gray-600">Select a category and item to compare prices</p>
              <p className="text-sm mt-1">
                Running a business?{' '}
                <a href="/business" className="font-semibold hover:underline" style={{ color: 'var(--cp)' }}>
                  List your prices free →
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
