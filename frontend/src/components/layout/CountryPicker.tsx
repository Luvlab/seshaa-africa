/**
 * CountryPicker — full-screen bottom-sheet that replaces the browser prompt().
 * Shows all 54 African countries with flag, name, and languages spoken.
 * Selecting a country applies the flag-colour theme to the app.
 */
import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useThemeStore } from '../../store/theme';

// ── Country → languages map ─────────────────────────────────────────────────
// Format: primary official first, then major spoken languages
const COUNTRY_LANGS: Record<string, string[]> = {
  DZ: ['Arabic', 'Tamazight (Berber)', 'French'],
  AO: ['Portuguese', 'Umbundu', 'Kimbundu', 'Kikongo'],
  BJ: ['French', 'Fon', 'Yoruba', 'Bariba'],
  BW: ['Setswana', 'English', 'Kalanga', 'Sekgalagadi'],
  BF: ['French', 'Mooré', 'Dioula', 'Fulfuldé'],
  BI: ['Kirundi', 'French', 'Swahili'],
  CV: ['Portuguese', 'Cape Verdean Creole'],
  CM: ['French', 'English', 'Fulfulde', 'Bamileke', 'Bassa', 'Ewondo'],
  CF: ['Sango', 'French', 'Gbaya', 'Banda'],
  TD: ['Arabic', 'French', 'Sara', 'Fulfuldé'],
  KM: ['Comorian', 'Arabic', 'French'],
  CG: ['French', 'Lingala', 'Kikongo', 'Teke'],
  CD: ['French', 'Lingala', 'Swahili', 'Tshiluba', 'Kikongo'],
  CI: ['French', 'Dioula', 'Baoulé', 'Bété', 'Sénoufo'],
  DJ: ['Somali', 'Afar', 'French', 'Arabic'],
  EG: ['Arabic', 'Sa\'idi Arabic', 'Nubian'],
  GQ: ['Spanish', 'French', 'Portuguese', 'Fang', 'Bubi'],
  ER: ['Tigrinya', 'Arabic', 'Tigre', 'Afar', 'Beja'],
  ET: ['Amharic', 'Oromo', 'Somali', 'Tigrinya', 'Sidamo', 'Afar'],
  GA: ['French', 'Fang', 'Myene', 'Nzebi'],
  GM: ['English', 'Mandinka', 'Wolof', 'Fula', 'Jola'],
  GH: ['English', 'Twi (Akan)', 'Dagbani', 'Ewe', 'Ga', 'Fante'],
  GN: ['French', 'Pular (Fulani)', 'Mandinka', 'Susu'],
  GW: ['Portuguese', 'Crioulo', 'Balanta', 'Fula'],
  KE: ['Swahili', 'English', 'Kikuyu', 'Luhya', 'Luo', 'Kalenjin'],
  LS: ['Sesotho', 'English'],
  LR: ['English', 'Kpelle', 'Bassa', 'Grebo', 'Gio'],
  LY: ['Arabic', 'Tamazight (Berber)', 'Tebu'],
  MG: ['Malagasy', 'French', 'English'],
  MW: ['Chichewa', 'English', 'Tumbuka', 'Yao', 'Lomwe'],
  ML: ['French', 'Bambara', 'Fulfuldé', 'Dogon', 'Soninke'],
  MR: ['Arabic', 'Pulaar', 'Soninke', 'Wolof', 'French'],
  MU: ['Mauritian Creole', 'French', 'English', 'Bhojpuri'],
  MA: ['Darija (Arabic)', 'Tamazight (Berber)', 'French', 'Spanish'],
  MZ: ['Portuguese', 'Makhuwa', 'Tsonga', 'Shona', 'Sena', 'Lomwe'],
  NA: ['English', 'Oshiwambo', 'Afrikaans', 'Herero', 'Damara/Nama'],
  NE: ['French', 'Hausa', 'Zarma', 'Fulfuldé', 'Kanuri'],
  NG: ['English', 'Yoruba', 'Hausa', 'Igbo', 'Fulani', 'Ijaw', 'Kanuri'],
  RW: ['Kinyarwanda', 'French', 'English', 'Swahili'],
  ST: ['Portuguese', 'Forro Creole', 'Angolar'],
  SN: ['French', 'Wolof', 'Pulaar', 'Serer', 'Mandinka', 'Diola'],
  SC: ['Seselwa Creole', 'English', 'French'],
  SL: ['English', 'Krio', 'Temne', 'Mende'],
  SO: ['Somali', 'Arabic'],
  ZA: ['Zulu', 'Xhosa', 'Afrikaans', 'English', 'Sotho', 'Tswana', 'Venda', 'Tsonga', 'Swati', 'Ndebele', 'Pedi'],
  SS: ['English', 'Arabic', 'Dinka', 'Nuer', 'Bari'],
  SD: ['Arabic', 'English', 'Nubian', 'Beja', 'Fur'],
  SZ: ['Swati', 'English'],
  TZ: ['Swahili', 'English', 'Sukuma', 'Chaga', 'Haya', 'Nyamwezi'],
  TG: ['French', 'Ewe', 'Kabiyé', 'Gurma'],
  TN: ['Arabic', 'French', 'Tamazight (Berber)'],
  UG: ['English', 'Swahili', 'Luganda', 'Runyankole', 'Acholi', 'Langi'],
  ZM: ['English', 'Bemba', 'Nyanja', 'Tonga', 'Lozi', 'Kaonde'],
  ZW: ['Shona', 'Ndebele', 'English', 'Tonga', 'Kalanga', 'Venda'],
};

// ── Flag emoji from ISO-2 code ────────────────────────────────────────────────
function flagEmoji(code: string): string {
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
  ).join('');
}

// ── Country list with all metadata ───────────────────────────────────────────
export interface CountryEntry {
  code: string;
  name: string;
  flag: string;
  langs: string[];
  region: string;
}

const COUNTRIES: CountryEntry[] = [
  // West Africa
  { code:'NG', name:'Nigeria',           region:'West Africa',    flag:flagEmoji('NG'), langs: COUNTRY_LANGS['NG'] },
  { code:'GH', name:'Ghana',             region:'West Africa',    flag:flagEmoji('GH'), langs: COUNTRY_LANGS['GH'] },
  { code:'SN', name:'Senegal',           region:'West Africa',    flag:flagEmoji('SN'), langs: COUNTRY_LANGS['SN'] },
  { code:'CI', name:"Côte d'Ivoire",     region:'West Africa',    flag:flagEmoji('CI'), langs: COUNTRY_LANGS['CI'] },
  { code:'CM', name:'Cameroon',          region:'Central Africa', flag:flagEmoji('CM'), langs: COUNTRY_LANGS['CM'] },
  { code:'BF', name:'Burkina Faso',      region:'West Africa',    flag:flagEmoji('BF'), langs: COUNTRY_LANGS['BF'] },
  { code:'ML', name:'Mali',              region:'West Africa',    flag:flagEmoji('ML'), langs: COUNTRY_LANGS['ML'] },
  { code:'NE', name:'Niger',             region:'West Africa',    flag:flagEmoji('NE'), langs: COUNTRY_LANGS['NE'] },
  { code:'GN', name:'Guinea',            region:'West Africa',    flag:flagEmoji('GN'), langs: COUNTRY_LANGS['GN'] },
  { code:'BJ', name:'Benin',             region:'West Africa',    flag:flagEmoji('BJ'), langs: COUNTRY_LANGS['BJ'] },
  { code:'TG', name:'Togo',              region:'West Africa',    flag:flagEmoji('TG'), langs: COUNTRY_LANGS['TG'] },
  { code:'SL', name:'Sierra Leone',      region:'West Africa',    flag:flagEmoji('SL'), langs: COUNTRY_LANGS['SL'] },
  { code:'LR', name:'Liberia',           region:'West Africa',    flag:flagEmoji('LR'), langs: COUNTRY_LANGS['LR'] },
  { code:'GM', name:'Gambia',            region:'West Africa',    flag:flagEmoji('GM'), langs: COUNTRY_LANGS['GM'] },
  { code:'GW', name:'Guinea-Bissau',     region:'West Africa',    flag:flagEmoji('GW'), langs: COUNTRY_LANGS['GW'] },
  { code:'CV', name:'Cape Verde',        region:'West Africa',    flag:flagEmoji('CV'), langs: COUNTRY_LANGS['CV'] },
  // East Africa
  { code:'KE', name:'Kenya',             region:'East Africa',    flag:flagEmoji('KE'), langs: COUNTRY_LANGS['KE'] },
  { code:'ET', name:'Ethiopia',          region:'East Africa',    flag:flagEmoji('ET'), langs: COUNTRY_LANGS['ET'] },
  { code:'TZ', name:'Tanzania',          region:'East Africa',    flag:flagEmoji('TZ'), langs: COUNTRY_LANGS['TZ'] },
  { code:'UG', name:'Uganda',            region:'East Africa',    flag:flagEmoji('UG'), langs: COUNTRY_LANGS['UG'] },
  { code:'RW', name:'Rwanda',            region:'East Africa',    flag:flagEmoji('RW'), langs: COUNTRY_LANGS['RW'] },
  { code:'BI', name:'Burundi',           region:'East Africa',    flag:flagEmoji('BI'), langs: COUNTRY_LANGS['BI'] },
  { code:'SS', name:'South Sudan',       region:'East Africa',    flag:flagEmoji('SS'), langs: COUNTRY_LANGS['SS'] },
  { code:'SO', name:'Somalia',           region:'East Africa',    flag:flagEmoji('SO'), langs: COUNTRY_LANGS['SO'] },
  { code:'DJ', name:'Djibouti',          region:'East Africa',    flag:flagEmoji('DJ'), langs: COUNTRY_LANGS['DJ'] },
  { code:'ER', name:'Eritrea',           region:'East Africa',    flag:flagEmoji('ER'), langs: COUNTRY_LANGS['ER'] },
  { code:'MG', name:'Madagascar',        region:'East Africa',    flag:flagEmoji('MG'), langs: COUNTRY_LANGS['MG'] },
  { code:'MU', name:'Mauritius',         region:'East Africa',    flag:flagEmoji('MU'), langs: COUNTRY_LANGS['MU'] },
  { code:'KM', name:'Comoros',           region:'East Africa',    flag:flagEmoji('KM'), langs: COUNTRY_LANGS['KM'] },
  { code:'SC', name:'Seychelles',        region:'East Africa',    flag:flagEmoji('SC'), langs: COUNTRY_LANGS['SC'] },
  // Central Africa
  { code:'CD', name:'DR Congo',          region:'Central Africa', flag:flagEmoji('CD'), langs: COUNTRY_LANGS['CD'] },
  { code:'CG', name:'Republic of Congo', region:'Central Africa', flag:flagEmoji('CG'), langs: COUNTRY_LANGS['CG'] },
  { code:'GA', name:'Gabon',             region:'Central Africa', flag:flagEmoji('GA'), langs: COUNTRY_LANGS['GA'] },
  { code:'CF', name:'Central African Republic', region:'Central Africa', flag:flagEmoji('CF'), langs: COUNTRY_LANGS['CF'] },
  { code:'TD', name:'Chad',              region:'Central Africa', flag:flagEmoji('TD'), langs: COUNTRY_LANGS['TD'] },
  { code:'GQ', name:'Equatorial Guinea', region:'Central Africa', flag:flagEmoji('GQ'), langs: COUNTRY_LANGS['GQ'] },
  { code:'ST', name:'São Tomé & Príncipe',region:'Central Africa',flag:flagEmoji('ST'), langs: COUNTRY_LANGS['ST'] },
  // Southern Africa
  { code:'ZA', name:'South Africa',      region:'Southern Africa',flag:flagEmoji('ZA'), langs: COUNTRY_LANGS['ZA'] },
  { code:'ZW', name:'Zimbabwe',          region:'Southern Africa',flag:flagEmoji('ZW'), langs: COUNTRY_LANGS['ZW'] },
  { code:'ZM', name:'Zambia',            region:'Southern Africa',flag:flagEmoji('ZM'), langs: COUNTRY_LANGS['ZM'] },
  { code:'MW', name:'Malawi',            region:'Southern Africa',flag:flagEmoji('MW'), langs: COUNTRY_LANGS['MW'] },
  { code:'MZ', name:'Mozambique',        region:'Southern Africa',flag:flagEmoji('MZ'), langs: COUNTRY_LANGS['MZ'] },
  { code:'AO', name:'Angola',            region:'Southern Africa',flag:flagEmoji('AO'), langs: COUNTRY_LANGS['AO'] },
  { code:'BW', name:'Botswana',          region:'Southern Africa',flag:flagEmoji('BW'), langs: COUNTRY_LANGS['BW'] },
  { code:'NA', name:'Namibia',           region:'Southern Africa',flag:flagEmoji('NA'), langs: COUNTRY_LANGS['NA'] },
  { code:'LS', name:'Lesotho',           region:'Southern Africa',flag:flagEmoji('LS'), langs: COUNTRY_LANGS['LS'] },
  { code:'SZ', name:'Eswatini',          region:'Southern Africa',flag:flagEmoji('SZ'), langs: COUNTRY_LANGS['SZ'] },
  // North Africa
  { code:'EG', name:'Egypt',             region:'North Africa',   flag:flagEmoji('EG'), langs: COUNTRY_LANGS['EG'] },
  { code:'MA', name:'Morocco',           region:'North Africa',   flag:flagEmoji('MA'), langs: COUNTRY_LANGS['MA'] },
  { code:'DZ', name:'Algeria',           region:'North Africa',   flag:flagEmoji('DZ'), langs: COUNTRY_LANGS['DZ'] },
  { code:'TN', name:'Tunisia',           region:'North Africa',   flag:flagEmoji('TN'), langs: COUNTRY_LANGS['TN'] },
  { code:'LY', name:'Libya',             region:'North Africa',   flag:flagEmoji('LY'), langs: COUNTRY_LANGS['LY'] },
  { code:'SD', name:'Sudan',             region:'North Africa',   flag:flagEmoji('SD'), langs: COUNTRY_LANGS['SD'] },
  { code:'MR', name:'Mauritania',        region:'North Africa',   flag:flagEmoji('MR'), langs: COUNTRY_LANGS['MR'] },
  // World / Diaspora
  { code: 'GB', name: 'United Kingdom',   region: 'Diaspora', flag: '🇬🇧', langs: ['English'] },
  { code: 'US', name: 'United States',    region: 'Diaspora', flag: '🇺🇸', langs: ['English', 'Spanish'] },
  { code: 'FR', name: 'France',           region: 'Diaspora', flag: '🇫🇷', langs: ['French'] },
  { code: 'CA', name: 'Canada',           region: 'Diaspora', flag: '🇨🇦', langs: ['English', 'French'] },
  { code: 'DE', name: 'Germany',          region: 'Diaspora', flag: '🇩🇪', langs: ['German'] },
  { code: 'IT', name: 'Italy',            region: 'Diaspora', flag: '🇮🇹', langs: ['Italian'] },
  { code: 'NL', name: 'Netherlands',      region: 'Diaspora', flag: '🇳🇱', langs: ['Dutch', 'English'] },
  { code: 'BE', name: 'Belgium',          region: 'Diaspora', flag: '🇧🇪', langs: ['French', 'Dutch', 'German'] },
  { code: 'PT', name: 'Portugal',         region: 'Diaspora', flag: '🇵🇹', langs: ['Portuguese'] },
  { code: 'ES', name: 'Spain',            region: 'Diaspora', flag: '🇪🇸', langs: ['Spanish'] },
  { code: 'SE', name: 'Sweden',           region: 'Diaspora', flag: '🇸🇪', langs: ['Swedish'] },
  { code: 'NO', name: 'Norway',           region: 'Diaspora', flag: '🇳🇴', langs: ['Norwegian'] },
  { code: 'AE', name: 'UAE',              region: 'Diaspora', flag: '🇦🇪', langs: ['Arabic', 'English'] },
  { code: 'SA', name: 'Saudi Arabia',     region: 'Diaspora', flag: '🇸🇦', langs: ['Arabic'] },
  { code: 'CN', name: 'China',            region: 'Diaspora', flag: '🇨🇳', langs: ['Mandarin'] },
  { code: 'IN', name: 'India',            region: 'Diaspora', flag: '🇮🇳', langs: ['Hindi', 'English'] },
  { code: 'AU', name: 'Australia',        region: 'Diaspora', flag: '🇦🇺', langs: ['English'] },
  { code: 'BR', name: 'Brazil',           region: 'Diaspora', flag: '🇧🇷', langs: ['Portuguese'] },
];

export { COUNTRIES };

interface Props {
  onSelect: (code: string) => void;
  onClose: () => void;
  currentCode: string;
}

export default function CountryPicker({ onSelect, onClose, currentCode }: Props) {
  const [q, setQ] = useState('');
  const { countryClicks } = useThemeStore();

  // Countries sorted alphabetically within each region
  const COUNTRIES_ALPHA = useMemo(() =>
    [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)),
  []);

  // Frequent countries: clicked 2+ times, sorted by click count desc, top 8
  const frequentCodes = useMemo(() => {
    return Object.entries(countryClicks)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code]) => code);
  }, [countryClicks]);

  const frequentCountries = useMemo(() =>
    frequentCodes
      .map(code => COUNTRIES_ALPHA.find(c => c.code === code))
      .filter(Boolean) as CountryEntry[],
  [frequentCodes, COUNTRIES_ALPHA]);

  const filtered = useMemo(() => {
    if (!q.trim()) return COUNTRIES_ALPHA;
    const lc = q.toLowerCase();
    return COUNTRIES_ALPHA.filter(c =>
      c.name.toLowerCase().includes(lc) ||
      c.region.toLowerCase().includes(lc) ||
      c.langs.some(l => l.toLowerCase().includes(lc)) ||
      c.code.toLowerCase().includes(lc)
    );
  }, [q, COUNTRIES_ALPHA]);

  // Group by region (already alphabetically sorted within each)
  const regions = useMemo(() => {
    const map = new Map<string, CountryEntry[]>();
    for (const c of filtered) {
      if (!map.has(c.region)) map.set(c.region, []);
      map.get(c.region)!.push(c);
    }
    return map;
  }, [filtered]);

  return (
    <div
      className="fixed left-0 right-0 z-[9999] flex flex-col"
      style={{
        top: 'var(--nav-h, 56px)',
        bottom: 'var(--tab-h, 0px)',
        backgroundColor: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Full-height panel */}
      <div className="h-full w-full max-w-2xl mx-auto bg-white/[0.95] backdrop-blur-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex-1">
            <h2 className="text-lg font-black text-gray-900">Choose Your Country</h2>
            <p className="text-xs text-gray-500 mt-0.5">Sets the app colours and default language</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
              placeholder="Search country, language, region…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Country list — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">

          {/* All Africa special option */}
          <button
            onClick={() => { onSelect(''); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors mb-3 ${
              currentCode === '' ? 'bg-green-50 border-2 border-green-200' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-100 hover:border-green-300'
            }`}
          >
            <span className="text-3xl leading-none shrink-0">🌍</span>
            <div className="flex-1">
              <p className={`font-bold text-sm ${currentCode === '' ? 'text-green-700' : 'text-green-800'}`}>
                All Africa
                {currentCode === '' && <span className="ml-2 text-xs text-green-500">✓ current</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Search all 54 countries</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${currentCode === '' ? 'bg-green-100 text-green-700' : 'bg-green-50 text-green-600'}`}>ALL</span>
          </button>

          {/* Frequent / recently used countries */}
          {!q.trim() && frequentCountries.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                ⭐ Your Countries
              </p>
              <div className="space-y-1">
                {frequentCountries.map(c => {
                  const isActive = c.code === currentCode;
                  return (
                    <button
                      key={c.code}
                      onClick={() => { onSelect(c.code); onClose(); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                        isActive
                          ? 'bg-green-50 border-2 border-green-200'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <span className="text-3xl leading-none shrink-0">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${isActive ? 'text-green-700' : 'text-gray-900'}`}>
                          {c.name}
                          {isActive && <span className="ml-2 text-xs text-green-500">✓ current</span>}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {c.langs.slice(0, 3).join(' · ')}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{c.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {Array.from(regions.entries()).map(([region, countries]) => (
            <div key={region} className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {region === 'Diaspora' ? '🌐 World & Diaspora' : region}
              </p>
              {region === 'Diaspora' && (
                <p className="text-xs text-gray-400 px-1 mb-2">For African diaspora communities</p>
              )}
              <div className="space-y-1">
                {countries.map(c => {
                  const isActive = c.code === currentCode;
                  return (
                    <button
                      key={c.code}
                      onClick={() => { onSelect(c.code); onClose(); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                        isActive
                          ? 'bg-green-50 border-2 border-green-200'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      {/* Flag */}
                      <span className="text-3xl leading-none shrink-0">{c.flag}</span>

                      {/* Name + languages */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${isActive ? 'text-green-700' : 'text-gray-900'}`}>
                          {c.name}
                          {isActive && <span className="ml-2 text-xs text-green-500">✓ current</span>}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {c.langs.slice(0, 4).join(' · ')}
                          {c.langs.length > 4 && ` · +${c.langs.length - 4} more`}
                        </p>
                      </div>

                      {/* Code badge */}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{c.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🌍</p>
              <p className="text-sm">No countries match "{q}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
