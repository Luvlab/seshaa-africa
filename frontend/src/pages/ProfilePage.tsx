import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Globe, Star, List, MessageCircle, ChevronRight, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { authApi } from '../services/api';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm]         = useState({ current: '', next: '', confirm: '' });
  const [showCur, setShowCur]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [pwLoading, setPwLoading]   = useState(false);
  const [pwMsg, setPwMsg]           = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="text-7xl mb-6">👤</div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">Sign in to Seshaa</h2>
        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
          Save your favourite places, book services and get personalised results.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="w-full max-w-xs py-4 rounded-2xl text-white text-lg font-bold"
          style={{ backgroundColor: 'var(--cp)' }}
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!pwForm.current) { setPwMsg({ ok: false, text: 'Enter your current password' }); return; }
    if (pwForm.next.length < 6) { setPwMsg({ ok: false, text: 'New password must be 6+ characters' }); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return; }
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

  const menuItems = [
    { icon: <List size={24} strokeWidth={1.5} />,         label: 'My Listings',   path: '/search' },
    { icon: <Star size={24} strokeWidth={1.5} />,          label: 'Saved Places',  path: '/search' },
    { icon: <MessageCircle size={24} strokeWidth={1.5} />, label: 'Messages',      path: '/messages' },
    { icon: <Globe size={24} strokeWidth={1.5} />,         label: 'Language',      path: '/' },
    { icon: <Settings size={24} strokeWidth={1.5} />,      label: 'Settings',      path: '/' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Profile header */}
      <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, var(--cp-dark, #004d2b), var(--cp, #008751))' }}>
        <div className="flex items-center gap-4">
          {/* Avatar: Google photo or initial */}
          {(user as { avatarUrl?: string }).avatarUrl ? (
            <img
              src={(user as { avatarUrl?: string }).avatarUrl}
              alt={user.name}
              className="w-[72px] h-[72px] rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div
              className="rounded-full bg-white/20 flex items-center justify-center text-3xl font-black text-white"
              style={{ width: 72, height: 72 }}
            >
              {initial}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black">{user.name}</h1>
            <p className="text-white/70 text-sm mt-0.5">{(user as { email?: string }).email || ''}</p>
            <p className="text-white/70 text-base mt-0.5">
              {user.role === 'ADMIN'          ? '⚙️ Admin' :
               user.role === 'BUSINESS_OWNER' ? '🏢 Business' :
               user.role === 'AMBASSADOR'     ? '🌟 Ambassador' :
               user.role === 'SALES_REP'      ? '💼 Sales Rep' : '👤 Member'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Main menu */}
        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
          {menuItems.map(item => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span className="text-gray-500">{item.icon}</span>
              <span className="flex-1 text-left text-base font-semibold text-gray-800">{item.label}</span>
              <ChevronRight size={20} className="text-gray-300" strokeWidth={1.5} />
            </button>
          ))}
        </div>

        {/* Change password */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button
            onClick={() => { setShowPwForm(v => !v); setPwMsg(null); }}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="text-gray-500"><Lock size={24} strokeWidth={1.5} /></span>
            <span className="flex-1 text-left text-base font-semibold text-gray-800">Change Password</span>
            {showPwForm
              ? <X size={20} className="text-gray-300" strokeWidth={1.5} />
              : <ChevronRight size={20} className="text-gray-300" strokeWidth={1.5} />}
          </button>

          {showPwForm && (
            <div className="px-5 pb-5 space-y-3 border-t border-gray-100">
              {/* Current password */}
              <div className="relative mt-3">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showCur ? 'text' : 'password'}
                  placeholder="Current password"
                  className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:border-[var(--cp)]"
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowCur(v => !v)}>
                  {showCur ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* New password */}
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="New password (min 6 chars)"
                  className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:border-[var(--cp)]"
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowNew(v => !v)}>
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Confirm */}
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[var(--cp)]"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                />
              </div>

              {pwMsg && (
                <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl ${
                  pwMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {pwMsg.ok ? <Check size={16} /> : <X size={16} />}
                  {pwMsg.text}
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={pwLoading}
                className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                style={{ backgroundColor: 'var(--cp)' }}
              >
                {pwLoading ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          )}
        </div>

        {/* Admin shortcut */}
        {user.role === 'ADMIN' && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold text-base"
            style={{ borderColor: 'var(--cp)', color: 'var(--cp)' }}
          >
            ⚙️ Admin Dashboard
          </button>
        )}

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold text-base active:bg-red-100"
        >
          <LogOut size={22} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
