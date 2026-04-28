import { useState, useEffect } from 'react';
import { Search, TrendingUp, Star, MapPin, Phone, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { pricesApi } from '../services/api';
import type { PriceEntry } from '../types';

const CATEGORIES = [
  { id: 'Health',        emoji: '🏥', items: ['Consultation (GP)', 'Blood Test', 'Paracetamol 500mg', 'Malaria Test', 'Ambulance Service', 'Dental Cleaning'] },
  { id: 'Transport',     emoji: '🚗', items: ['Taxi per km', 'Airport Transfer', 'Car Wash', 'Oil Change', 'Tyre Change', 'MOT/Inspection'] },
  { id: 'Mechanics',     emoji: '🔧', items: ['Engine Service', 'Brake Pads', 'AC Regas', 'Tyre Balancing', 'Battery Replacement', 'Diagnostics'] },
  { id: 'Beauty',        emoji: '💅', items: ['Haircut (Men)', 'Hair Styling (Women)', 'Manicure', 'Pedicure', 'Facial', 'Full Body Wax', 'Braiding'] },
  { id: 'Banking',       emoji: '💳', items: ['Cash Transfer Fee', 'USD Exchange Rate', 'Account Opening', 'Mobile Money Fee', 'Loan Interest Rate (monthly)'] },
  { id: 'Building',      emoji: '🏗️', items: ['Cement (50kg bag)', 'Iron Rod (12mm)', 'Roofing Sheet', 'Tiles (per m²)', 'Plumber (per hour)', 'Electrician (per hour)', 'Labour (per day)'] },
  { id: 'Agriculture',   emoji: '🌾', items: ['Maize (per bag)', 'Rice (50kg)', 'Tomatoes (crate)', 'Palm Oil (litre)', 'Fertiliser (50kg)', 'Day Old Chicks (each)'] },
  { id: 'Food',          emoji: '🍽️', items: ['Jollof Rice plate', 'Pounded Yam', 'Suya 100g', 'Bottled Water 500ml', 'Soft Drink', 'Chicken & Chips'] },
  { id: 'Education',     emoji: '📚', items: ['Tutoring (per hour)', 'School Fees (term)', 'Exam Registration', 'Driving Lessons', 'Computer Class'] },
  { id: 'Utilities',     emoji: '💡', items: ['Electricity Prepaid (100 units)', 'Internet 10Mbps (monthly)', 'Generator Fuel (litre)', 'Water Delivery (20L)', 'Gas Cylinder Refill'] },
  { id: 'Real Estate',   emoji: '🏠', items: ['1BR Apartment (monthly rent)', '2BR House (monthly rent)', 'Shop (monthly rent)', 'Land per sqm'] },
  { id: 'Wholesale',     emoji: '📦', items: ['Airtime recharge 100', 'Cooking Oil (20L)', 'Sugar (50kg)', 'Flour (50kg)', 'Pure Water (carton)'] },
];

type SortOrder = 'price_asc' | 'price_desc' | 'rating';

export default function PriceComparePage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [searchCity, setSearchCity] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [trending, setTrending] = useState<{ item: string; category: string; _count: { item: number } }[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('price_asc');
  const [searched, setSearched] = useState(false);

  const cat = CATEGORIES.find(c => c.id === activeCategory)!;

  useEffect(() => {
    pricesApi.trending({ country: searchCountry || undefined }).then(r => setTrending(r.data)).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!selectedItem) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await pricesApi.compare({
        item: selectedItem,
        city: searchCity || undefined,
        country: searchCountry || undefined,
      });
      setEntries(r.data.entries);
    } catch {}
    finally { setLoading(false); }
  };

  const sorted = [...entries].sort((a, b) => {
    if (sortOrder === 'price_asc') return a.price - b.price;
    if (sortOrder === 'price_desc') return b.price - a.price;
    return (b.listing?.avgRating || 0) - (a.listing?.avgRating || 0);
  });

  const lowestPrice = sorted.length ? sorted[0] : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Price Comparison</h1>
        <p className="text-sm text-gray-500 mt-1">Compare prices from different businesses in your city</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Category picker */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</p>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setSelectedItem(''); setEntries([]); setSearched(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${activeCategory === cat.id ? 'bg-[var(--cp-light,#e6f4ec)] font-semibold' : ''}`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span style={activeCategory === cat.id ? { color: 'var(--cp)' } : {}}>{cat.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trending */}
          {trending.length > 0 && (
            <div className="mt-4 bg-white rounded-2xl border p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                <TrendingUp size={12}/> Trending Comparisons
              </div>
              <div className="space-y-1">
                {trending.slice(0, 5).map(t => (
                  <button
                    key={t.item}
                    onClick={() => {
                      const cat = CATEGORIES.find(c => c.id === t.category);
                      if (cat) setActiveCategory(cat.id);
                      setSelectedItem(t.item);
                    }}
                    className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1 flex items-center justify-between"
                  >
                    <span>{t.item}</span>
                    <span className="text-xs text-gray-400">{t._count.item} shops</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Search + Results */}
        <div className="md:col-span-2 space-y-4">
          {/* Item picker */}
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">{cat.emoji} {cat.id} — Select item to compare</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {cat.items.map(item => (
                <button
                  key={item}
                  onClick={() => setSelectedItem(item)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    selectedItem === item ? 'text-white border-[var(--cp)]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={selectedItem === item ? { backgroundColor: 'var(--cp)' } : {}}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <input
                className="flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--cp)] min-w-32"
                placeholder="City (optional)"
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
              />
              <input
                className="flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--cp)] min-w-32"
                placeholder="Country (optional)"
                value={searchCountry}
                onChange={e => setSearchCountry(e.target.value)}
              />
              <button
                onClick={handleSearch}
                disabled={!selectedItem || loading}
                className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: 'var(--cp)' }}
              >
                {loading ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>}
                Compare
              </button>
            </div>
          </div>

          {/* Results */}
          {searched && (
            <div>
              {/* Sort + summary */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{entries.length}</span> businesses compared
                  {searchCity && <span> in {searchCity}</span>}
                </p>
                <select
                  className="text-sm border rounded-xl px-3 py-1.5 outline-none focus:border-[var(--cp)] bg-white"
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as SortOrder)}
                >
                  <option value="price_asc">Lowest price first</option>
                  <option value="price_desc">Highest price first</option>
                  <option value="rating">Best rated first</option>
                </select>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border p-4 h-20 animate-pulse bg-gray-100"/>)}
                </div>
              ) : sorted.length === 0 ? (
                <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
                  <Search size={32} className="mx-auto mb-2 opacity-30"/>
                  <p className="font-medium">No prices found for "{selectedItem}"</p>
                  <p className="text-sm mt-1">Businesses haven't listed this yet. Check back soon.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sorted.map((entry, idx) => {
                    const isBest = idx === 0 && sortOrder === 'price_asc';
                    const diff = lowestPrice && idx > 0 ? ((entry.price - lowestPrice.price) / lowestPrice.price * 100).toFixed(0) : null;
                    return (
                      <div key={entry.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${isBest ? 'border-green-300 bg-green-50' : ''}`}>
                        {isBest && (
                          <div className="absolute -mt-10 ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">Best Price</div>
                        )}
                        {entry.listing?.logoUrl ? (
                          <img src={entry.listing.logoUrl} alt={entry.listing.name} className="w-12 h-12 object-cover rounded-xl shrink-0"/>
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center text-xl">{cat.emoji}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{entry.listing?.name || 'Business'}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {entry.listing?.verified && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Verified</span>
                                )}
                                {entry.listing?.avgRating ? (
                                  <span className="flex items-center gap-0.5 text-xs text-amber-600">
                                    <Star size={10} fill="currentColor"/> {entry.listing.avgRating.toFixed(1)}
                                    <span className="text-gray-400">({entry.listing.reviewCount})</span>
                                  </span>
                                ) : null}
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <MapPin size={10}/>{entry.listing?.city}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-xl font-black ${isBest ? 'text-green-700' : 'text-gray-900'}`}>
                                {entry.currency} {entry.price.toLocaleString()}
                              </p>
                              {entry.unit && <p className="text-xs text-gray-400">per {entry.unit}</p>}
                              {diff && <p className="text-xs text-red-500 font-medium">+{diff}% vs best</p>}
                            </div>
                          </div>
                        </div>
                        {entry.listing?.phone && (
                          <a
                            href={`tel:${entry.listing.phone}`}
                            className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-green-100 hover:text-green-600"
                          >
                            <Phone size={15}/>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {sorted.length > 0 && (
                <p className="text-xs text-gray-400 text-center mt-4">
                  Prices are submitted by businesses and may not reflect real-time rates. Always confirm with the business directly.
                </p>
              )}
            </div>
          )}

          {/* Prompt businesses to add prices */}
          {!searched && (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-6 text-center text-gray-500">
              <TrendingUp size={32} className="mx-auto mb-2 opacity-30"/>
              <p className="font-medium text-gray-600">Select a category and item above to compare prices</p>
              <p className="text-sm mt-1">Are you a business? <a href="/business" className="font-semibold" style={{ color: 'var(--cp)' }}>List your prices free →</a></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
