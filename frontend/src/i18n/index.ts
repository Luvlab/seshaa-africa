import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', dir: 'ltr' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', dir: 'ltr' },
  { code: 'ff', name: 'Peul / Fulfulde', nativeName: 'Fulfulde', dir: 'ltr' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', dir: 'ltr' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', dir: 'ltr' },
];

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, fr: { translation: fr }, sw: { translation: sw },
      ha: { translation: ha }, yo: { translation: yo }, ff: { translation: ff },
      am: { translation: am }, zu: { translation: zu }, ig: { translation: ig },
      ar: { translation: ar }, pt: { translation: pt } },
    lng: localStorage.getItem('seshaa-lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
