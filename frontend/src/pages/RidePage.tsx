/**
 * RidePage.tsx — seshaa.ride / seshaa.delivery / seshaa.transport
 *
 * A unified page that shows a different UI depending on the `type` prop:
 *   RIDE      → point-to-point taxi/ride-hailing
 *   DELIVERY  → package courier
 *   TRANSPORT → freight / cargo
 *
 * The Navbar tab label + SeshaaTitle suffix change to match:
 *   seshaa.ride / seshaa.delivery / seshaa.transport
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Car, Package, Truck, MapPin, ArrowRight, Clock, CheckCircle,
  AlertCircle, Star, Shield, Plus, ChevronDown, Navigation,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import api from '../services/api';
import SeshaaTitle from '../components/brand/SeshaaTitle';

// ── Types ─────────────────────────────────────────────────────────────────────
type ServiceType = 'RIDE' | 'DELIVERY' | 'TRANSPORT';
type RideStatus  = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface RideRequest {
  id: string; type: string; status: RideStatus;
  pickupAddress: string; dropoffAddress?: string;
  notes?: string; packageDesc?: string; weight?: number;
  estimatedPrice?: number; finalPrice?: number; currency?: string;
  driverName?: string; driverPhone?: string; vehicleType?: string;
  createdAt: string; scheduledAt?: string;
}
interface Driver {
  id: string; userId: string; name: string; phone?: string;
  vehicleType: string; services: string[]; rating?: number;
  totalRides: number; city: string; country: string; verified: boolean;
}

const TYPE_META: Record<ServiceType, { label: string; suffix: string; icon: React.ReactNode; color: string; desc: string }> = {
  RIDE:      { label: 'Ride',     suffix: 'ride',     icon: <Car     size={20} />, color: 'from-green-600 to-emerald-500',  desc: 'Book a safe, affordable ride across town' },
  DELIVERY:  { label: 'Delivery', suffix: 'delivery', icon: <Package size={20} />, color: 'from-orange-500 to-amber-400',    desc: 'Send packages and documents anywhere in the city' },
  TRANSPORT: { label: 'Transport',suffix: 'transport',icon: <Truck   size={20} />, color: 'from-blue-600 to-cyan-500',       desc: 'Move heavy cargo and freight reliably' },
};

const STATUS_COLOR: Record<RideStatus, string> = {
  PENDING:     'bg-yellow-100 text-yellow-700',
  ACCEPTED:    'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED:   'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-700',
};

// ── Sub-component: booking form ───────────────────────────────────────────────
function BookForm({ type, onBooked }: { type: ServiceType; onBooked: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [pickup, setPickup]     = useState('');
  const [dropoff, setDropoff]   = useState('');
  const [notes, setNotes]       = useState('');
  const [pkgDesc, setPkgDesc]   = useState('');
  const [weight, setWeight]     = useState('');
  const [currency, setCurrency] = useState('USD');
  const [scheduled, setScheduled] = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  const submit = async () => {
    if (!pickup.trim()) { setMsg('Pickup address is required'); return; }
    setSaving(true); setMsg('');
    try {
      await api.post('/rides', {
        type,
        pickupAddress: pickup.trim(),
        dropoffAddress: dropoff.trim() || undefined,
        notes: notes.trim() || undefined,
        packageDesc: pkgDesc.trim() || undefined,
        weight: weight ? parseFloat(weight) : undefined,
        currency,
        scheduledAt: scheduled || undefined,
      });
      setMsg('✓ Request submitted! A driver will accept shortly.');
      setPickup(''); setDropoff(''); setNotes(''); setPkgDesc(''); setWeight(''); setScheduled('');
      onBooked();
    } catch {
      setMsg('Could not submit. Please try again.');
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border p-6 text-center">
        <p className="text-gray-600 mb-4">{t('ride.loginRequired')}</p>
        <a href="/auth" className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ backgroundColor: 'var(--cp,#008751)' }}>{t('ride.loginBtn')}</a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
      <h3 className="font-bold text-gray-800 flex items-center gap-2">
        {TYPE_META[type].icon} Book a {TYPE_META[type].label}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">📍 {t('ride.pickup')} *</label>
          <div className="flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2">
            <MapPin size={15} className="text-green-500 shrink-0" />
            <input className="flex-1 outline-none bg-transparent text-sm" placeholder="e.g. Kampala Road, Nakasero"
              value={pickup} onChange={e => setPickup(e.target.value)} />
          </div>
        </div>

        {type !== 'TRANSPORT' && (
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">🏁 {t('ride.dropoff')}</label>
            <div className="flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2">
              <Navigation size={15} className="text-red-400 shrink-0" />
              <input className="flex-1 outline-none bg-transparent text-sm" placeholder="Destination"
                value={dropoff} onChange={e => setDropoff(e.target.value)} />
            </div>
          </div>
        )}

        {type === 'DELIVERY' && (
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">📦 Package description</label>
            <input className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none"
              placeholder="e.g. Documents, fragile glassware, food…"
              value={pkgDesc} onChange={e => setPkgDesc(e.target.value)} />
          </div>
        )}

        {type === 'TRANSPORT' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">📦 Cargo description</label>
              <input className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none"
                placeholder="e.g. Building materials"
                value={pkgDesc} onChange={e => setPkgDesc(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">⚖️ Weight (kg)</label>
              <input type="number" className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none"
                placeholder="0"
                value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">💱 Currency</label>
            <select className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none"
              value={currency} onChange={e => setCurrency(e.target.value)}>
              {['USD','UGX','KES','NGN','GHS','ZAR','TZS','ETB','XOF','EGP','MAD'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">🕐 {t('ride.schedule')}</label>
            <input type="datetime-local" className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none"
              value={scheduled} onChange={e => setScheduled(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">📝 {t('ride.notes')}</label>
          <textarea className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none resize-none"
            rows={2} placeholder="Any special instructions…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {msg && (
        <p className={`text-sm px-3 py-2 rounded-xl ${msg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</p>
      )}

      <button onClick={submit} disabled={saving}
        className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
        style={{ background: `var(--cp,#008751)` }}>
        {saving ? t('common.loading') : (
          type === 'RIDE' ? t('ride.bookBtn') :
          type === 'DELIVERY' ? t('ride.bookDelivery') :
          t('ride.bookTransport')
        )}
      </button>
    </div>
  );
}

// ── Sub-component: my rides list ──────────────────────────────────────────────
function MyRides({ type, refresh }: { type: ServiceType; refresh: number }) {
  const { t } = useTranslation();
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    setLoad(true);
    api.get('/rides/my', { params: { type } })
      .then(r => setRides(r.data || []))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, [type, refresh]);

  if (loading) return <div className="text-center py-6 text-gray-400 text-sm">{t('common.loading')}</div>;
  if (!rides.length) return <p className="text-sm text-gray-400 text-center py-4">{t('ride.noRides')}</p>;

  return (
    <div className="space-y-3">
      {rides.map(r => (
        <div key={r.id} className="bg-white rounded-2xl border p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm break-words">{r.pickupAddress}</p>
              {r.dropoffAddress && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 break-words">
                  <ArrowRight size={10} /> {r.dropoffAddress}
                </p>
              )}
            </div>
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full shrink-0 ${STATUS_COLOR[r.status]}`}>{t(`ride.status.${r.status}`)}</span>
          </div>
          {r.driverName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
              <Car size={12} className="text-green-500" />
              <span className="font-medium">{r.driverName}</span>
              {r.driverPhone && <a href={`tel:${r.driverPhone}`} className="text-blue-500 hover:underline">{r.driverPhone}</a>}
              {r.vehicleType && <span className="text-gray-400">· {r.vehicleType}</span>}
            </div>
          )}
          {r.notes && <p className="text-xs text-gray-400 mt-1 break-words">{r.notes}</p>}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
            {r.finalPrice != null && <span className="text-xs font-bold text-green-600">{r.currency} {r.finalPrice}</span>}
            {r.estimatedPrice != null && r.finalPrice == null && <span className="text-[11px] text-gray-400">Est. {r.currency} {r.estimatedPrice}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sub-component: available drivers ─────────────────────────────────────────
function DriversPanel({ type }: { type: ServiceType }) {
  const { t } = useTranslation();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoad]    = useState(true);

  useEffect(() => {
    setLoad(true);
    api.get('/rides/drivers', { params: { type } })
      .then(r => setDrivers(r.data || []))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, [type]);

  if (loading) return <div className="text-center py-4 text-gray-400 text-sm">{t('common.loading')}</div>;
  if (!drivers.length) return <p className="text-sm text-gray-400 text-center py-4">{t('ride.noDrivers')}</p>;

  return (
    <div className="space-y-2">
      {drivers.slice(0, 6).map(d => (
        <div key={d.id} className="flex items-center gap-3 bg-white rounded-xl border px-3 py-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
            {d.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{d.name}</p>
            <p className="text-[11px] text-gray-500">{d.vehicleType} · {d.city}</p>
          </div>
          <div className="text-right shrink-0">
            {d.rating && <div className="flex items-center gap-0.5 text-xs text-yellow-500"><Star size={11} />{d.rating.toFixed(1)}</div>}
            <p className="text-[10px] text-gray-400">{d.totalRides} rides</p>
          </div>
          {d.verified && <Shield size={14} className="text-green-500 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// ── Driver registration form ──────────────────────────────────────────────────
function DriverRegForm() {
  const { t } = useTranslation();
  const [vehicleType, setVehicle] = useState('car');
  const [services, setServices]   = useState<ServiceType[]>(['RIDE']);
  const [plate, setPlate]         = useState('');
  const [license]                  = useState('');
  const [city, setCity]           = useState('');
  const [country, setCountry]     = useState('');
  const [bio, setBio]             = useState('');
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');

  const toggleSvc = (s: ServiceType) => setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const submit = async () => {
    if (!city || !country) { setMsg('City and country are required'); return; }
    setSaving(true); setMsg('');
    try {
      await api.post('/rides/driver/register', { vehicleType, services, plateNumber: plate, licenseNo: license, city, country, bio });
      setMsg('✓ Registered! You will be verified by our team shortly.');
    } catch {
      setMsg('Registration failed. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
      <h3 className="font-bold text-gray-800 flex items-center gap-2"><Car size={18} /> {t('ride.driverRegTitle')}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Vehicle Type</label>
          <select className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none" value={vehicleType} onChange={e => setVehicle(e.target.value)}>
            {['car','motorbike','bicycle','van','truck','boat'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Plate Number</label>
          <input className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none" placeholder="e.g. UAB 123Z" value={plate} onChange={e => setPlate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">City</label>
          <input className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none" placeholder="Kampala" value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Country</label>
          <input className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none" placeholder="UG" value={country} onChange={e => setCountry(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 block mb-1.5">Services offered</label>
        <div className="flex gap-2 flex-wrap">
          {(['RIDE','DELIVERY','TRANSPORT'] as ServiceType[]).map(s => (
            <button key={s} onClick={() => toggleSvc(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${services.includes(s) ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
              style={services.includes(s) ? { backgroundColor: 'var(--cp,#008751)' } : {}}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 block mb-1">Bio (optional)</label>
        <textarea rows={2} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none resize-none"
          placeholder="Tell riders about yourself…" value={bio} onChange={e => setBio(e.target.value)} />
      </div>
      {msg && <p className={`text-sm px-3 py-2 rounded-xl ${msg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</p>}
      <button onClick={submit} disabled={saving}
        className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
        style={{ backgroundColor: 'var(--cp,#008751)' }}>
        {saving ? t('common.loading') : t('ride.registerBtn')}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { defaultType?: ServiceType }

export default function RidePage({ defaultType = 'RIDE' }: Props) {
  const { t } = useTranslation();
  const [serviceType, setServiceType] = useState<ServiceType>(defaultType);
  const [section, setSection]         = useState<'book' | 'my' | 'drivers' | 'register'>('book');
  const [refreshKey, setRefreshKey]   = useState(0);
  const [showDriverReg, setShowDriverReg] = useState(false);
  const meta = TYPE_META[serviceType];

  const SECTIONS = [
    { id: 'book' as const,    label: t('ride.tabs.book'),        icon: <Plus size={13} /> },
    { id: 'my' as const,      label: t('ride.tabs.myRides'),     icon: <Clock size={13} /> },
    { id: 'drivers' as const, label: t('ride.tabs.drivers'),     icon: <Car size={13} /> },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
      {/* Hero header */}
      <div className={`rounded-2xl bg-gradient-to-r ${meta.color} p-6 mb-6 text-white`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <SeshaaTitle staticSuffix={meta.suffix} size="lg" />
            <p className="text-white/80 text-sm mt-1">{meta.desc}</p>
          </div>
          <div className="text-white/90">{meta.icon}</div>
        </div>

        {/* Service type switcher */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {(Object.keys(TYPE_META) as ServiceType[]).map(t => (
            <button key={t} onClick={() => setServiceType(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                serviceType === t ? 'bg-white text-gray-800' : 'bg-white/20 text-white hover:bg-white/30'
              }`}>
              {TYPE_META[t].icon} {TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 mb-5">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              section === s.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {section === 'book' && (
        <BookForm type={serviceType} onBooked={() => { setRefreshKey(k => k + 1); setSection('my'); }} />
      )}
      {section === 'my' && <MyRides type={serviceType} refresh={refreshKey} />}
      {section === 'drivers' && (
        <div className="space-y-4">
          <DriversPanel type={serviceType} />
          <button onClick={() => setShowDriverReg(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-xl hover:bg-gray-50 transition-colors">
            <span className="text-sm font-semibold text-gray-700">{t('ride.becomeDriver')}</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showDriverReg ? 'rotate-180' : ''}`} />
          </button>
          {showDriverReg && <DriverRegForm />}
        </div>
      )}

      {/* Trust signals */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { icon: <Shield size={20} className="text-green-500" />, label: t('ride.trust.safe') },
          { icon: <Star   size={20} className="text-yellow-500" />, label: t('ride.trust.fast') },
          { icon: <CheckCircle size={20} className="text-blue-500" />, label: t('ride.trust.pay') },
        ].map(({ icon, label }) => (
          <div key={label} className="bg-white rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center">
            {icon}
            <span className="text-xs font-medium text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-6 bg-white rounded-2xl border p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-blue-400" /> {t('ride.howItWorks')}
        </h3>
        <ol className="space-y-3">
          {([
            { n: '1', text: t('ride.step1') },
            { n: '2', text: t('ride.step2') },
            { n: '3', text: t('ride.step3') },
            { n: '4', text: t('ride.step4') },
          ]).map(step => (
            <li key={step.n} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                style={{ backgroundColor: 'var(--cp,#008751)' }}>{step.n}</span>
              <p className="text-sm text-gray-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
