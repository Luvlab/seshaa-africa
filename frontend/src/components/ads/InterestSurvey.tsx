import { useState } from 'react';
import { X, MapPin, Check, Plus } from 'lucide-react';
import { useInterestsStore } from '../../store/interests';

const CATEGORIES = [
  { id: 'food',          label: 'Food & Eat',      emoji: '🍽️' },
  { id: 'health',        label: 'Health',           emoji: '🏥' },
  { id: 'beauty',        label: 'Beauty',           emoji: '💅' },
  { id: 'transport',     label: 'Transport',        emoji: '🚗' },
  { id: 'shopping',      label: 'Shopping',         emoji: '🛍️' },
  { id: 'tech',          label: 'Tech',             emoji: '📱' },
  { id: 'real_estate',   label: 'Property',         emoji: '🏠' },
  { id: 'finance',       label: 'Finance',          emoji: '💳' },
  { id: 'education',     label: 'Schools',          emoji: '📚' },
  { id: 'entertainment', label: 'Entertainment',    emoji: '🎭' },
  { id: 'services',      label: 'Home Services',    emoji: '🔧' },
  { id: 'government',    label: 'Government',       emoji: '🏛️' },
  { id: 'agriculture',   label: 'Farming',          emoji: '🌾' },
  { id: 'church',        label: 'Church / Faith',   emoji: '⛪' },
  { id: 'hotel',         label: 'Hotels',           emoji: '🏨' },
  { id: 'sport',         label: 'Sport',            emoji: '⚽' },
];

// Age groups — fun, no identity judgement
const AGE_GROUPS = [
  { id: 'under18', emoji: '🎒', label: 'Under 18',  desc: 'School, youth, sports' },
  { id: '18_25',   emoji: '🎓', label: '18 – 25',   desc: 'Tech, fashion, events' },
  { id: '26_40',   emoji: '💼', label: '26 – 40',   desc: 'Family, career, home' },
  { id: '41_60',   emoji: '🏡', label: '41 – 60',   desc: 'Business, health, property' },
  { id: '60plus',  emoji: '🧓', label: '60 +',      desc: 'Health, pharmacy, travel' },
];

// Household perspective — completely neutral, just practical
// "A husband finding a hair salon is not feminine — he is smart" 😄
const HOUSEHOLD_TYPES = [
  {
    id: 'self',
    emoji: '👤',
    label: 'Just for me',
    desc: 'I search for things I use personally',
  },
  {
    id: 'family',
    emoji: '👨‍👩‍👧',
    label: 'Me + my family',
    desc: 'I sometimes search for a partner, kids, or elders too',
    note: '(Smart husbands & wives know all the good spots 😄)',
  },
  {
    id: 'business',
    emoji: '🏢',
    label: 'For my business',
    desc: 'Suppliers, services and professional contacts',
  },
];

// All 54 African countries
const AFRICAN_COUNTRIES = [
  { code: 'DZ', name: 'Algeria',              flag: '🇩🇿' },
  { code: 'AO', name: 'Angola',               flag: '🇦🇴' },
  { code: 'BJ', name: 'Benin',                flag: '🇧🇯' },
  { code: 'BW', name: 'Botswana',             flag: '🇧🇼' },
  { code: 'BF', name: 'Burkina Faso',         flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi',              flag: '🇧🇮' },
  { code: 'CV', name: 'Cape Verde',           flag: '🇨🇻' },
  { code: 'CM', name: 'Cameroon',             flag: '🇨🇲' },
  { code: 'CF', name: 'Cent. Afr. Rep.',      flag: '🇨🇫' },
  { code: 'TD', name: 'Chad',                 flag: '🇹🇩' },
  { code: 'KM', name: 'Comoros',              flag: '🇰🇲' },
  { code: 'CG', name: 'Congo',                flag: '🇨🇬' },
  { code: 'CD', name: 'DR Congo',             flag: '🇨🇩' },
  { code: 'CI', name: "Côte d'Ivoire",        flag: '🇨🇮' },
  { code: 'DJ', name: 'Djibouti',             flag: '🇩🇯' },
  { code: 'EG', name: 'Egypt',                flag: '🇪🇬' },
  { code: 'GQ', name: 'Equat. Guinea',        flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea',              flag: '🇪🇷' },
  { code: 'SZ', name: 'Eswatini',             flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia',             flag: '🇪🇹' },
  { code: 'GA', name: 'Gabon',                flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia',               flag: '🇬🇲' },
  { code: 'GH', name: 'Ghana',                flag: '🇬🇭' },
  { code: 'GN', name: 'Guinea',               flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau',        flag: '🇬🇼' },
  { code: 'KE', name: 'Kenya',                flag: '🇰🇪' },
  { code: 'LS', name: 'Lesotho',              flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia',              flag: '🇱🇷' },
  { code: 'LY', name: 'Libya',                flag: '🇱🇾' },
  { code: 'MG', name: 'Madagascar',           flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi',               flag: '🇲🇼' },
  { code: 'ML', name: 'Mali',                 flag: '🇲🇱' },
  { code: 'MR', name: 'Mauritania',           flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius',            flag: '🇲🇺' },
  { code: 'MA', name: 'Morocco',              flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique',           flag: '🇲🇿' },
  { code: 'NA', name: 'Namibia',              flag: '🇳🇦' },
  { code: 'NE', name: 'Niger',                flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria',              flag: '🇳🇬' },
  { code: 'RW', name: 'Rwanda',               flag: '🇷🇼' },
  { code: 'ST', name: 'São Tomé & Príncipe',  flag: '🇸🇹' },
  { code: 'SN', name: 'Senegal',              flag: '🇸🇳' },
  { code: 'SC', name: 'Seychelles',           flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone',         flag: '🇸🇱' },
  { code: 'SO', name: 'Somalia',              flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa',         flag: '🇿🇦' },
  { code: 'SS', name: 'South Sudan',          flag: '🇸🇸' },
  { code: 'SD', name: 'Sudan',                flag: '🇸🇩' },
  { code: 'TZ', name: 'Tanzania',             flag: '🇹🇿' },
  { code: 'TG', name: 'Togo',                 flag: '🇹🇬' },
  { code: 'TN', name: 'Tunisia',              flag: '🇹🇳' },
  { code: 'UG', name: 'Uganda',               flag: '🇺🇬' },
  { code: 'ZM', name: 'Zambia',               flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe',             flag: '🇿🇼' },
];

interface Props { onClose: () => void; }

export default function InterestSurvey({ onClose }: Props) {
  const [step, setStep]         = useState(1);
  const [selectedCats, setSelectedCats]         = useState<string[]>([]);
  const [ageGroup, setAgeGroup]                 = useState('');
  const [householdType, setHouseholdType]       = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [city, setCity]         = useState('');
  const { setSurvey }           = useInterestsStore();

  const toggleCat = (id: string) =>
    setSelectedCats(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const toggleCountry = (code: string) =>
    setSelectedCountries(s => s.includes(code) ? s.filter(x => x !== code) : [...s, code]);

  const handleFinish = async () => {
    const primary = selectedCountries[0] || '';
    // Map household → useType for the API
    const useType = householdType === 'business' ? 'business' : householdType === 'family' ? 'both' : 'personal';
    await setSurvey({ categories: selectedCats, useType, country: primary, city });
    // Store richer profile in localStorage (age, household, all countries)
    localStorage.setItem('seshaa-profile', JSON.stringify({
      ageGroup, householdType, countries: selectedCountries, city,
    }));
    localStorage.setItem('seshaa-countries', JSON.stringify(selectedCountries));
    onClose();
  };

  const STEP_LABELS = ['What you need', 'About you', 'Your countries'];
  const canNext1 = selectedCats.length > 0;
  const canNext2 = !!ageGroup && !!householdType;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="font-black text-gray-900 text-xl leading-tight">Personalise Seshaa 🌍</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Step {step} of 3 — {STEP_LABELS[step - 1]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 ml-3"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 px-5 pb-4 shrink-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-2 flex-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: step >= i ? 'var(--cp)' : '#E5E7EB' }} />
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">

          {/* ── Step 1: Interests ── */}
          {step === 1 && (
            <div>
              <p className="font-bold text-gray-800 text-base mb-1">What are you looking for?</p>
              <p className="text-sm text-gray-500 mb-4">Pick all that apply — the more the better</p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(cat => {
                  const on = selectedCats.includes(cat.id);
                  return (
                    <button key={cat.id} onClick={() => toggleCat(cat.id)}
                      className={`relative p-4 rounded-2xl border-2 text-left active:scale-95 transition-all ${
                        on ? 'border-[var(--cp)] bg-[var(--cp-light,#e6f4ec)]' : 'border-gray-200 bg-white'
                      }`}
                    >
                      {on && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--cp)' }}>
                          <Check size={12} color="white" strokeWidth={3} />
                        </span>
                      )}
                      <span className="text-3xl block mb-2">{cat.emoji}</span>
                      <p className="text-sm font-bold text-gray-700 leading-tight">{cat.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 2: Age + Household (neutral, fun, practical) ── */}
          {step === 2 && (
            <div className="space-y-6">

              {/* Age group */}
              <div>
                <p className="font-bold text-gray-800 text-base mb-1">How old are you?</p>
                <p className="text-sm text-gray-500 mb-3">Helps us show age-relevant services</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {AGE_GROUPS.map(ag => {
                    const on = ageGroup === ag.id;
                    return (
                      <button key={ag.id} onClick={() => setAgeGroup(ag.id)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 active:scale-95 transition-all ${
                          on ? 'border-[var(--cp)] bg-[var(--cp-light,#e6f4ec)]' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className="text-3xl">{ag.emoji}</span>
                        <span className="text-xs font-bold text-gray-700 text-center leading-tight">{ag.label}</span>
                        {on && <Check size={14} strokeWidth={3} style={{ color: 'var(--cp)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Household perspective — practical, gender-neutral */}
              <div>
                <p className="font-bold text-gray-800 text-base mb-1">Who do you search for?</p>
                <p className="text-sm text-gray-500 mb-3">No wrong answer — it's just practical 👌</p>
                <div className="space-y-3">
                  {HOUSEHOLD_TYPES.map(ht => {
                    const on = householdType === ht.id;
                    return (
                      <button key={ht.id} onClick={() => setHouseholdType(ht.id)}
                        className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left active:scale-[0.98] transition-all ${
                          on ? 'border-[var(--cp)] bg-[var(--cp-light,#e6f4ec)]' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className="text-3xl shrink-0 leading-none mt-0.5">{ht.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-base">{ht.label}</p>
                          <p className="text-sm text-gray-500 mt-0.5 leading-snug">{ht.desc}</p>
                          {ht.note && <p className="text-xs text-gray-400 mt-1 italic">{ht.note}</p>}
                        </div>
                        {on && (
                          <div className="w-6 h-6 rounded-full shrink-0 mt-1 flex items-center justify-center"
                            style={{ backgroundColor: 'var(--cp)' }}>
                            <Check size={14} color="white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tasteful neutral note */}
                <p className="text-xs text-gray-400 mt-3 text-center px-2">
                  Seshaa is for everyone. We don't ask about personal identity — only what helps us find the right businesses for you. 🌍
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Countries ── */}
          {step === 3 && (
            <div>
              <p className="font-bold text-gray-800 text-base mb-1 flex items-center gap-2">
                <MapPin size={18} className="text-gray-500" strokeWidth={1.5} />
                Which countries matter to you?
              </p>
              <p className="text-sm text-gray-500 mb-3">Pick all — you can add or change later</p>

              {selectedCountries.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedCountries.map(code => {
                    const c = AFRICAN_COUNTRIES.find(x => x.code === code);
                    return c ? (
                      <span key={code}
                        className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-full border-2"
                        style={{ borderColor: 'var(--cp)', color: 'var(--cp)', backgroundColor: 'var(--cp-light,#e6f4ec)' }}>
                        {c.flag} {c.name}
                        <button onClick={() => toggleCountry(code)} className="ml-0.5 text-gray-400 hover:text-red-400">
                          <X size={12} />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {AFRICAN_COUNTRIES.map(c => {
                  const on = selectedCountries.includes(c.code);
                  return (
                    <button key={c.code} onClick={() => toggleCountry(c.code)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left active:scale-[0.97] transition-all ${
                        on ? 'border-[var(--cp)] bg-[var(--cp-light,#e6f4ec)]' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl shrink-0">{c.flag}</span>
                      <span className="text-sm font-semibold text-gray-700 leading-tight flex-1">{c.name}</span>
                      {on && (
                        <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: 'var(--cp)' }}>
                          <Check size={11} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                  <Plus size={14} /> City (optional)
                </label>
                <input
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base mt-2 outline-none focus:border-[var(--cp)]"
                  placeholder="e.g. Lagos, Nairobi, Accra..."
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-4 border-t border-gray-100 bg-white rounded-b-2xl shrink-0">
          {step > 1 ? (
            <button className="text-base font-semibold text-gray-600 py-3 px-4 rounded-xl hover:bg-gray-100"
              onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          ) : (
            <button className="text-base text-gray-400 py-3 px-4 rounded-xl hover:bg-gray-50"
              onClick={onClose}>
              Skip
            </button>
          )}

          {step < 3 ? (
            <button
              className="px-8 py-3 text-white text-base font-black rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--cp)' }}
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !canNext1 : !canNext2}
            >
              Next →
            </button>
          ) : (
            <button
              className="px-6 py-3 text-white text-base font-black rounded-full"
              style={{ backgroundColor: 'var(--cp)' }}
              onClick={handleFinish}
            >
              My Seshaa 🌍
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
