import { useState } from 'react';
import { X, MapPin, Briefcase, User } from 'lucide-react';
import { useInterestsStore } from '../../store/interests';

const CATEGORIES = [
  { id: 'food', label: 'Food & Restaurants', emoji: '🍽️' },
  { id: 'health', label: 'Health & Clinics', emoji: '🏥' },
  { id: 'beauty', label: 'Beauty & Salon', emoji: '💅' },
  { id: 'transport', label: 'Transport & Chauffeur', emoji: '🚗' },
  { id: 'shopping', label: 'Shopping & Fashion', emoji: '🛍️' },
  { id: 'tech', label: 'Tech & Electronics', emoji: '📱' },
  { id: 'real_estate', label: 'Real Estate', emoji: '🏠' },
  { id: 'finance', label: 'Finance & Banking', emoji: '💳' },
  { id: 'education', label: 'Education & Schools', emoji: '📚' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎭' },
  { id: 'services', label: 'Home Services', emoji: '🔧' },
  { id: 'government', label: 'Government & Public', emoji: '🏛️' },
];

interface Props {
  onClose: () => void;
}

export default function InterestSurvey({ onClose }: Props) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [useType, setUseType] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const { setSurvey } = useInterestsStore();

  const toggle = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const handleFinish = async () => {
    await setSurvey({ categories: selected, useType, country, city });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Personalise Seshaa for you</h2>
            <p className="text-sm text-gray-500 mt-0.5">Quick 3-step setup — takes 30 seconds</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 px-5 pt-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ backgroundColor: step >= i ? 'var(--cp)' : '#E5E7EB' }}
            />
          ))}
        </div>

        <div className="p-5">
          {step === 1 && (
            <div>
              <p className="font-semibold text-gray-800 mb-1">What are you looking for?</p>
              <p className="text-sm text-gray-500 mb-4">Pick all that apply</p>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggle(cat.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selected.includes(cat.id)
                        ? 'border-[var(--cp)] bg-[var(--cp-light,#e6f4ec)]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <p className="text-xs font-medium text-gray-700 mt-1 leading-tight">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="font-semibold text-gray-800 mb-1">How will you use Seshaa?</p>
              <p className="text-sm text-gray-500 mb-4">This helps us show you more relevant results</p>
              <div className="space-y-3">
                {[
                  { id: 'personal', label: 'Personal use', desc: 'Finding services, businesses & contacts for myself', icon: <User size={20}/> },
                  { id: 'business', label: 'For my business', desc: 'Sourcing suppliers, partners & service providers', icon: <Briefcase size={20}/> },
                  { id: 'both', label: 'Both', desc: 'Mix of personal and professional use', icon: <span className="text-lg">✨</span> },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setUseType(opt.id)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      useType === opt.id ? 'border-[var(--cp)] bg-[var(--cp-light,#e6f4ec)]' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">{opt.icon}</div>
                    <div>
                      <p className="font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <MapPin size={16} className="text-gray-500" /> Where are you based?
              </p>
              <p className="text-sm text-gray-500 mb-4">Get local results first (optional)</p>
              <div className="space-y-3">
                <input
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--cp)]"
                  placeholder="Country (e.g. Nigeria)"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                />
                <input
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--cp)]"
                  placeholder="City (e.g. Lagos)"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">Your location is never shared with advertisers without your permission.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 pb-5">
          {step > 1 ? (
            <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setStep(s => s - 1)}>Back</button>
          ) : (
            <button className="text-sm text-gray-400 hover:text-gray-600" onClick={onClose}>Skip</button>
          )}
          {step < 3 ? (
            <button
              className="px-6 py-2.5 text-white text-sm font-semibold rounded-full"
              style={{ backgroundColor: 'var(--cp)' }}
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && selected.length === 0}
            >
              Next
            </button>
          ) : (
            <button
              className="px-6 py-2.5 text-white text-sm font-semibold rounded-full"
              style={{ backgroundColor: 'var(--cp)' }}
              onClick={handleFinish}
            >
              Done — Show my Seshaa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
