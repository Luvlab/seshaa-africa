/**
 * ProfilePage — the signed-in user's hub.
 *
 * Sections (all on one scrollable page):
 *   • Identity card (avatar, name, role, country)
 *   • Notifications strip (unread messages + upcoming bookings)
 *   • Messages inbox preview
 *   • Bookings (upcoming + past)
 *   • My Listings
 *   • Account settings (change password, language, logout)
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LogOut, Settings, Globe, Star, List, MessageCircle,
  ChevronRight, Lock, Eye, EyeOff, Check, X, Bell,
  CalendarDays, MapPin, Phone, ChevronDown, Building2,
  Clock, CheckCircle, XCircle, AlertCircle, ArrowRight,
  Sparkles, Plus,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { authApi, bookingsApi, listingsApi } from '../services/api';
import api from '../services/api';
import type { Booking, ChatRoom, Listing } from '../types';
import { LANGUAGES } from '../i18n';

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING:   { label: 'Pending',   icon: <Clock size={13} />,        color: 'text-amber-600 bg-amber-50 border-amber-200' },
  CONFIRMED: { label: 'Confirmed', icon: <CheckCircle size={13} />,  color: 'text-green-700 bg-green-50 border-green-200' },
  CANCELLED: { label: 'Cancelled', icon: <XCircle size={13} />,      color: 'text-red-600 bg-red-50 border-red-200' },
  COMPLETED: { label: 'Completed', icon: <CheckCircle size={13} />,  color: 'text-blue-700 bg-blue-50 border-blue-200' },
  NO_SHOW:   { label: 'No-show',   icon: <AlertCircle size={13} />,  color: 'text-gray-500 bg-gray-50 border-gray-200' },
};

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [bookings, setBookings]         = useState<Booking[]>([]);
  const [rooms, setRooms]               = useState<ChatRoom[]>([]);
  const [myListings, setMyListings]     = useState<Listing[]>([]);
  const [unread, setUnread]             = useState(0);
  const [upcomingCount, setUpcoming]    = useState(0);
  const [showPwForm, setShowPwForm]     = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [pwForm, setPwForm]             = useState({ current: '', next: '', confirm: '' });
  const [showCur, setShowCur]           = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [pwLoading, setPwLoading]       = useState(false);
  const [pwMsg, setPwMsg]               = useState<{ ok: boolean; text: string } | null>(null);
  const [activeSection, setSection]     = useState<'overview' | 'messages' | 'bookings' | 'listings'>('overview');

  useEffect(() => {
    if (!user) return;
    api.get('/chat/rooms').then(r => {
      setRooms(r.data);
      const u = r.data.reduce((s: number, room: ChatRoom) => s + (room.unreadCount || 0), 0);
      setUnread(u);
    }).catch(() => {});
    bookingsApi.my().then(r => {
      setBookings(r.data);
      const now = new Date();
      setUpcoming(r.data.filter((b: Booking) => new Date(b.date) >= now && b.status !== 'CANCELLED').length);
    }).catch(() => {});
    listingsApi.search({ submittedById: user.id, limit: 20 }).then(r => setMyListings(r.data.listings)).catch(() => {});
  }, [user]);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('seshaa-lang', code);
    const dir = LANGUAGES.find(l => l.code === code)?.dir || 'ltr';
    document.documentElement.dir = dir;
    setShowLangPicker(false);
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!pwForm.current)           return setPwMsg({ ok: false, text: 'Enter your current password' });
    if (pwForm.next.length < 6)    return setPwMsg({ ok: false, text: 'New password must be 6+ characters' });
    if (pwForm.next !== pwForm.confirm) return setPwMsg({ ok: false, text: 'Passwords do not match' });
    setPwLoading(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      setPwMsg({ ok: true, text: 'Password updated ✓' });
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => { setShowPwForm(false); setPwMsg(null); }, 2000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setPwMsg({ ok: false, text: msg || 'Failed to update password' });
    } finally {
      setPwLoading(false);
    }
  };

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="text-7xl mb-6">👤</div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">Sign in to Seshaa</h2>
        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
          Save your favourite places, book services and get personalised results.
        </p>
        <button onClick={() => navigate('/auth')}
          className="w-full max-w-xs py-4 rounded-2xl text-white text-lg font-bold"
          style={{ backgroundColor: 'var(--cp)' }}>
          Sign In / Register
        </button>
      </div>
    );
  }

  const initial = user.name?.charAt(0)?.toUpperCase() || '?';
  const upcoming = bookings.filter(b => new Date(b.date) >= new Date() && b.status !== 'CANCELLED');
  const past     = bookings.filter(b => new Date(b.date) < new Date() || b.status === 'COMPLETED');
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Identity Card ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--cp-dark, #004d2b), var(--cp, #008751))' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #FCD116 0%, transparent 60%)' }} />
        <div className="relative px-5 pt-8 pb-6 flex items-start gap-4">
          {(user as { avatarUrl?: string }).avatarUrl ? (
            <img src={(user as { avatarUrl?: string }).avatarUrl} alt={user.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl font-black text-white shrink-0">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-2xl font-black text-white truncate">{user.name}</h1>
            <p className="text-white/70 text-sm mt-0.5 truncate">{(user as { email?: string }).email || ''}</p>
            <p className="text-white/80 text-sm mt-1 font-semibold">
              {user.role === 'ADMIN'          ? '⚙️ Admin' :
               user.role === 'BUSINESS_OWNER' ? '🏢 Business Owner' :
               user.role === 'AMBASSADOR'     ? '🌟 Ambassador' :
               user.role === 'SALES_REP'      ? '💼 Sales Rep' : '👤 Member'}
            </p>
          </div>
        </div>

        {/* Notification bar */}
        {(unread > 0 || upcomingCount > 0) && (
          <div className="px-5 pb-4 flex gap-3">
            {unread > 0 && (
              <button onClick={() => setSection('messages')}
                className="flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-3.5 py-1.5 text-white text-xs font-bold hover:bg-white/25">
                <MessageCircle size={13} />
                {unread} unread message{unread > 1 ? 's' : ''}
              </button>
            )}
            {upcomingCount > 0 && (
              <button onClick={() => setSection('bookings')}
                className="flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-3.5 py-1.5 text-white text-xs font-bold hover:bg-white/25">
                <CalendarDays size={13} />
                {upcomingCount} upcoming booking{upcomingCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Section tabs */}
        <div className="flex border-t border-white/20">
          {([
            { id: 'overview',  label: t('profile.overview'),  icon: <Bell size={13} /> },
            { id: 'messages',  label: t('profile.messages'),  icon: <MessageCircle size={13} />, badge: unread },
            { id: 'bookings',  label: t('profile.bookings'),  icon: <CalendarDays size={13} />, badge: upcomingCount },
            { id: 'listings',  label: t('profile.myPlaces'),  icon: <Building2 size={13} /> },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setSection(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold relative transition-colors ${
                activeSection === tab.id ? 'text-white bg-white/15' : 'text-white/60 hover:text-white/80'
              }`}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {(tab as { badge?: number }).badge ? (
                <span className="absolute top-1.5 right-2 sm:right-4 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {(tab as { badge?: number }).badge! > 9 ? '9+' : (tab as { badge?: number }).badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section: Overview ── */}
      {activeSection === 'overview' && (
        <div className="px-4 py-5 space-y-4">

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('profile.messages'),  value: unread,           icon: <MessageCircle size={18} />,  color: '#008751', section: 'messages' as const },
              { label: t('profile.bookings'),  value: upcomingCount,    icon: <CalendarDays size={18} />,   color: '#3b82f6', section: 'bookings' as const },
              { label: t('profile.myPlaces'),  value: myListings.length, icon: <Building2 size={18} />,    color: '#f59e0b', section: 'listings' as const },
            ].map(s => (
              <button key={s.label} onClick={() => setSection(s.section)}
                className="bg-white rounded-2xl border p-4 text-center hover:shadow-md transition-shadow">
                <div className="flex justify-center mb-2" style={{ color: s.color }}>{s.icon}</div>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Menu items */}
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
            <button onClick={() => setSection('messages')}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <MessageCircle size={22} className="text-gray-400 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left text-sm font-semibold text-gray-800">{t('profile.messages')}</span>
              {unread > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">{unread}</span>}
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <button onClick={() => setSection('bookings')}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <CalendarDays size={22} className="text-gray-400 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left text-sm font-semibold text-gray-800">{t('profile.bookings')}</span>
              {upcomingCount > 0 && <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">{upcomingCount}</span>}
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <button onClick={() => setSection('listings')}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <Building2 size={22} className="text-gray-400 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left text-sm font-semibold text-gray-800">{t('profile.myPlaces')}</span>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <button onClick={() => navigate('/search')}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <Star size={22} className="text-gray-400 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left text-sm font-semibold text-gray-800">Saved Places</span>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </div>

          {/* Language picker */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <button onClick={() => setShowLangPicker(v => !v)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <Globe size={22} className="text-gray-400 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left text-sm font-semibold text-gray-800">{t('profile.language')}</span>
              <span className="text-sm text-gray-500 mr-1">{currentLang.nativeName}</span>
              <ChevronDown size={18} className="text-gray-300" />
            </button>
            {showLangPicker && (
              <div className="border-t border-gray-100 px-4 pb-4 grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => changeLanguage(l.code)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      l.code === i18n.language ? 'font-bold bg-green-50' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={l.code === i18n.language ? { color: 'var(--cp)' } : {}}>
                    {l.nativeName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Change password */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <button onClick={() => { setShowPwForm(v => !v); setPwMsg(null); }}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <Lock size={22} className="text-gray-400 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left text-sm font-semibold text-gray-800">{t('profile.changePassword')}</span>
              {showPwForm ? <X size={18} className="text-gray-300" /> : <ChevronRight size={18} className="text-gray-300" />}
            </button>
            {showPwForm && (
              <div className="px-5 pb-5 space-y-3 border-t border-gray-100">
                <div className="relative mt-3">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showCur ? 'text' : 'password'} placeholder="Current password"
                    className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-10 py-3 text-sm outline-none focus:border-[var(--cp)]"
                    value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowCur(v => !v)}>
                    {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showNew ? 'text' : 'password'} placeholder="New password (min 6)"
                    className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-10 py-3 text-sm outline-none focus:border-[var(--cp)]"
                    value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowNew(v => !v)}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <input type="password" placeholder="Confirm new password"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--cp)]"
                  value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()} />
                {pwMsg && (
                  <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl ${pwMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {pwMsg.ok ? <Check size={15} /> : <X size={15} />} {pwMsg.text}
                  </div>
                )}
                <button onClick={handleChangePassword} disabled={pwLoading}
                  className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: 'var(--cp)' }}>
                  {pwLoading ? t('profile.saving') : t('profile.savePassword')}
                </button>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <Settings size={22} className="text-gray-400 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left text-sm font-semibold text-gray-800">Settings</span>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </div>

          {/* Admin shortcut */}
          {user.role === 'ADMIN' && (
            <button onClick={() => navigate('/admin')}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold text-sm"
              style={{ borderColor: 'var(--cp)', color: 'var(--cp)' }}>
              ⚙️ Admin Dashboard
            </button>
          )}

          {/* Logout */}
          <button onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold text-sm active:bg-red-100">
            <LogOut size={20} strokeWidth={1.5} /> {t('profile.logout')}
          </button>
        </div>
      )}

      {/* ── Section: Messages ── */}
      {activeSection === 'messages' && (
        <div className="px-4 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-gray-900">{t('profile.messages')}</h2>
            <Link to="/messages" className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--cp)' }}>
              {t('profile.openMessages')} <ArrowRight size={12} />
            </Link>
          </div>

          {rooms.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
              <MessageCircle size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">{t('profile.noMessages')}</p>
              <p className="text-sm mt-1">Message a listing to start chatting</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border divide-y divide-gray-50 overflow-hidden">
              {rooms.map(room => (
                <Link key={room.id} to="/messages"
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                    style={{ background: 'var(--cp, #008751)' }}>
                    {(room.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{room.name || 'Direct Message'}</p>
                    {room.lastMessage && <p className="text-xs text-gray-400 truncate">{room.lastMessage.content}</p>}
                  </div>
                  {room.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">
                      {room.unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Seshaa AI shortcut */}
          <button onClick={() => navigate('/messages')}
            className="w-full flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4 hover:bg-purple-100 transition-colors">
            <Sparkles size={20} className="text-purple-600 shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-purple-800">Seshaa AI</p>
              <p className="text-xs text-purple-500">Ask anything — find businesses, get directions, discover events</p>
            </div>
            <ArrowRight size={16} className="text-purple-400 shrink-0" />
          </button>
        </div>
      )}

      {/* ── Section: Bookings ── */}
      {activeSection === 'bookings' && (
        <div className="px-4 py-5 space-y-4">
          <h2 className="font-black text-gray-900">{t('profile.bookings')}</h2>

          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('profile.upcoming')}</p>
              <div className="space-y-3">
                {upcoming.map(b => {
                  const meta = STATUS_META[b.status] || STATUS_META.PENDING;
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{b.service}</p>
                          {b.listing && (
                            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                              <Building2 size={12} /> {b.listing.name}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                            <CalendarDays size={12} /> {fmt(b.date)}
                          </p>
                          {b.listing?.city && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {b.listing.city}
                            </p>
                          )}
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      {b.listing?.phone && (
                        <a href={`tel:${b.listing.phone}`}
                          className="mt-3 flex items-center gap-2 text-xs font-semibold text-white px-4 py-2 rounded-xl"
                          style={{ background: 'var(--cp)' }}>
                          <Phone size={13} /> Call to confirm
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Past</p>
              <div className="space-y-2">
                {past.slice(0, 5).map(b => {
                  const meta = STATUS_META[b.status] || STATUS_META.COMPLETED;
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{b.service}</p>
                        <p className="text-xs text-gray-400">{fmt(b.date)} · {b.listing?.name}</p>
                      </div>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {bookings.length === 0 && (
            <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
              <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">{t('profile.noBookings')}</p>
              <p className="text-sm mt-1">Book services from any listing on Seshaa</p>
              <Link to="/search"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{ background: 'var(--cp)' }}>
                Find services
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Section: My Listings ── */}
      {activeSection === 'listings' && (
        <div className="px-4 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-gray-900">{t('profile.myPlaces')}</h2>
            <Link to="/add-listing"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl text-white"
              style={{ background: 'var(--cp)' }}>
              <Plus size={13} /> {t('profile.addPlace')}
            </Link>
          </div>

          {myListings.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
              <Building2 size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">{t('profile.noListings')}</p>
              <p className="text-sm mt-1 mb-5">Add your business, clinic, school or any African place</p>
              <Link to="/add-listing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{ background: 'var(--cp)' }}>
                <Plus size={14} /> {t('profile.addPlace')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map(l => (
                <div key={l.id} className="bg-white rounded-2xl border p-4 flex items-center gap-3">
                  {l.logoUrl ? (
                    <img src={l.logoUrl} alt={l.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">🏪</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{l.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={10} /> {l.city}, {l.country}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${l.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {l.verified ? `✓ ${t('profile.verified')}` : t('profile.pending')}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{l.category}</span>
                    </div>
                  </div>
                  <Link to={`/listing/${l.id}`} className="p-2 text-gray-400 hover:text-gray-600">
                    <ChevronRight size={18} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
