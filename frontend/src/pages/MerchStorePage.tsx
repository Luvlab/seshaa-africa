import { useEffect, useState } from 'react';
import { Leaf, ExternalLink, RefreshCw } from 'lucide-react';
import { merchApi } from '../services/api';
import type { MerchProduct, MerchProvider, MerchService } from '../types';

export default function MerchStorePage() {
  const [providers, setProviders] = useState<MerchProvider[]>([]);
  const [activeProvider, setActiveProvider] = useState('printify');
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [services, setServices] = useState<MerchService[]>([]);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    merchApi.providers().then(r => {
      setProviders(r.data || []);
      if (r.data?.[0]?.id) setActiveProvider(r.data[0].id);
    }).catch(() => {});
    merchApi.services().then(r => setServices(r.data.services || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeProvider) return;
    setLoading(true);
    merchApi.products(activeProvider, 24).then(r => {
      setProducts(r.data.products || []);
      setFallback(Boolean(r.data.fallback));
    }).catch(() => {
      setProducts([]);
      setFallback(true);
    }).finally(() => setLoading(false));
  }, [activeProvider]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6 space-y-6">
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          {providers.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${activeProvider === p.id ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white'}`}
              style={activeProvider === p.id ? { backgroundColor: 'var(--cp, #008751)' } : {}}
            >
              {p.name} {p.connected ? '• connected' : '• not linked'}
            </button>
          ))}
          <button
            onClick={() => setActiveProvider(activeProvider)}
            className="ms-auto text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        {fallback && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Showing fallback catalog. Add API keys in Admin → Branding → POD Integrations to load live products.
          </p>
        )}
      </div>

      <div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 border rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(p => (
              <div key={`${p.provider}-${p.id}`} className="bg-white border rounded-2xl overflow-hidden">
                <div className="aspect-square bg-gray-100">
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>}
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-gray-900 line-clamp-2">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase">{p.provider}</span>
                    <span className="text-sm font-bold text-gray-800">
                      {p.priceFrom ? `${p.currency || 'USD'} ${p.priceFrom.toFixed(2)}` : 'Price on request'}
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
          <h2 className="font-bold text-gray-900">African POD Services and Eco Offers</h2>
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
    </div>
  );
}
