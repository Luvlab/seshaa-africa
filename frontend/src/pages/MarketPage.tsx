import { useEffect, useState } from 'react';
import { Leaf, ExternalLink, RefreshCw, ShoppingBag, Package, Plus, X, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { merchApi } from '../services/api';
import api from '../services/api';
import type { MerchProduct, MerchProvider, MerchService } from '../types';
import FavoriteButton from '../components/ui/FavoriteButton';
import SeshaaTitle from '../components/brand/SeshaaTitle';
import { useAuthStore } from '../store/auth';

interface BusinessProduct {
  id: string;
  listingId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  currency: string;
  inStock: boolean;
  contactUrl?: string;
  active: boolean;
  createdAt: string;
  listing: {
    id: string;
    name: string;
    city?: string;
    country?: string;
    category?: string;
    tier: string;
  };
}

interface MyListing {
  id: string;
  name: string;
  tier: string;
}

type MarketTab = 'businesses' | 'pod';

export default function MarketPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<MarketTab>('businesses');

  // ── Business products ──────────────────────────────────────────────────────
  const [bizProducts, setBizProducts] = useState<BusinessProduct[]>([]);
  const [bizLoading, setBizLoading]   = useState(false);

  // ── Add product form ───────────────────────────────────────────────────────
  const [showForm, setShowForm]     = useState(false);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [form, setForm] = useState({ listingId: '', name: '', description: '', price: '', currency: 'USD', contactUrl: '', imageUrl: '' });
  const [formMsg, setFormMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── POD ────────────────────────────────────────────────────────────────────
  const [providers, setProviders]           = useState<MerchProvider[]>([]);
  const [activeProvider, setActiveProvider] = useState('printify');
  const [products, setProducts]             = useState<MerchProduct[]>([]);
  const [services, setServices]             = useState<MerchService[]>([]);
  const [podLoading, setPodLoading]         = useState(false);
  const [fallback, setFallback]             = useState(false);

  // Load business products
  useEffect(() => {
    setBizLoading(true);
    api.get<BusinessProduct[]>('/market/products')
      .then(r => setBizProducts(r.data || []))
      .catch(() => {})
      .finally(() => setBizLoading(false));
  }, []);

  // Load my listings (for add-product form)
  useEffect(() => {
    if (!user) return;
    api.get<MyListing[]>('/listings/mine').then(r => {
      const eligible = (r.data || []).filter((l: MyListing) => ['GOLD', 'DIAMOND'].includes(l.tier));
      setMyListings(eligible);
    }).catch(() => {});
  }, [user]);

  // Load POD providers
  useEffect(() => {
    merchApi.providers().then(r => {
      setProviders(r.data || []);
      if (r.data?.[0]?.id) setActiveProvider(r.data[0].id);
    }).catch(() => {});
    merchApi.services().then(r => setServices(r.data.services || [])).catch(() => {});
  }, []);

  // Load POD products when provider changes
  useEffect(() => {
    if (!activeProvider) return;
    setPodLoading(true);
    merchApi.products(activeProvider, 24).then(r => {
      setProducts(r.data.products || []);
      setFallback(Boolean(r.data.fallback));
    }).catch(() => {
      setProducts([]);
      setFallback(true);
    }).finally(() => setPodLoading(false));
  }, [activeProvider]);

  const submitProduct = async () => {
    if (!form.listingId || !form.name.trim()) {
      setFormMsg('Business and product name are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/market/products', {
        listingId: form.listingId,
        name: form.name.trim(),
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        currency: form.currency,
        contactUrl: form.contactUrl || undefined,
      });
      setFormMsg('Product listed on seshaa.market! ✓');
      setForm({ listingId: '', name: '', description: '', price: '', currency: 'USD', contactUrl: '', imageUrl: '' });
      // Refresh business products
      const r = await api.get<BusinessProduct[]>('/market/products');
      setBizProducts(r.data || []);
      setTimeout(() => { setShowForm(false); setFormMsg(''); }, 1500);
    } catch (err: any) {
      setFormMsg(err?.response?.data?.error || 'Failed to list product.');
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-3">
        <SeshaaTitle staticSuffix="market" size="md" />
        {user && myListings.length > 0 && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl text-white"
            style={{ backgroundColor: 'var(--cp,#008751)' }}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'Add Product'}
          </button>
        )}
      </div>

      {/* ── Add product form ── */}
      {showForm && myListings.length > 0 && (
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Store size={16} style={{ color: 'var(--cp)' }} /> List a product on seshaa.market</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Business *</label>
              <select className="w-full border rounded-xl px-3 py-2 text-sm outline-none" value={form.listingId} onChange={e => setForm(f => ({ ...f, listingId: e.target.value }))}>
                <option value="">Select your business…</option>
                {myListings.map(l => <option key={l.id} value={l.id}>{l.name} ({l.tier})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Product name *</label>
              <input className="w-full border rounded-xl px-3 py-2 text-sm outline-none" placeholder="e.g. Handmade Kente Bracelet" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1">Description</label>
              <textarea className="w-full border rounded-xl px-3 py-2 text-sm outline-none resize-none" rows={2} placeholder="Brief description of the product…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Price</label>
              <div className="flex gap-2">
                <input type="number" className="w-full border rounded-xl px-3 py-2 text-sm outline-none" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                <select className="border rounded-xl px-2 py-2 text-sm outline-none shrink-0" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option>USD</option><option>EUR</option><option>GBP</option><option>NGN</option><option>KES</option><option>GHS</option><option>ZAR</option><option>EGP</option><option>MAD</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Buy / Contact link</label>
              <input className="w-full border rounded-xl px-3 py-2 text-sm outline-none" placeholder="WhatsApp, website, or order link…" value={form.contactUrl} onChange={e => setForm(f => ({ ...f, contactUrl: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1">Product image URL (optional)</label>
              <input className="w-full border rounded-xl px-3 py-2 text-sm outline-none" placeholder="https://…" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
            </div>
          </div>
          {formMsg && <p className={`text-sm font-medium ${formMsg.includes('✓') ? 'text-green-700' : 'text-red-600'}`}>{formMsg}</p>}
          <button onClick={submitProduct} disabled={submitting} className="px-5 py-2 rounded-xl text-white font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: 'var(--cp,#008751)' }}>
            {submitting ? 'Publishing…' : 'Publish to Market'}
          </button>
        </div>
      )}

      {/* ── If user has listings but they're SILVER, show upgrade prompt ── */}
      {user && myListings.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <Package size={15} />
          <span>Upgrade your listing to <strong>GOLD or DIAMOND</strong> to sell products on seshaa.market.</span>
        </div>
      )}

      {/* ── Tab switcher ── */}
      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setTab('businesses')}
          className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-colors ${tab === 'businesses' ? 'border-current' : 'border-transparent text-gray-400'}`}
          style={tab === 'businesses' ? { color: 'var(--cp)', borderColor: 'var(--cp)' } : {}}>
          <span className="flex items-center gap-1.5"><Store size={14} /> Businesses</span>
        </button>
        <button onClick={() => setTab('pod')}
          className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-colors ${tab === 'pod' ? 'border-current' : 'border-transparent text-gray-400'}`}
          style={tab === 'pod' ? { color: 'var(--cp)', borderColor: 'var(--cp)' } : {}}>
          <span className="flex items-center gap-1.5"><ShoppingBag size={14} /> Print on Demand</span>
        </button>
      </div>

      {/* ── Business products tab ── */}
      {tab === 'businesses' && (
        <div>
          {bizLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-64 border rounded-2xl bg-white animate-pulse" />)}
            </div>
          ) : bizProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Store size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-gray-500">No business products yet</p>
              <p className="text-sm mt-1">GOLD and DIAMOND listing owners can add their products here.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {bizProducts.map(p => (
                <div key={p.id} className="relative bg-white border rounded-2xl overflow-hidden">
                  <div className="absolute top-2 right-2 z-10">
                    <FavoriteButton id={p.id} type="merch" name={p.name} size={14} />
                  </div>
                  <div className="aspect-square bg-gray-100">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-gray-900 line-clamp-2">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-800">
                        {p.price ? `${p.currency} ${p.price.toFixed(2)}` : 'Price on request'}
                      </span>
                      {p.listing.tier === 'DIAMOND' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">DIAMOND</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <a href={`/listing/${p.listingId}`} className="text-xs text-gray-500 hover:underline truncate">{p.listing.name}</a>
                      {p.contactUrl && (
                        <a href={p.contactUrl} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                          style={{ backgroundColor: 'var(--cp,#008751)' }}>
                          Buy
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Print on Demand tab ── */}
      {tab === 'pod' && (
        <>
          <div className="bg-white border rounded-2xl p-4">
            <div className="flex flex-wrap gap-2">
              {providers.map(p => (
                <button key={p.id} onClick={() => setActiveProvider(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${activeProvider === p.id ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white'}`}
                  style={activeProvider === p.id ? { backgroundColor: 'var(--cp, #008751)' } : {}}>
                  {p.name} {p.connected ? `• ${t('common.connected')}` : `• ${t('merch.notLinked')}`}
                </button>
              ))}
              <button onClick={() => setActiveProvider(activeProvider)}
                className="ms-auto text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
                <RefreshCw size={12} /> {t('common.refresh')}
              </button>
            </div>
            {fallback && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {t('merch.fallbackCatalog')}
              </p>
            )}
          </div>

          <div>
            {podLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-64 border rounded-2xl bg-white animate-pulse" />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => (
                  <div key={`${p.provider}-${p.id}`} className="relative bg-white border rounded-2xl overflow-hidden">
                    <div className="absolute top-2 right-2 z-10">
                      <FavoriteButton id={`${p.provider}-${p.id}`} type="merch" name={p.name} size={14} />
                    </div>
                    <div className="aspect-square bg-gray-100">
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">{t('common.noImage')}</div>}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-gray-900 line-clamp-2">{p.name}</p>
                      {p.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400 uppercase">{p.provider}</span>
                        <span className="text-sm font-bold text-gray-800">
                          {p.priceFrom ? `${p.currency || 'USD'} ${p.priceFrom.toFixed(2)}` : t('merch.priceOnRequest')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Leaf size={16} className="text-emerald-600" />
              <h2 className="font-bold text-gray-900">{t('merch.ecoServices')}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {services.map(s => (
                <a key={s.website} href={s.website} target="_blank" rel="noopener noreferrer" className="block border border-gray-200 rounded-xl p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                    <ExternalLink size={13} className="text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{s.region}</p>
                  {s.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>}
                  {s.eco && <p className="text-xs text-emerald-700 mt-1">{s.eco}</p>}
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
