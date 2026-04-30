import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Existing languages
import en from './locales/en.json';
import fr from './locales/fr.json';
import sw from './locales/sw.json';
import ha from './locales/ha.json';
import yo from './locales/yo.json';
import ff from './locales/ff.json';
import am from './locales/am.json';
import zu from './locales/zu.json';
import ig from './locales/ig.json';
import ar from './locales/ar.json';
import pt from './locales/pt.json';
// Previously had locale files but weren't wired up
import ln from './locales/ln.json';
import tw from './locales/tw.json';
import wo from './locales/wo.json';
// New languages
import om from './locales/om.json';
import so from './locales/so.json';
import rw from './locales/rw.json';
import lg from './locales/lg.json';
import ti from './locales/ti.json';
import xh from './locales/xh.json';
import sn from './locales/sn.json';
import mg from './locales/mg.json';
import bm from './locales/bm.json';
import nd from './locales/nd.json';
import zh from './locales/zh.json';
import ru from './locales/ru.json';

export const LANGUAGES = [
  // Global / colonial languages
  { code: 'en', name: 'English',           nativeName: 'English',        dir: 'ltr' },
  { code: 'fr', name: 'French',            nativeName: 'Français',       dir: 'ltr' },
  { code: 'pt', name: 'Portuguese',        nativeName: 'Português',      dir: 'ltr' },
  { code: 'ar', name: 'Arabic',            nativeName: 'العربية',         dir: 'rtl' },
  { code: 'zh', name: 'Chinese',           nativeName: '中文',             dir: 'ltr' },
  { code: 'ru', name: 'Russian',           nativeName: 'Русский',        dir: 'ltr' },
  // East Africa
  { code: 'sw', name: 'Swahili',           nativeName: 'Kiswahili',      dir: 'ltr' },
  { code: 'am', name: 'Amharic',           nativeName: 'አማርኛ',           dir: 'ltr' },
  { code: 'om', name: 'Oromo',             nativeName: 'Afaan Oromoo',   dir: 'ltr' },
  { code: 'so', name: 'Somali',            nativeName: 'Af Soomaali',    dir: 'ltr' },
  { code: 'ti', name: 'Tigrinya',          nativeName: 'ትግርኛ',           dir: 'ltr' },
  { code: 'rw', name: 'Kinyarwanda',       nativeName: 'Ikinyarwanda',   dir: 'ltr' },
  { code: 'lg', name: 'Luganda',           nativeName: 'Oluganda',       dir: 'ltr' },
  { code: 'mg', name: 'Malagasy',          nativeName: 'Malagasy',       dir: 'ltr' },
  // West Africa
  { code: 'ha', name: 'Hausa',             nativeName: 'Hausa',          dir: 'ltr' },
  { code: 'yo', name: 'Yoruba',            nativeName: 'Yorùbá',         dir: 'ltr' },
  { code: 'ig', name: 'Igbo',              nativeName: 'Igbo',           dir: 'ltr' },
  { code: 'ff', name: 'Peul / Fulfulde',   nativeName: 'Fulfulde',       dir: 'ltr' },
  { code: 'tw', name: 'Twi (Akan)',        nativeName: 'Twi',            dir: 'ltr' },
  { code: 'wo', name: 'Wolof',             nativeName: 'Wolof',          dir: 'ltr' },
  { code: 'bm', name: 'Bambara',           nativeName: 'Bamanankan',     dir: 'ltr' },
  // Central Africa
  { code: 'ln', name: 'Lingala',           nativeName: 'Lingála',        dir: 'ltr' },
  // Southern Africa
  { code: 'zu', name: 'Zulu',              nativeName: 'isiZulu',        dir: 'ltr' },
  { code: 'xh', name: 'Xhosa',             nativeName: 'isiXhosa',       dir: 'ltr' },
  { code: 'sn', name: 'Shona',             nativeName: 'ChiShona',       dir: 'ltr' },
  { code: 'nd', name: 'Ndebele',           nativeName: 'isiNdebele',     dir: 'ltr' },
];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      pt: { translation: pt },
      ar: { translation: ar },
      sw: { translation: sw },
      am: { translation: am },
      om: { translation: om },
      so: { translation: so },
      ti: { translation: ti },
      rw: { translation: rw },
      lg: { translation: lg },
      mg: { translation: mg },
      ha: { translation: ha },
      yo: { translation: yo },
      ig: { translation: ig },
      ff: { translation: ff },
      tw: { translation: tw },
      wo: { translation: wo },
      bm: { translation: bm },
      ln: { translation: ln },
      zu: { translation: zu },
      xh: { translation: xh },
      sn: { translation: sn },
      nd: { translation: nd },
      zh: { translation: zh },
      ru: { translation: ru },
    },
    lng: localStorage.getItem('seshaa-lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
