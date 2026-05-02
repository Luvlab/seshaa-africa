/**
 * AddressAutocomplete
 *
 * Uses Google Places Autocomplete when VITE_GOOGLE_PLACES_KEY is set.
 * Falls back to OpenStreetMap Nominatim otherwise.
 *
 * Biases results toward Africa + key diaspora countries.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';

// ── Africa bounding box for Places bias ───────────────────────────────────��──
const AFRICA_SW = { lat: -35.0, lng: -18.0 };
const AFRICA_NE = { lat:  37.5, lng:  52.0 };

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string; suburb?: string; city?: string; town?: string;
    village?: string; county?: string; state?: string;
    country?: string; country_code?: string;
  };
}

export interface SelectResult {
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

// ── Access the Google key safely (Vite injects at build time) ───────────────��
const GOOGLE_KEY: string = (import.meta.env as Record<string, string>).VITE_GOOGLE_PLACES_KEY ?? '';

// ── Minimal Google Maps types (avoids needing @types/google.maps) ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GMaps = any;

function getGoogle(): GMaps | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).google;
}

// ── Load the Google Maps script once globally ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = window as any;

function loadGoogleMaps(): Promise<void> {
  if (win.__googleMapsLoaded) return Promise.resolve();
  if (win.__googleMapsLoading) {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (win.__googleMapsLoaded) { clearInterval(check); resolve(); }
      }, 100);
    });
  }
  win.__googleMapsLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload  = () => { win.__googleMapsLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Places mode
// ─────────────────────────────────────────────────────────────────────────────
function GooglePlacesInput({ value, onChange, onSelect, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acRef = useRef<any>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      const google = getGoogle();
      if (!inputRef.current || !google) return;

      const bounds = new google.maps.LatLngBounds(AFRICA_SW, AFRICA_NE);
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        fields: ['address_components', 'geometry', 'formatted_address'],
        strictBounds: false, // allow diaspora results outside Africa bbox
      });
      ac.setBounds(bounds);

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place?.geometry?.location) return;

        const components: Array<{ long_name: string; short_name: string; types: string[] }> =
          place.address_components ?? [];
        const get = (type: string, short = false) =>
          components.find((c) => c.types.includes(type))?.[short ? 'short_name' : 'long_name'] ?? '';

        const city =
          get('locality') ||
          get('sublocality_level_1') ||
          get('administrative_area_level_2') ||
          get('administrative_area_level_1');
        const country     = get('country');
        const countryCode = get('country', true).toUpperCase();
        const address     = (place.formatted_address ?? '') as string;

        onChange(address.slice(0, 80));
        onSelect({
          address,
          city,
          country,
          countryCode,
          lat: place.geometry.location.lat(),
          lon: place.geometry.location.lng(),
        });
      });
      acRef.current = ac;
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative ${className ?? ''}`}>
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white"
      />
      <span className="absolute right-3 top-3.5 text-[10px] text-gray-300 select-none pointer-events-none">
        Google
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nominatim fallback mode (existing implementation)
// ─────────────────────────────────────────────────────────────────────────────
function NominatimInput({ value, onChange, onSelect, countryCode, placeholder, className }: Props) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const params: Record<string, string> = { q };
      if (countryCode) params.countryCode = countryCode;
      const res = await api.get('/listings/osm-search', { params });
      const data: NominatimResult[] = res.data?.slice(0, 7) ?? [];
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]); setOpen(false);
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

  const handleSelect = (r: NominatimResult) => {
    const city =
      r.address.city ?? r.address.town ?? r.address.village ?? r.address.county ?? '';
    onChange(r.display_name.slice(0, 60));
    onSelect({
      address:     r.display_name,
      city,
      country:     r.address.country    ?? '',
      countryCode: (r.address.country_code ?? '').toUpperCase(),
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    });
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white"
      />
      {loading && (
        <span className="absolute right-3 top-3.5 text-xs text-gray-400">Searching…</span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i} onMouseDown={() => handleSelect(r)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer truncate"
              title={r.display_name}>
              {r.display_name.length > 60 ? r.display_name.slice(0, 60) + '…' : r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — picks implementation based on whether API key is set
// ─────────────────────────────────────────────────────────────────────────────
export default function AddressAutocomplete(props: Props) {
  return GOOGLE_KEY
    ? <GooglePlacesInput {...props} />
    : <NominatimInput   {...props} />;
}
