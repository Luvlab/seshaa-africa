import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

interface SelectResult {
  address: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (result: SelectResult) => void;
  countryCode?: string;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  countryCode,
  placeholder = 'Search address…',
  className = '',
}: Props) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = { q };
      if (countryCode) params.countryCode = countryCode;
      const res = await api.get('/listings/osm-search', { params });
      const data: NominatimResult[] = res.data?.slice(0, 7) ?? [];
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setResults([]);
    }
  };

  const handleSelect = (r: NominatimResult) => {
    const city =
      r.address.city ?? r.address.town ?? r.address.village ?? r.address.county ?? '';
    const country = r.address.country ?? '';
    const cc = (r.address.country_code ?? '').toUpperCase();

    onChange(r.display_name.slice(0, 60));
    onSelect({
      address: r.display_name,
      city,
      country,
      countryCode: cc,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    });
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white"
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-3 top-3.5 text-xs text-gray-400">Searching…</span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.map((r, i) => (
            <li
              key={i}
              onMouseDown={() => handleSelect(r)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer truncate"
              title={r.display_name}
            >
              {r.display_name.length > 60 ? r.display_name.slice(0, 60) + '…' : r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
