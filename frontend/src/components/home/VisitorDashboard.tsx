/**
 * VisitorDashboard — displayed on the homepage just before the footer.
 *
 * Two panels:
 *  1. App Stats   — live aggregate numbers pulled from /admin/public/stats
 *  2. Your Device — client-side browser/device fingerprint (no server call)
 */
import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import {
  Globe, Users, LayoutGrid, ShoppingBag,
  Monitor, Smartphone, Tablet, Wifi, Cpu, MemoryStick,
  Clock, Languages, MapPin, Layers,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K';
  return String(n);
}

function detectOS(ua: string): string {
  if (/Windows NT 10/.test(ua))  return 'Windows 10/11';
  if (/Windows NT 6/.test(ua))   return 'Windows 8';
  if (/Mac OS X/.test(ua))       return 'macOS';
  if (/Android/.test(ua))        return 'Android';
  if (/iPhone|iPad/.test(ua))    return 'iOS';
  if (/Linux/.test(ua))          return 'Linux';
  return 'Unknown OS';
}

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua))       return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua))    return 'Chrome';
  if (/Safari\//.test(ua))    return 'Safari';
  if (/Firefox\//.test(ua))   return 'Firefox';
  return 'Browser';
}

function detectDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/Mobi|Android.*Mobile/.test(ua)) return 'mobile';
  if (/Tablet|iPad|Android/.test(ua))  return 'tablet';
  return 'desktop';
}

interface AppStats { listings: number; users: number; countries: number; classifieds: number }

interface DeviceInfo {
  os: string;
  browser: string;
  device: 'mobile' | 'tablet' | 'desktop';
  screenW: number;
  screenH: number;
  pixelRatio: number;
  cores: number;
  ram: string;
  language: string;
  timezone: string;
  connection: string;
  online: boolean;
  touchPoints: number;
  cookiesEnabled: boolean;
}

function gatherDevice(): DeviceInfo {
  const ua  = navigator.userAgent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  return {
    os:            detectOS(ua),
    browser:       detectBrowser(ua),
    device:        detectDevice(ua),
    screenW:       screen.width,
    screenH:       screen.height,
    pixelRatio:    window.devicePixelRatio || 1,
    cores:         navigator.hardwareConcurrency || 0,
    ram:           nav.deviceMemory ? `${nav.deviceMemory} GB` : '—',
    language:      navigator.language || '—',
    timezone:      Intl.DateTimeFormat().resolvedOptions().timeZone,
    connection:    conn?.effectiveType ?? (conn?.type ?? '—'),
    online:        navigator.onLine,
    touchPoints:   navigator.maxTouchPoints || 0,
    cookiesEnabled: navigator.cookieEnabled,
  };
}

// ── App Stats panel ───────────────────────────────────────────────────────────
function StatTile({ icon, value, label, color }: {
  icon: React.ReactNode; value: string; label: string; color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
      <div className={`${color} mb-1`}>{icon}</div>
      <span className="text-2xl font-black text-white leading-none">{value}</span>
      <span className="text-xs text-white/70 font-medium text-center">{label}</span>
    </div>
  );
}

// ── Device info row ───────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, mono = false }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
      <span className="text-white/50 shrink-0">{icon}</span>
      <span className="text-xs text-white/60 w-28 shrink-0">{label}</span>
      <span className={`text-xs text-white font-semibold truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

const DEVICE_ICON = {
  mobile:  <Smartphone size={22} className="text-emerald-400" />,
  tablet:  <Tablet     size={22} className="text-blue-400" />,
  desktop: <Monitor    size={22} className="text-purple-400" />,
};

// ── Main component ────────────────────────────────────────────────────────────
export default function VisitorDashboard() {
  const [stats,  setStats]  = useState<AppStats | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    adminApi.getPublicStats()
      .then(r => setStats(r.data))
      .catch(() => setStats({ listings: 0, users: 0, countries: 54, classifieds: 0 }));
    setDevice(gatherDevice());
  }, []);

  if (!device) return null;

  return (
    <section
      className="w-full py-12 px-4 sm:px-6 lg:px-10"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2027 100%)' }}
    >
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Section header ── */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Live data</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Seshaa by the numbers
          </h2>
          <p className="text-sm text-white/50 mt-1">Real-time platform stats + your session info</p>
        </div>

        {/* ── App Stats ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile icon={<LayoutGrid size={20} />} value={fmt(stats.listings)} label="Verified Listings" color="text-emerald-400" />
            <StatTile icon={<Globe        size={20} />} value={String(stats.countries)} label="Countries" color="text-blue-400" />
            <StatTile icon={<Users        size={20} />} value={fmt(stats.users)} label="Members" color="text-violet-400" />
            <StatTile icon={<ShoppingBag  size={20} />} value={fmt(stats.classifieds)} label="Classifieds" color="text-amber-400" />
          </div>
        )}

        {/* ── Device info ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Left: device summary */}
          <div className="bg-white/5 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              {DEVICE_ICON[device.device]}
              <div>
                <p className="text-sm font-bold text-white capitalize">{device.device}</p>
                <p className="text-xs text-white/50">{device.browser} · {device.os}</p>
              </div>
              <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${device.online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {device.online ? '● Online' : '○ Offline'}
              </span>
            </div>
            <InfoRow icon={<Monitor    size={13} />} label="Screen"     value={`${device.screenW} × ${device.screenH} px  @${device.pixelRatio}x`} />
            <InfoRow icon={<Cpu        size={13} />} label="CPU cores"  value={device.cores ? `${device.cores} logical cores` : '—'} />
            <InfoRow icon={<MemoryStick size={13}/>} label="RAM"        value={device.ram} />
            <InfoRow icon={<Wifi       size={13} />} label="Connection" value={device.connection.toUpperCase()} />
            <InfoRow icon={<Layers     size={13} />} label="Pixel ratio" value={`${device.pixelRatio}×  (${device.pixelRatio >= 2 ? 'Retina / HiDPI' : 'Standard DPI'})`} />
          </div>

          {/* Right: locale + session */}
          <div className="bg-white/5 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Session info</p>
            <InfoRow icon={<Languages  size={13} />} label="Language"    value={device.language} />
            <InfoRow icon={<Clock      size={13} />} label="Timezone"    value={device.timezone} mono />
            <InfoRow icon={<MapPin     size={13} />} label="Touch points" value={device.touchPoints > 0 ? `${device.touchPoints} (touch enabled)` : 'None (mouse / trackpad)'} />
            <InfoRow icon={<Globe      size={13} />} label="Cookies"     value={device.cookiesEnabled ? 'Enabled' : 'Disabled'} />
            <InfoRow icon={<Smartphone size={13} />} label="User agent"  value={navigator.userAgent.slice(0, 48) + '…'} mono />
          </div>
        </div>

      </div>
    </section>
  );
}
