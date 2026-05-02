import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Tag, Shield, AlertTriangle, X, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import { classifiedsApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { COUNTRIES } from '../components/layout/CountryPicker';
import type { Classified } from '../types';

const CATEGORIES = [
  { id: 'Electronics',        emoji: '📱', sub: ['Phones', 'Tablets', 'Laptops', 'TV & Audio', 'Cameras', 'Gaming', 'Accessories'] },
  { id: 'Vehicles',           emoji: '🚗', sub: ['Cars', 'Motorcycles', 'Trucks', 'Buses', 'Boats', 'Auto Parts', 'Tyres'] },
  { id: 'Real Estate',        emoji: '🏠', sub: ['Houses for Sale', 'Houses for Rent', 'Apartments', 'Land', 'Commercial', 'Short Stay'] },
  { id: 'Clothing & Fashion', emoji: '👗', sub: ['Men\'s Clothing', 'Women\'s Clothing', 'Kids', 'Shoes', 'Bags', 'Jewellery', 'Traditional Wear'] },
  { id: 'Furniture',          emoji: '🛋️', sub: ['Living Room', 'Bedroom', 'Kitchen', 'Office Furniture', 'Outdoor'] },
  { id: 'Appliances',         emoji: '🍳', sub: ['Kitchen Appliances', 'Washing Machines', 'Fridges', 'AC & Fans', 'Generators'] },
  { id: 'Food & Agriculture', emoji: '🌾', sub: ['Farm Produce', 'Livestock', 'Seeds & Fertiliser', 'Processed Food', 'Beverages'] },
  { id: 'Health & Beauty',    emoji: '💊', sub: ['Skincare', 'Hair Products', 'Medical Equipment', 'Fitness', 'Vitamins'] },
  { id: 'Jobs & Services',    emoji: '💼', sub: ['Tech Jobs', 'Construction', 'Domestic Help', 'Teaching', 'Driver', 'Security'] },
  { id: 'Education',          emoji: '📚', sub: ['Textbooks', 'Uniforms', 'Tutoring', 'Courses', 'Study Materials'] },
  { id: 'Sports & Fitness',   emoji: '⚽', sub: ['Football', 'Gym Equipment', 'Cycling', 'Running', 'Outdoor Sports'] },
  { id: 'Kids & Babies',      emoji: '🍼', sub: ['Baby Clothes', 'Toys', 'Strollers', 'Car Seats', 'Baby Gear'] },
  { id: 'Building & Construction', emoji: '🏗️', sub: ['Cement & Steel', 'Tiles & Flooring', 'Roofing', 'Plumbing', 'Electrical', 'Tools'] },
  { id: 'Office & Business',  emoji: '🖥️', sub: ['Office Equipment', 'Printing', 'Stationery', 'Business Machines'] },
  { id: 'Music & Arts',       emoji: '🎸', sub: ['Instruments', 'Artwork', 'Crafts', 'Photography', 'DJ Equipment'] },
  { id: 'Other',              emoji: '📦', sub: ['Miscellaneous', 'Gifts', 'Collectibles'] },
];

const CONDITION_COLORS: Record<string, string> = {
  NEW: 'bg-green-100 text-green-700',
  USED: 'bg-gray-100 text-gray-600',
  REFURBISHED: 'bg-blue-100 text-blue-700',
};

function SafetyBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex gap-3">
      <Shield size={20} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-amber-800">Safety Tips for Buying & Selling</p>
        <ul className="mt-1 space-y-0.5 text-amber-700">
          <li className="flex items-center gap-1"><CheckCircle size={12}/> Always meet in a <strong>public place</strong> — bank lobby, shopping mall, police station</li>
          <li className="flex items-center gap-1"><CheckCircle size={12}/> Never share personal banking details or send money upfront</li>
          <li className="flex items-center gap-1"><CheckCircle size={12}/> Inspect the item before paying — test electronics, verify documents</li>
          <li className="flex items-center gap-1"><CheckCircle size={12}/> Trust your instincts — if a deal feels too good, it probably is</li>
        </ul>
      </div>
      <button onClick={() => setVisible(false)} className="text-amber-400 hover:text-amber-600"><X size={16}/></button>
    </div>
  );
}

function PostForm({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [form, setForm] = useState({
    title: '', description: '', price: '', currency: 'USD',
    category: '', condition: 'USED' as 'NEW' | 'USED' | 'REFURBISHED',
    city: '', country: '',
  });
  const [posting, setPosting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    try {
      await classifiedsApi.create({
        ...form,
        price: parseFloat(form.price),
        images: [],
      });
      onPosted();
    } catch { alert('Error posting. Please try again.'); }
    finally { setPosting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-gray-900">Post a Classified Ad</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400"/></button>
        </div>

        <div className="p-5 bg-amber-50 border-b border-amber-100">
          <div className="flex items-start gap-2 text-sm text-amber-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <p>Seshaa recommends all transactions happen in a <strong>public place</strong>. Never ask buyers to send money without seeing the item.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Title *</label>
            <input required className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-[var(--cp)]"
              value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Samsung Galaxy A55 - Mint Condition" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Category *</label>
            <select required className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-[var(--cp)] bg-white"
              value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
              <option value="">Select category...</option>
              {CATEGORIES.map(cat => (
                <optgroup key={cat.id} label={`${cat.emoji} ${cat.id}`}>
                  {cat.sub.map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Price *</label>
              <input required type="number" min="0" step="0.01" className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-[var(--cp)]"
                value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Currency</label>
              <select className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-[var(--cp)] bg-white"
                value={form.currency} onChange={e => setForm(f => ({...f, currency: e.target.value}))}>
                {['USD', 'NGN', 'KES', 'GHS', 'ZAR', 'EGP', 'ETB', 'TZS', 'XOF', 'XAF'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Condition</label>
            <div className="flex gap-2 mt-1">
              {(['NEW', 'USED', 'REFURBISHED'] as const).map(c => (
                <button type="button" key={c}
                  onClick={() => setForm(f => ({...f, condition: c}))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${form.condition === c ? 'border-[var(--cp)] text-[var(--cp)] bg-[var(--cp-light,#e6f4ec)]' : 'border-gray-200 text-gray-500'}`}
                >{c}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">City *</label>
              <input required className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-[var(--cp)]"
                value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} placeholder="Lagos" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Country *</label>
              <input required className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-[var(--cp)]"
                value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))} placeholder="Nigeria" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-[var(--cp)] h-24 resize-none"
              value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="Describe the item — condition, specs, reason for selling..." />
          </div>

          <button type="submit" disabled={posting}
            className="w-full py-3 text-white rounded-xl font-bold disabled:opacity-60"
            style={{ backgroundColor: 'var(--cp)' }}>
            {posting ? 'Posting...' : 'Post Ad for Free'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ClassifiedCard({ item }: { item: Classified }) {
  const ageHours = (Date.now() - new Date(item.createdAt).getTime()) / 3_600_000;
  const ageLabel = ageHours < 1 ? 'Just now' : ageHours < 24 ? `${Math.floor(ageHours)}h ago` : `${Math.floor(ageHours / 24)}d ago`;

  return (
    <div className="bg-white rounded-2xl border hover:shadow-md transition-shadow p-4 flex gap-3">
      {item.images?.[0] ? (
        <img src={item.images[0]} alt={item.title} className="w-20 h-20 object-cover rounded-xl shrink-0" />
      ) : (
        <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center text-3xl">
          {CATEGORIES.find(c => c.sub.includes(item.category))?.emoji || '📦'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
          {item.status === 'SOLD' && (
            <span className="shrink-0 text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">SOLD</span>
          )}
        </div>
        <p className="text-lg font-black text-gray-900 mt-0.5">
          {item.currency} {item.price.toLocaleString()}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_COLORS[item.condition]}`}>{item.condition}</span>
          <span className="text-xs text-gray-500 flex items-center gap-0.5"><MapPin size={10}/>{item.city}, {item.country}</span>
          <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock size={10}/>{ageLabel}</span>
        </div>
        {item.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>
        )}
      </div>
    </div>
  );
}

export default function ClassifiedsPage() {
  const { user } = useAuthStore();
  const { countryCode } = useThemeStore();
  const [items, setItems] = useState<Classified[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const selectedCountry = countryCode ? (COUNTRIES.find(c => c.code === countryCode)?.name || countryCode) : '';

  const load = async () => {
    setLoading(true);
    try {
      const r = await classifiedsApi.list({
        category: activeCategory || undefined,
        q: search || undefined,
        country: selectedCountry || undefined,
        page,
      });
      setItems(r.data.items);
      setTotal(r.data.total);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeCategory, page, selectedCountry]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Seshaa Classifieds</h1>
          <p className="text-sm text-gray-500 mt-0.5">Buy and sell safely across Africa</p>
        </div>
        <button
          onClick={() => !!user ? setShowPost(true) : alert('Please sign in to post')}
          className="flex items-center gap-2 px-5 py-2.5 text-white rounded-full font-semibold text-sm"
          style={{ backgroundColor: 'var(--cp)' }}
        >
          <Plus size={16}/> Post Ad
        </button>
      </div>

      <SafetyBanner />

      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full border rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[var(--cp)]"
          placeholder="Search classifieds..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </form>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        <button
          onClick={() => { setActiveCategory(''); setPage(1); }}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${!activeCategory ? 'text-white border-[var(--cp)]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
          style={!activeCategory ? { backgroundColor: 'var(--cp)' } : {}}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setPage(1); }}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${activeCategory === cat.id ? 'text-white border-[var(--cp)]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            style={activeCategory === cat.id ? { backgroundColor: 'var(--cp)' } : {}}
          >
            {cat.emoji} {cat.id}
          </button>
        ))}
      </div>

      {/* Subcategory drill */}
      {activeCategory && (
        <div className="flex gap-2 flex-wrap mb-4">
          {CATEGORIES.find(c => c.id === activeCategory)?.sub.map(s => (
            <button
              key={s}
              onClick={() => setActiveCategory(s)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 hover:border-gray-300 text-gray-600"
            >
              <ChevronRight size={11}/> {s}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{total.toLocaleString()} listings</p>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Tag size={12}/> <span>Free to list</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl border p-4 flex gap-3 animate-pulse">
              <div className="w-20 h-20 bg-gray-200 rounded-xl shrink-0"/>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"/>
                <div className="h-5 bg-gray-200 rounded w-1/4"/>
                <div className="h-3 bg-gray-200 rounded w-1/2"/>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">📦</p>
          <p className="font-medium">No listings found</p>
          <p className="text-sm mt-1">Be the first to post in this category</p>
          <button onClick={() => !!user ? setShowPost(true) : alert('Please sign in')} className="mt-3 text-sm font-semibold" style={{ color: 'var(--cp)' }}>
            Post a free ad
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => <ClassifiedCard key={item.id} item={item}/>)}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-3 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border rounded-xl text-sm disabled:opacity-40">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
          <button disabled={items.length < 20} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border rounded-xl text-sm disabled:opacity-40">Next</button>
        </div>
      )}

      {showPost && (
        <PostForm
          onClose={() => setShowPost(false)}
          onPosted={() => { setShowPost(false); load(); }}
        />
      )}
    </div>
  );
}
