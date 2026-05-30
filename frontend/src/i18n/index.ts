import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Global / established languages
import en from './locales/en.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import ru from './locales/ru.json';
import ja from './locales/ja.json';
// East Africa
import sw from './locales/sw.json';
import am from './locales/am.json';
import om from './locales/om.json';
import so from './locales/so.json';
import ti from './locales/ti.json';
import rw from './locales/rw.json';
import lg from './locales/lg.json';
import mg from './locales/mg.json';
import ki from './locales/ki.json';
// West Africa
import ha from './locales/ha.json';
import yo from './locales/yo.json';
import ig from './locales/ig.json';
import ff from './locales/ff.json';
import tw from './locales/tw.json';
import wo from './locales/wo.json';
import bm from './locales/bm.json';
import ee from './locales/ee.json';
import fon from './locales/fon.json';
// Central Africa
import ln from './locales/ln.json';
import kg from './locales/kg.json';
import sg from './locales/sg.json';
// Southern Africa
import zu from './locales/zu.json';
import xh from './locales/xh.json';
import sn from './locales/sn.json';
import nd from './locales/nd.json';
import tn from './locales/tn.json';
import st from './locales/st.json';
import bem from './locales/bem.json';
import ny from './locales/ny.json';

export const LANGUAGES = [
  // Global
  { code: 'en',  name: 'English',           nativeName: 'English',        dir: 'ltr' },
  { code: 'fr',  name: 'French',            nativeName: 'Français',       dir: 'ltr' },
  { code: 'pt',  name: 'Portuguese',        nativeName: 'Português',      dir: 'ltr' },
  { code: 'ar',  name: 'Arabic',            nativeName: 'العربية',         dir: 'rtl' },
  { code: 'zh',  name: 'Chinese',           nativeName: '中文',             dir: 'ltr' },
  { code: 'ru',  name: 'Russian',           nativeName: 'Русский',        dir: 'ltr' },
  { code: 'ja',  name: 'Japanese',          nativeName: '日本語',           dir: 'ltr' },
  // East Africa
  { code: 'sw',  name: 'Swahili',           nativeName: 'Kiswahili',      dir: 'ltr' },
  { code: 'am',  name: 'Amharic',           nativeName: 'አማርኛ',           dir: 'ltr' },
  { code: 'om',  name: 'Oromo',             nativeName: 'Afaan Oromoo',   dir: 'ltr' },
  { code: 'so',  name: 'Somali',            nativeName: 'Af Soomaali',    dir: 'ltr' },
  { code: 'ti',  name: 'Tigrinya',          nativeName: 'ትግርኛ',           dir: 'ltr' },
  { code: 'rw',  name: 'Kinyarwanda',       nativeName: 'Ikinyarwanda',   dir: 'ltr' },
  { code: 'lg',  name: 'Luganda',           nativeName: 'Oluganda',       dir: 'ltr' },
  { code: 'mg',  name: 'Malagasy',          nativeName: 'Malagasy',       dir: 'ltr' },
  { code: 'ki',  name: 'Kikuyu',            nativeName: 'Gĩkũyũ',         dir: 'ltr' },
  // West Africa
  { code: 'ha',  name: 'Hausa',             nativeName: 'Hausa',          dir: 'ltr' },
  { code: 'yo',  name: 'Yoruba',            nativeName: 'Yorùbá',         dir: 'ltr' },
  { code: 'ig',  name: 'Igbo',              nativeName: 'Igbo',           dir: 'ltr' },
  { code: 'ff',  name: 'Peul / Fulfulde',   nativeName: 'Fulfulde',       dir: 'ltr' },
  { code: 'tw',  name: 'Twi (Akan)',        nativeName: 'Twi',            dir: 'ltr' },
  { code: 'wo',  name: 'Wolof',             nativeName: 'Wolof',          dir: 'ltr' },
  { code: 'bm',  name: 'Bambara',           nativeName: 'Bamanankan',     dir: 'ltr' },
  { code: 'ee',  name: 'Ewe',               nativeName: 'Eʋegbe',         dir: 'ltr' },
  { code: 'fon', name: 'Fon',               nativeName: 'Fɔngbè',         dir: 'ltr' },
  // Central Africa
  { code: 'ln',  name: 'Lingala',           nativeName: 'Lingála',        dir: 'ltr' },
  { code: 'kg',  name: 'Kikongo',           nativeName: 'Kikongo',        dir: 'ltr' },
  { code: 'sg',  name: 'Sango',             nativeName: 'Sängö',          dir: 'ltr' },
  // Southern Africa
  { code: 'zu',  name: 'Zulu',              nativeName: 'isiZulu',        dir: 'ltr' },
  { code: 'xh',  name: 'Xhosa',             nativeName: 'isiXhosa',       dir: 'ltr' },
  { code: 'sn',  name: 'Shona',             nativeName: 'ChiShona',       dir: 'ltr' },
  { code: 'nd',  name: 'Ndebele',           nativeName: 'isiNdebele',     dir: 'ltr' },
  { code: 'tn',  name: 'Setswana',          nativeName: 'Setswana',       dir: 'ltr' },
  { code: 'st',  name: 'Sesotho',           nativeName: 'Sesotho',        dir: 'ltr' },
  { code: 'bem', name: 'Bemba',             nativeName: 'Ichibemba',      dir: 'ltr' },
  { code: 'ny',  name: 'Chichewa',          nativeName: 'Chichewa',       dir: 'ltr' },
];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en:  { translation: en  },
      fr:  { translation: fr  },
      pt:  { translation: pt  },
      ar:  { translation: ar  },
      zh:  { translation: zh  },
      ru:  { translation: ru  },
      ja:  { translation: ja  },
      sw:  { translation: sw  },
      am:  { translation: am  },
      om:  { translation: om  },
      so:  { translation: so  },
      ti:  { translation: ti  },
      rw:  { translation: rw  },
      lg:  { translation: lg  },
      mg:  { translation: mg  },
      ki:  { translation: ki  },
      ha:  { translation: ha  },
      yo:  { translation: yo  },
      ig:  { translation: ig  },
      ff:  { translation: ff  },
      tw:  { translation: tw  },
      wo:  { translation: wo  },
      bm:  { translation: bm  },
      ee:  { translation: ee  },
      fon: { translation: fon },
      ln:  { translation: ln  },
      kg:  { translation: kg  },
      sg:  { translation: sg  },
      zu:  { translation: zu  },
      xh:  { translation: xh  },
      sn:  { translation: sn  },
      nd:  { translation: nd  },
      tn:  { translation: tn  },
      st:  { translation: st  },
      bem: { translation: bem },
      ny:  { translation: ny  },
    },
    // Priority: explicit user pick → geo-detected → English
    lng: localStorage.getItem('seshaa-lang') || localStorage.getItem('seshaa-lang-geo') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
