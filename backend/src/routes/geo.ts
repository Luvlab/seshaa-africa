import { Router } from 'express';

const router = Router();

// Flag-derived primary/secondary/accent colors for all 54 African countries
const COUNTRY_THEMES: Record<string, { primary: string; secondary: string; accent: string }> = {
  DZ: { primary: '#006233', secondary: '#FFFFFF', accent: '#D21034' },
  AO: { primary: '#CC0000', secondary: '#000000', accent: '#FFD700' },
  BJ: { primary: '#008751', secondary: '#FCD116', accent: '#DE2110' },
  BW: { primary: '#75AADB', secondary: '#FFFFFF', accent: '#000000' },
  BF: { primary: '#EF2B2D', secondary: '#009A00', accent: '#FCD116' },
  BI: { primary: '#CE1126', secondary: '#1EB53A', accent: '#FFFFFF' },
  CV: { primary: '#003893', secondary: '#CF2027', accent: '#FFD700' },
  CM: { primary: '#007A5E', secondary: '#CE1126', accent: '#FCD116' },
  CF: { primary: '#289728', secondary: '#FFCB00', accent: '#003082' },
  TD: { primary: '#002664', secondary: '#FECB00', accent: '#C60C30' },
  KM: { primary: '#3A75C4', secondary: '#3F9C35', accent: '#FFC61E' },
  CG: { primary: '#009A00', secondary: '#FBDE4A', accent: '#DC241F' },
  CD: { primary: '#007FFF', secondary: '#F7D618', accent: '#CE1021' },
  CI: { primary: '#F77F00', secondary: '#FFFFFF', accent: '#009A44' },
  DJ: { primary: '#6AB2E7', secondary: '#12AD2B', accent: '#FFFFFF' },
  EG: { primary: '#CE1126', secondary: '#FFFFFF', accent: '#000000' },
  GQ: { primary: '#3E9A00', secondary: '#E32118', accent: '#0073CE' },
  ER: { primary: '#4189DD', secondary: '#4CAA51', accent: '#D21034' },
  ET: { primary: '#078930', secondary: '#FCDD09', accent: '#DA121A' },
  GA: { primary: '#009E60', secondary: '#FFD700', accent: '#3A75C4' },
  GM: { primary: '#3A7728', secondary: '#CE1126', accent: '#3E4095' },
  GH: { primary: '#006B3F', secondary: '#FCD20F', accent: '#CF0921' },
  GN: { primary: '#CE1126', secondary: '#FCD116', accent: '#009460' },
  GW: { primary: '#CE1126', secondary: '#FFD700', accent: '#009E60' },
  KE: { primary: '#006600', secondary: '#BB0000', accent: '#000000' },
  LS: { primary: '#009543', secondary: '#0033A0', accent: '#FFFFFF' },
  LR: { primary: '#BF0A30', secondary: '#FFFFFF', accent: '#002868' },
  LY: { primary: '#239E46', secondary: '#000000', accent: '#FFFFFF' },
  MG: { primary: '#FC3D32', secondary: '#007E3A', accent: '#FFFFFF' },
  MW: { primary: '#339E35', secondary: '#CE1126', accent: '#000000' },
  ML: { primary: '#14B53A', secondary: '#FCD116', accent: '#CE1126' },
  MR: { primary: '#006233', secondary: '#FFD700', accent: '#D21034' },
  MU: { primary: '#EA2839', secondary: '#1A206D', accent: '#FFD500' },
  MA: { primary: '#C1272D', secondary: '#FFFFFF', accent: '#006233' },
  MZ: { primary: '#009A44', secondary: '#FCE100', accent: '#000000' },
  NA: { primary: '#003580', secondary: '#009543', accent: '#CC0000' },
  NE: { primary: '#0DB02B', secondary: '#E05206', accent: '#FFFFFF' },
  NG: { primary: '#008751', secondary: '#FFFFFF', accent: '#006B2B' },
  RW: { primary: '#20603D', secondary: '#FAD201', accent: '#00A1DE' },
  ST: { primary: '#12AD2B', secondary: '#FFCE00', accent: '#D21034' },
  SN: { primary: '#00853F', secondary: '#FDEF42', accent: '#E31B23' },
  SC: { primary: '#003F87', secondary: '#FCD856', accent: '#D62828' },
  SL: { primary: '#1EB53A', secondary: '#FFFFFF', accent: '#0072C6' },
  SO: { primary: '#4189DD', secondary: '#FFFFFF', accent: '#4189DD' },
  ZA: { primary: '#007A4D', secondary: '#FFB612', accent: '#002395' },
  SS: { primary: '#078930', secondary: '#D21034', accent: '#000000' },
  SD: { primary: '#007229', secondary: '#D21034', accent: '#000000' },
  SZ: { primary: '#3E5EB9', secondary: '#FFD900', accent: '#B10C0C' },
  TZ: { primary: '#1EB53A', secondary: '#000000', accent: '#00A3DD' },
  TG: { primary: '#006A4E', secondary: '#FFCE00', accent: '#D21034' },
  TN: { primary: '#E70013', secondary: '#FFFFFF', accent: '#C60012' },
  UG: { primary: '#000000', secondary: '#FCD116', accent: '#D90000' },
  ZM: { primary: '#198A00', secondary: '#EF7D00', accent: '#000000' },
  ZW: { primary: '#006400', secondary: '#FFD200', accent: '#D40000' },
};

// Country → primary app language mapping
// Ordered: official/national language first, then most-spoken if in the app.
const COUNTRY_LANG: Record<string, string> = {
  // North Africa
  DZ:'ar', EG:'ar', LY:'ar', MA:'ar', MR:'ar', SD:'ar', TN:'ar',
  // West Africa — Anglophone
  GM:'en', GH:'en', LR:'en', NG:'en', SL:'en', SS:'en',
  // West Africa — Francophone
  BF:'fr', BJ:'fr', CI:'fr', GN:'fr', ML:'fr', NE:'fr', TG:'fr',
  // West Africa — specific local langs in app
  SN:'wo',   // Wolof majority
  GW:'pt',   CV:'pt',
  // Central Africa
  CG:'fr', GA:'fr', TD:'fr',
  CD:'ln',   // Lingala in Kinshasa
  CM:'fr',
  CF:'sg',   // Sango — national language
  GQ:'es',   ST:'pt',
  // East Africa
  BI:'fr',   DJ:'so', ER:'ti', ET:'am',
  KE:'sw',   MG:'mg', MU:'fr', KM:'fr', SC:'fr',
  RW:'rw',   SO:'so', TZ:'sw', UG:'lg',
  // Southern Africa
  AO:'pt',   BW:'tn', LS:'st', MW:'ny', MZ:'pt',
  NA:'en',   SZ:'en', ZA:'zu', ZM:'bem', ZW:'sn',
  // Diaspora / Rest of world
  AE:'ar', SA:'ar', BR:'pt', CN:'zh', FR:'fr',
  IN:'en', JP:'ja', PT:'pt', RU:'ru',
  // Default for everyone else → en
};

// GET /api/geo/detect — detect user's country from IP and return flag colors
router.get('/detect', async (req, res) => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded?.split(',')[0]?.trim() || req.socket.remoteAddress || '';

  // Skip loopback/private IPs
  const isLocal = ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.');

  let countryCode = 'NG'; // default to Nigeria
  let countryName = 'Nigeria';

  if (!isLocal && ip) {
    try {
      const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,country`);
      const data = await r.json() as { status: string; countryCode?: string; country?: string };
      if (data.status === 'success' && data.countryCode) {
        countryCode = data.countryCode;
        countryName = data.country || countryCode;
      }
    } catch {
      // fall through to default
    }
  }

  const colors = COUNTRY_THEMES[countryCode] || COUNTRY_THEMES['NG'];
  const suggestedLang = COUNTRY_LANG[countryCode] || 'en';
  res.json({ countryCode, countryName, colors, suggestedLang });
});

export default router;
