import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Lock, Eye, EyeOff, Globe, ArrowRight, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type Mode = 'login' | 'register';

export default function AuthPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<Mode>('login');
  const [inputType, setInputType] = useState<'phone' | 'email'>('phone');
  const [form, setForm] = useState({ name: '', identifier: '', password: '', country: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  // Load Google Identity Services script once
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setLoading(true);
          setError('');
          try {
            const res = await authApi.googleLogin(response.credential);
            setAuth(res.data.user, res.data.token);
            navigate('/');
          } catch {
            setError('Google sign-in failed. Please try email/phone.');
          } finally {
            setLoading(false);
          }
        },
      });
    };
    document.head.appendChild(script);
  }, [GOOGLE_CLIENT_ID]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.identifier || !form.password) { setError('Please fill in all fields'); return; }
    if (mode === 'register' && !form.name) { setError('Please enter your name'); return; }

    setLoading(true);
    try {
      let res;
      if (mode === 'register') {
        const payload: Record<string, string> = {
          name: form.name,
          password: form.password,
          language: 'en',
        };
        if (inputType === 'phone') payload.phone = form.identifier;
        else payload.email = form.identifier;
        if (form.country) payload.country = form.country;
        res = await authApi.register(payload as Parameters<typeof authApi.register>[0]);
      } else {
        res = await authApi.login(form.identifier, form.password);
      }
      setAuth(res.data.user, res.data.token);
      // Brand-new signup → trigger personalisation survey on home page
      if (mode === 'register') sessionStorage.setItem('seshaa-new-signup', '1');
      navigate('/');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || (mode === 'register' ? 'Registration failed' : 'Wrong phone/email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-5 py-8 max-w-md mx-auto w-full">

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 leading-tight">
            {mode === 'login' ? 'Welcome back 👋' : 'Join Seshaa 🌍'}
          </h1>
          <p className="text-gray-500 text-base mt-2">
            {mode === 'login'
              ? 'Sign in to your account'
              : 'Create a free account — takes 1 minute'}
          </p>
        </div>

        {/* Input type toggle */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
          <button
            onClick={() => setInputType('phone')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-base font-semibold transition-all ${
              inputType === 'phone' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            <Phone size={20} strokeWidth={1.5} />
            {t('auth.phone')}
          </button>
          <button
            onClick={() => setInputType('email')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-base font-semibold transition-all ${
              inputType === 'email' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            <Mail size={20} strokeWidth={1.5} />
            {t('auth.email')}
          </button>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder={t('auth.name')}
                className="w-full border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-base outline-none focus:border-[var(--cp)] bg-white"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
          )}

          <div className="relative">
            {inputType === 'phone'
              ? <Phone size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
              : <Mail size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
            }
            <input
              type={inputType === 'phone' ? 'tel' : 'email'}
              placeholder={inputType === 'phone' ? '+234 800 000 0000' : t('auth.email')}
              className="w-full border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-base outline-none focus:border-[var(--cp)] bg-white"
              value={form.identifier}
              onChange={e => set('identifier', e.target.value)}
              autoComplete={inputType === 'phone' ? 'tel' : 'email'}
            />
          </div>

          <div className="relative">
            <Lock size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder={t('auth.password')}
              className="w-full border-2 border-gray-200 rounded-2xl pl-12 pr-14 py-4 text-base outline-none focus:border-[var(--cp)] bg-white"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-1"
              onClick={() => setShowPw(v => !v)}
            >
              {showPw ? <EyeOff size={22} strokeWidth={1.5} /> : <Eye size={22} strokeWidth={1.5} />}
            </button>
          </div>

          {mode === 'register' && (
            <div className="relative">
              <Globe size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder={t('auth.country')}
                className="w-full border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-base outline-none focus:border-[var(--cp)] bg-white"
                value={form.country}
                onChange={e => set('country', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white text-lg font-bold disabled:opacity-60 transition-opacity active:scale-[0.98]"
          style={{ backgroundColor: 'var(--cp)' }}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
              <ArrowRight size={22} />
            </>
          )}
        </button>

        {/* Google OAuth */}
        <button
          className="mt-3 w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 text-base font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors"
          onClick={() => {
            if (GOOGLE_CLIENT_ID && window.google) {
              window.google.accounts.id.prompt();
            } else {
              setError('Google sign-in coming soon! Use email for now.');
            }
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Toggle login/register */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-base">
            {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
          </p>
          <button
            className="mt-2 text-base font-bold"
            style={{ color: 'var(--cp)' }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? t('auth.register') + ' →' : t('auth.login') + ' →'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Phone number is best for Africa — no email needed. 🌍
        </p>
      </div>
    </div>
  );
}
