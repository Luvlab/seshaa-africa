import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Globe, Star, List, MessageCircle, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
          <div className="w-18 h-18 rounded-full bg-white/20 flex items-center justify-center text-3xl font-black text-white"
            style={{ width: 72, height: 72 }}>
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-black">{user.name}</h1>
            <p className="text-white/70 text-base mt-0.5">
              {user.role === 'ADMIN' ? '⚙️ Admin' :
               user.role === 'BUSINESS_OWNER' ? '🏢 Business' :
               user.role === 'AMBASSADOR' ? '🌟 Ambassador' :
               user.role === 'SALES_REP' ? '💼 Sales Rep' : '👤 Member'}
            </p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 py-6">
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

        {/* Admin shortcut */}
        {user.role === 'ADMIN' && (
          <button
            onClick={() => navigate('/admin')}
            className="mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold text-base"
            style={{ borderColor: 'var(--cp)', color: 'var(--cp)' }}
          >
            ⚙️ Admin Dashboard
          </button>
        )}

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="mt-4 w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold text-base active:bg-red-100"
        >
          <LogOut size={22} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
