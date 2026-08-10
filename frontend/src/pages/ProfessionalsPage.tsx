import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, MapPin, Briefcase, X, CheckCircle2, ChevronDown } from 'lucide-react';
import { hireApi, type HireProfile } from '../services/api';
import { useAuthStore } from '../store/auth';
import clsx from 'clsx';

const PROFESSION_GROUPS: Record<string, string[]> = {
  '🎵 Creative': ['DJ', 'Musician', 'Artist', 'Photographer', 'Videographer', 'Actor', 'Dancer', 'MC / Emcee'],
  '🔧 Trades': ['Electrician', 'Carpenter', 'Plumber', 'Painter', 'Mechanic', 'Welder', 'Mason'],
  '🏠 Personal': ['Cleaner', 'Nanny', 'Chef', 'Hairdresser', 'Barber', 'Makeup Artist', 'Tailor', 'Personal Trainer', 'Security Guard', 'Driver', 'Gardener'],
  '💼 Professional': ['Lawyer', 'Accountant', 'Doctor', 'Nurse', 'Tutor', 'IT Technician', 'Graphic Designer', 'Event Planner', 'Wedding Coordinator', 'Social Media Manager'],
};

const ALL_PROFESSIONS = Object.values(PROFESSION_GROUPS).flat();

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-sm text-gray-500">
      <Star size={13} className="fill-amber-400 text-amber-400" />
      <span className="font-semibold text-gray-700">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
      {count > 0 && <span className="text-xs">({count})</span>}
    </span>
  );
}

function ProfileCard({ profile, onBook }: { profile: HireProfile; onBook: (p: HireProfile) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden shrink-0">
          {profile.user.avatarUrl
            ? <img src={profile.user.avatarUrl} alt={profile.user.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-300">{profile.user.name[0]}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-gray-900 truncate">{profile.user.name}</h3>
          <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">{profile.profession}</span>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={profile.avgRating} count={profile.ratingCount} />
            {profile.city || profile.country ? (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin size={11} />
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </span>
            ) : null}
          </div>
        </div>
        {profile.available
          ? <span className="shrink-0 text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Available</span>
          : <span className="shrink-0 text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">Busy</span>
        }
      </div>

      {profile.bio && (
        <p className="text-sm text-gray-600 line-clamp-2">{profile.bio}</p>
      )}

      {profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.slice(0, 4).map(s => (
            <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
          ))}
          {profile.skills.length > 4 && (
            <span className="text-xs text-gray-400">+{profile.skills.length - 4} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-1">
        <div className="text-sm text-gray-700">
          {profile.hourlyRate
            ? <span><span className="font-black text-gray-900">{profile.currency} {profile.hourlyRate.toLocaleString()}</span>/hr</span>
            : profile.dayRate
              ? <span><span className="font-black text-gray-900">{profile.currency} {profile.dayRate.toLocaleString()}</span>/day</span>
              : <span className="text-gray-400 text-xs">Rate on request</span>
          }
        </div>
        <button
          onClick={() => onBook(profile)}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          Book
        </button>
      </div>
    </div>
  );
}

function BookingModal({ profile, onClose, onDone }: { profile: HireProfile; onClose: () => void; onDone: () => void }) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ date: '', duration: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.message.trim()) { setError('Please add a message.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await hireApi.book(profile.id, {
        message: form.message,
        date: form.date || undefined,
        duration: form.duration ? parseInt(form.duration) : undefined,
      });
      setSuccess(true);
      setTimeout(onDone, 2000);
    } catch {
      setError('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h3 className="text-xl font-black mb-2">Sign in to book</h3>
          <p className="text-gray-500 text-sm mb-5">Create a free Seshaa account to book professionals.</p>
          <Link to="/auth" className="block w-full py-3 bg-purple-600 text-white font-bold rounded-2xl">Sign in / Register</Link>
          <button onClick={onClose} className="mt-3 text-sm text-gray-400 underline">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-black text-gray-900">Book {profile.user.name}</h3>
            <p className="text-sm text-gray-500">{profile.profession}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <CheckCircle2 size={48} className="text-green-500" />
            <p className="font-black text-lg text-gray-900">Booking request sent!</p>
            <p className="text-sm text-gray-500">{profile.user.name} will get back to you soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Preferred date (optional)</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Duration in hours (optional)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 4"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                value={form.duration}
                onChange={e => set('duration', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Message *</label>
              <textarea
                rows={4}
                placeholder={`Tell ${profile.user.name} what you need…`}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 resize-none"
                value={form.message}
                onChange={e => set('message', e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {profile.hourlyRate && form.duration && (
              <div className="bg-purple-50 rounded-xl px-4 py-3 text-sm">
                <span className="text-gray-500">Estimated: </span>
                <span className="font-black text-purple-700">{profile.currency} {(profile.hourlyRate * parseInt(form.duration || '0')).toLocaleString()}</span>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl text-base transition-colors disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send Booking Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SetupProfileModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    profession: '',
    bio: '',
    hourlyRate: '',
    dayRate: '',
    currency: 'UGX',
    city: '',
    country: 'Uganda',
    skills: '',
    available: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.profession) { setError('Select a profession.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await hireApi.saveProfile({
        profession: form.profession,
        bio: form.bio || undefined,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        dayRate: form.dayRate ? parseFloat(form.dayRate) : undefined,
        currency: form.currency,
        available: form.available,
        country: form.country,
        city: form.city || undefined,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      setSuccess(true);
      setTimeout(onSaved, 1500);
    } catch {
      setError('Failed to save profile. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-gray-900">Set up hire profile</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <CheckCircle2 size={48} className="text-green-500" />
            <p className="font-black text-lg">Profile saved!</p>
            <p className="text-sm text-gray-500">You're now listed and can be booked.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Profession *</label>
              <div className="relative">
                <select
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 appearance-none bg-white"
                  value={form.profession}
                  onChange={e => set('profession', e.target.value)}
                >
                  <option value="">Select a profession…</option>
                  {Object.entries(PROFESSION_GROUPS).map(([group, professions]) => (
                    <optgroup key={group} label={group}>
                      {professions.map(p => <option key={p} value={p}>{p}</option>)}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Bio</label>
              <textarea
                rows={3}
                placeholder="Tell clients about your experience, style, and what makes you great…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 resize-none"
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Currency</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-purple-400"
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                >
                  {['UGX','KES','TZS','NGN','GHS','ZAR','USD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Hourly rate</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-purple-400"
                  value={form.hourlyRate}
                  onChange={e => set('hourlyRate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Day rate</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-purple-400"
                  value={form.dayRate}
                  onChange={e => set('dayRate', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">City</label>
                <input
                  type="text"
                  placeholder="Kampala"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Country</label>
                <input
                  type="text"
                  placeholder="Uganda"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                  value={form.country}
                  onChange={e => set('country', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Skills (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Afrobeat, House, Live mixing"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                value={form.skills}
                onChange={e => set('skills', e.target.value)}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.available}
                onChange={e => set('available', e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded"
              />
              <span className="text-sm font-semibold text-gray-700">I'm available for bookings right now</span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl text-base transition-colors disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfessionalsPage() {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<HireProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [bookTarget, setBookTarget] = useState<HireProfile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [myProfile, setMyProfile] = useState<HireProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, meRes] = await Promise.all([
        hireApi.list({ search: search || undefined, profession: selectedProfession || undefined }),
        user ? hireApi.me() : Promise.resolve({ data: null }),
      ]);
      setProfiles(res.data);
      if (user) setMyProfile((meRes as { data: HireProfile | null }).data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, selectedProfession, user]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Hire a Pro 💼</h1>
            <p className="text-gray-500 text-sm mt-1">Book local talent and professionals across Africa</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {user && (
              <button
                onClick={() => setShowSetup(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
              >
                {myProfile ? 'Edit My Profile' : '+ Offer Your Services'}
              </button>
            )}
            {myProfile && (
              <span className={clsx(
                'text-xs font-bold px-2 py-0.5 rounded-full border',
                myProfile.available
                  ? 'text-green-600 bg-green-50 border-green-200'
                  : 'text-gray-400 bg-gray-50 border-gray-200'
              )}>
                {myProfile.available ? 'Listed as available' : 'Listed as busy'}
              </span>
            )}
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, skill, or profession…"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-purple-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              className="pl-8 pr-8 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-purple-400 appearance-none"
              value={selectedProfession}
              onChange={e => setSelectedProfession(e.target.value)}
            >
              <option value="">All professions</option>
              {Object.entries(PROFESSION_GROUPS).map(([group, professions]) => (
                <optgroup key={group} label={group}>
                  {professions.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Category quick-filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-5">
          {['DJ', 'Musician', 'Chef', 'Electrician', 'Cleaner', 'Driver', 'Photographer', 'Makeup Artist', 'Carpenter', 'IT Technician'].map(p => (
            <button
              key={p}
              onClick={() => setSelectedProfession(selectedProfession === p ? '' : p)}
              className={clsx(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                selectedProfession === p
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading professionals…
          </div>
        ) : profiles.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg font-semibold">No professionals found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or be the first to list your services!</p>
            {user && (
              <button
                onClick={() => setShowSetup(true)}
                className="mt-5 inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-3 rounded-2xl"
              >
                + Offer Your Services
              </button>
            )}
            {!user && (
              <Link to="/auth" className="mt-5 inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-3 rounded-2xl">
                Sign in to List Yourself
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map(p => (
              <ProfileCard key={p.id} profile={p} onBook={setBookTarget} />
            ))}
          </div>
        )}
      </div>

      {bookTarget && (
        <BookingModal
          profile={bookTarget}
          onClose={() => setBookTarget(null)}
          onDone={() => { setBookTarget(null); }}
        />
      )}

      {showSetup && (
        <SetupProfileModal
          onClose={() => setShowSetup(false)}
          onSaved={() => { setShowSetup(false); load(); }}
        />
      )}
    </div>
  );
}
