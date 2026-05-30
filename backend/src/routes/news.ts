/**
 * Seshaa News Router
 * Aggregates RSS feeds from 100+ African publications.
 * All articles link back to their original source with full credit.
 * Cache: 30 min in-memory per category.
 * Archive: saves headlines to DB when cache refreshes.
 */
import { Router } from 'express';
import Parser from 'rss-parser';
import prisma from '../db';

const router = Router();
const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Seshaa/2.0 (+https://seshaa.africa) RSS Aggregator' },
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
    ],
  },
});

// ── Source registry ──────────────────────────────────────────────────────────
// Ordered roughly by reach/traffic within each category.
type Source = { name: string; url: string; country: string; lang?: string; category?: string };

const ALL_SOURCES: Source[] = [
  // ── PAN-AFRICAN ──────────────────────────────────────────────────────────
  { name: 'AllAfrica', url: 'https://allafrica.com/tools/headlines/rdf/africa/headlines.rdf', country: 'Pan-Africa' },
  { name: 'BBC Africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', country: 'Pan-Africa' },
  { name: 'Al Jazeera Africa', url: 'https://www.aljazeera.com/xml/rss/all.xml', country: 'Pan-Africa' },
  { name: 'The Africa Report', url: 'https://www.theafricareport.com/feed/', country: 'Pan-Africa' },
  { name: 'Africa News', url: 'https://www.africanews.com/feed/rss', country: 'Pan-Africa' },
  { name: 'RFI Afrique', url: 'https://www.rfi.fr/fr/afrique/rss', country: 'Pan-Africa', lang: 'fr' },
  { name: 'RFI Africa EN', url: 'https://www.rfi.fr/en/africa/rss', country: 'Pan-Africa' },
  { name: 'France 24 Afrique', url: 'https://www.france24.com/fr/afrique/rss', country: 'Pan-Africa', lang: 'fr' },
  { name: 'France 24 Africa EN', url: 'https://www.france24.com/en/africa/rss', country: 'Pan-Africa' },
  { name: 'Quartz Africa', url: 'https://qz.com/africa/rss', country: 'Pan-Africa' },
  { name: 'African Arguments', url: 'https://africanarguments.org/feed/', country: 'Pan-Africa' },
  { name: 'How We Made It', url: 'https://howwemadeitinafrica.com/feed/', country: 'Pan-Africa', category: 'business' },
  { name: 'African Business', url: 'https://african.business/feed/', country: 'Pan-Africa', category: 'business' },
  { name: 'The Continent', url: 'https://thecontinent.org/feed/', country: 'Pan-Africa' },
  { name: 'Ventures Africa', url: 'https://venturesafrica.com/feed/', country: 'Pan-Africa', category: 'business' },
  { name: 'OkayAfrica', url: 'https://www.okayafrica.com/feed/', country: 'Pan-Africa', category: 'entertainment' },
  { name: 'New African Magazine', url: 'https://newafricanmagazine.com/feed/', country: 'Pan-Africa' },
  { name: 'Africa.com', url: 'https://africa.com/feed/', country: 'Pan-Africa' },
  { name: 'Jeune Afrique', url: 'https://www.jeuneafrique.com/feed/', country: 'Pan-Africa', lang: 'fr' },
  { name: 'IT News Africa', url: 'https://itnewsafrica.com/feed/', country: 'Pan-Africa', category: 'technology' },
  { name: 'The African Mirror', url: 'https://theafricanmirror.africa/feed/', country: 'Pan-Africa' },
  { name: 'Sahara Reporters', url: 'https://saharareporters.com/feeds/latest/feed', country: 'Pan-Africa' },
  { name: 'Billionaires Africa', url: 'https://billionaires.africa/feed/', country: 'Pan-Africa', category: 'business' },
  { name: 'AfricaBusiness.com', url: 'https://africabusiness.com/feed/', country: 'Pan-Africa', category: 'business' },
  { name: 'Business Post NG', url: 'https://businesspost.ng/feed/', country: 'Nigeria', category: 'business' },
  { name: 'The Exchange Africa', url: 'https://theexchange.africa/feed/', country: 'East Africa', category: 'business' },
  { name: 'NYT Africa', url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/world/africa/rss.xml', country: 'Pan-Africa' },
  { name: 'Africa Science News', url: 'https://africasciencenews.org/feed/', country: 'Pan-Africa', category: 'health' },
  { name: 'Business Daily Africa', url: 'https://businessdailyafrica.com/service/rss/bd/1939136/feed.rss', country: 'East Africa', category: 'business' },
  { name: 'East African Business Times', url: 'https://eabusinesstimes.com/feed/', country: 'East Africa', category: 'business' },

  // ── NIGERIA ──────────────────────────────────────────────────────────────
  { name: 'Punch NG', url: 'https://punchng.com/feed/', country: 'Nigeria' },
  { name: 'Vanguard NG', url: 'https://www.vanguardngr.com/feed/', country: 'Nigeria' },
  { name: 'Premium Times', url: 'https://www.premiumtimesng.com/feed/', country: 'Nigeria' },
  { name: 'BusinessDay NG', url: 'https://businessday.ng/feed/', country: 'Nigeria', category: 'business' },
  { name: 'The Guardian NG', url: 'https://guardian.ng/feed/', country: 'Nigeria' },
  { name: 'Channels TV', url: 'https://www.channelstv.com/feed/', country: 'Nigeria' },
  { name: 'Daily Trust', url: 'https://dailytrust.com/feed/', country: 'Nigeria' },
  { name: 'This Day Live', url: 'https://www.thisdaylive.com/index.php/feed/', country: 'Nigeria' },
  { name: 'Nairametrics', url: 'https://nairametrics.com/feed/', country: 'Nigeria', category: 'finance' },
  { name: 'TechCabal', url: 'https://techcabal.com/feed/', country: 'Nigeria', category: 'technology' },
  { name: 'TechPoint Africa', url: 'https://techpoint.africa/feed/', country: 'Nigeria', category: 'technology' },
  { name: 'Technext', url: 'https://technext24.com/feed/', country: 'Nigeria', category: 'technology' },
  { name: 'Bella Naija', url: 'https://www.bellanaija.com/feed/', country: 'Nigeria', category: 'entertainment' },
  { name: 'Pulse Nigeria', url: 'https://www.pulse.ng/rss/feed.xml', country: 'Nigeria', category: 'entertainment' },
  { name: 'NotJustOk', url: 'https://www.notjustok.com/feed/', country: 'Nigeria', category: 'entertainment' },
  { name: 'Naija247News', url: 'https://naija247news.com/feed/', country: 'Nigeria' },
  { name: 'Leadership NG', url: 'https://leadership.ng/feed/', country: 'Nigeria' },
  { name: 'Sun News', url: 'https://www.sunnewsonline.com/feed/', country: 'Nigeria' },
  { name: 'Daily Post Nigeria', url: 'https://dailypost.ng/feed/', country: 'Nigeria' },
  { name: 'The Nation Nigeria', url: 'https://thenationonlineng.net/feed/', country: 'Nigeria' },
  { name: 'Ripples Nigeria', url: 'https://ripplesnigeria.com/feed/', country: 'Nigeria' },
  { name: 'Tribune Online NG', url: 'https://tribuneonlineng.com/feed/', country: 'Nigeria' },
  { name: 'Legit NG', url: 'https://www.legit.ng/rss/all.rss', country: 'Nigeria' },
  { name: 'PM News Nigeria', url: 'https://pmnewsnigeria.com/feed/', country: 'Nigeria' },
  { name: 'Independent NG', url: 'https://independent.ng/feed/', country: 'Nigeria' },
  { name: 'Information Nigeria', url: 'https://www.informationng.com/feed/', country: 'Nigeria' },
  { name: 'Pointblank News', url: 'https://pointblanknews.com/pbn/feed/', country: 'Nigeria' },
  { name: 'Business Hallmark', url: 'https://hallmarknews.com/feed/', country: 'Nigeria', category: 'business' },
  { name: 'Herald Nigeria', url: 'https://herald.ng/feed/', country: 'Nigeria' },
  { name: 'African Examiner', url: 'https://africanexaminer.com/feed/', country: 'Nigeria' },
  { name: 'Daily Nigerian', url: 'https://dailynigerian.com/feed/', country: 'Nigeria' },
  { name: 'Tori News NG', url: 'https://tori.ng/feed/rss.xml', country: 'Nigeria' },

  // ── KENYA ────────────────────────────────────────────────────────────────
  { name: 'Nation Africa', url: 'https://nation.africa/rss/feed.xml', country: 'Kenya' },
  { name: 'The Standard KE', url: 'https://www.standardmedia.co.ke/rss', country: 'Kenya' },
  { name: 'The Star KE', url: 'https://www.the-star.co.ke/rss/feed/', country: 'Kenya' },
  { name: 'Business Daily KE', url: 'https://www.businessdailyafrica.com/service/rss/bd/1939132/feed.rss', country: 'Kenya', category: 'business' },
  { name: 'Tuko KE', url: 'https://www.tuko.co.ke/rss', country: 'Kenya' },
  { name: 'The East African', url: 'https://www.theeastafrican.co.ke/rss', country: 'East Africa', category: 'business' },
  { name: 'Kenya News Agency', url: 'https://kenyanews.go.ke/feed/', country: 'Kenya' },
  { name: 'Capital FM Kenya', url: 'https://capitalfm.co.ke/news/feed/', country: 'Kenya' },
  { name: 'KBC Kenya', url: 'https://kbc.co.ke/feed/', country: 'Kenya' },
  { name: 'K24 Kenya', url: 'https://k24.digital/feed/', country: 'Kenya' },
  { name: 'Nairobi Wire', url: 'https://nairobiwire.com/feed/', country: 'Kenya' },
  { name: 'AllAfrica Kenya', url: 'https://allafrica.com/tools/headlines/rdf/kenya/headlines.rdf', country: 'Kenya' },
  { name: 'The East African TEA', url: 'https://www.theeastafrican.co.ke/service/rss/tea/1289142/feed.rss', country: 'East Africa' },
  { name: 'Sharp Daily KE', url: 'https://thesharpdaily.com/feed/', country: 'Kenya', category: 'business' },
  { name: 'Taifa Leo', url: 'https://taifaleo.nation.co.ke/feed/', country: 'Kenya' },
  { name: 'People Daily KE', url: 'https://peopledaily.digital/feed/', country: 'Kenya' },

  // ── SOUTH AFRICA ─────────────────────────────────────────────────────────
  { name: 'Daily Maverick', url: 'https://www.dailymaverick.co.za/dmrss/', country: 'South Africa' },
  { name: 'Mail & Guardian', url: 'https://mg.co.za/feed/', country: 'South Africa' },
  { name: 'News24', url: 'https://feeds.news24.com/articles/news24/TopStories/rss', country: 'South Africa' },
  { name: 'TimesLive SA', url: 'https://www.timeslive.co.za/rss/', country: 'South Africa' },
  { name: 'Eyewitness News', url: 'https://ewn.co.za/RSS%20Feeds/Latest%20News', country: 'South Africa' },
  { name: 'SowetanLive', url: 'https://www.sowetanlive.co.za/rss/', country: 'South Africa' },
  { name: 'Business Day SA', url: 'https://www.businesslive.co.za/rss/bd/', country: 'South Africa', category: 'business' },
  { name: 'Fin24', url: 'https://www.news24.com/fin24/rss', country: 'South Africa', category: 'finance' },
  { name: 'TechCentral SA', url: 'https://techcentral.co.za/feed/', country: 'South Africa', category: 'technology' },
  { name: 'IT Web Africa', url: 'https://itweb.africa/feed/rss', country: 'South Africa', category: 'technology' },
  { name: 'Health-e News', url: 'https://health-e.org.za/feed/', country: 'South Africa', category: 'health' },
  { name: 'Briefly SA', url: 'https://briefly.co.za/rss', country: 'South Africa', category: 'entertainment' },
  { name: 'The Citizen SA', url: 'https://citizen.co.za/feed/', country: 'South Africa' },
  { name: 'IOL SA', url: 'http://rss.iol.io/iol/news', country: 'South Africa' },
  { name: 'Moneyweb SA', url: 'https://www.moneyweb.co.za/feed/', country: 'South Africa', category: 'finance' },
  { name: 'BusinessTech SA', url: 'https://businesstech.co.za/news/feed/', country: 'South Africa', category: 'business' },
  { name: 'MyBroadband', url: 'https://mybroadband.co.za/news/feed/', country: 'South Africa', category: 'technology' },
  { name: 'The South African', url: 'https://www.thesouthafrican.com/feed/', country: 'South Africa' },
  { name: 'African Reporter ZA', url: 'https://africanreporter.co.za/feed/', country: 'South Africa' },
  { name: 'Cape Business News', url: 'https://cbn.co.za/feed/', country: 'South Africa', category: 'business' },
  { name: 'SME South Africa', url: 'https://smesouthafrica.co.za/feed/', country: 'South Africa', category: 'business' },
  { name: 'Biznews SA', url: 'https://biznews.com/feed/', country: 'South Africa', category: 'business' },

  // ── GHANA ────────────────────────────────────────────────────────────────
  { name: 'GhanaWeb', url: 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/rss.xml', country: 'Ghana' },
  { name: 'MyJoyOnline', url: 'https://www.myjoyonline.com/feed/', country: 'Ghana' },
  { name: 'Graphic Online', url: 'https://www.graphic.com.gh/feed/', country: 'Ghana' },
  { name: 'GNA Ghana', url: 'https://www.ghananewsagency.org/rss/', country: 'Ghana' },
  { name: 'Ghana Business News', url: 'https://www.ghanabusinessnews.com/feed/', country: 'Ghana', category: 'business' },
  { name: 'Pulse Ghana', url: 'https://www.pulse.com.gh/rss/feed.xml', country: 'Ghana', category: 'entertainment' },
  { name: 'Citi Newsroom', url: 'https://www.citinewsroom.com/feed/', country: 'Ghana' },
  { name: 'Adom Online', url: 'https://adomonline.com/feed/', country: 'Ghana' },
  { name: 'Modern Ghana', url: 'https://www.modernghana.com/rssfeed/', country: 'Ghana' },
  { name: 'Ghanaian Times', url: 'https://ghanaiantimes.com.gh/feed/', country: 'Ghana' },
  { name: 'Ghana Summary', url: 'https://ghanasummary.com/feed/', country: 'Ghana' },
  { name: 'Peace FM Online', url: 'https://peacefmonline.com/pages/news.xml', country: 'Ghana' },

  // ── ETHIOPIA & HORN OF AFRICA ─────────────────────────────────────────────
  { name: 'Ethiopian Reporter', url: 'https://www.thereporterethiopia.com/feed/', country: 'Ethiopia' },
  { name: 'Addis Fortune', url: 'https://addisfortune.news/feed/', country: 'Ethiopia', category: 'business' },
  { name: 'Addis Standard', url: 'https://addisstandard.com/feed/', country: 'Ethiopia' },
  { name: 'Borkena', url: 'https://borkena.com/feed/', country: 'Ethiopia' },
  { name: 'Capital Ethiopia', url: 'https://capitalethiopia.com/feed/', country: 'Ethiopia', category: 'business' },
  { name: 'New Business Ethiopia', url: 'https://newbusinessethiopia.com/feed/', country: 'Ethiopia', category: 'business' },
  { name: 'Ethiopia Insight', url: 'https://ethiopia-insight.com/feed/', country: 'Ethiopia' },
  { name: 'Walta Info', url: 'https://waltainfo.com/feed/', country: 'Ethiopia' },
  { name: 'AllAfrica Ethiopia', url: 'https://allafrica.com/tools/headlines/rdf/ethiopia/headlines.rdf', country: 'Ethiopia' },
  { name: 'Garowe Online', url: 'https://www.garoweonline.com/en/rss', country: 'Somalia' },
  { name: 'Hiiraan Online', url: 'https://www.hiiraan.com/news4/rss.aspx', country: 'Somalia' },

  // ── EGYPT & NORTH AFRICA ──────────────────────────────────────────────────
  { name: 'Ahram Online', url: 'https://english.ahram.org.eg/rss.aspx', country: 'Egypt' },
  { name: 'Egypt Independent', url: 'https://egyptindependent.com/feed/', country: 'Egypt' },
  { name: 'Daily News Egypt', url: 'https://www.dailynewsegypt.com/feed/', country: 'Egypt' },
  { name: 'Mada Masr', url: 'https://www.madamasr.com/en/feed/', country: 'Egypt' },
  { name: 'Egyptian Streets', url: 'https://egyptianstreets.com/feed/', country: 'Egypt' },
  { name: 'Egyptian Gazette', url: 'https://egyptian-gazette.com/feed/', country: 'Egypt' },
  { name: 'Egypt Oil & Gas', url: 'https://egyptoil-gas.com/news/feed/', country: 'Egypt', category: 'business' },
  { name: 'Morocco World News', url: 'https://www.moroccoworldnews.com/feed/', country: 'Morocco' },
  { name: 'Le360 Maroc', url: 'https://fr.le360.ma/rss.xml', country: 'Morocco', lang: 'fr' },
  { name: "Aujourd'hui le Maroc", url: 'https://aujourdhui.ma/feed/', country: 'Morocco', lang: 'fr' },
  { name: 'La Vie éco Maroc', url: 'https://lavieeco.com/feed/', country: 'Morocco', lang: 'fr' },
  { name: 'Hespress', url: 'https://hespress.com/feed/', country: 'Morocco', lang: 'ar' },
  { name: 'MapNews MA', url: 'https://mapnews.ma/en/actualites/general/rss.xml', country: 'Morocco' },
  { name: 'La Nouvelle Tribune MA', url: 'https://lnt.ma/feed/', country: 'Morocco', lang: 'fr' },
  { name: 'TAP News TN', url: 'https://www.tap.info.tn/en/RSS-Feeds', country: 'Tunisia' },
  { name: 'Kapitalis TN', url: 'https://kapitalis.com/tunisie/feed/', country: 'Tunisia', lang: 'fr' },
  { name: 'Business News TN', url: 'https://businessnews.com.tn/feed/', country: 'Tunisia', lang: 'fr' },
  { name: 'Libya Herald', url: 'https://libyaherald.com/feed/', country: 'Libya' },
  { name: 'TSA Algérie', url: 'https://www.tsa-algerie.com/feed/', country: 'Algeria', lang: 'fr' },
  { name: 'HuffPost Maghreb', url: 'https://www.huffpostmaghreb.com/feeds/index.xml', country: 'North Africa', lang: 'fr' },

  // ── TANZANIA & EAST AFRICA ───────────────────────────────────────────────
  { name: 'The Citizen TZ', url: 'https://www.thecitizen.co.tz/tanzania/rss', country: 'Tanzania' },
  { name: 'Daily News TZ', url: 'https://dailynews.co.tz/rss/', country: 'Tanzania' },
  { name: 'Mwananchi', url: 'https://www.mwananchi.co.tz/mw/rss', country: 'Tanzania' },

  // ── UGANDA ───────────────────────────────────────────────────────────────
  { name: 'Daily Monitor UG', url: 'https://www.monitor.co.ug/uganda/rss', country: 'Uganda' },
  { name: 'New Vision UG', url: 'https://www.newvision.co.ug/rss', country: 'Uganda' },
  { name: 'Nile Post', url: 'https://nilepost.co.ug/feed/', country: 'Uganda' },
  { name: 'Chimp Reports', url: 'https://chimpreports.com/feed/', country: 'Uganda' },

  // ── RWANDA ───────────────────────────────────────────────────────────────
  { name: 'The New Times RW', url: 'https://www.newtimes.co.rw/rss', country: 'Rwanda' },
  { name: 'KT Press', url: 'https://ktpress.rw/feed/', country: 'Rwanda' },
  { name: 'Taarifa Rwanda', url: 'https://taarifa.rw/feed/', country: 'Rwanda' },
  { name: 'The Rwandan', url: 'https://therwandan.com/feed/', country: 'Rwanda' },
  { name: 'Rwanda Today', url: 'https://rwandatoday.africa/service/rss/rwanda/2464348/feed.rss', country: 'Rwanda' },
  { name: 'Imvaho Nshya', url: 'https://imvahonshya.co.rw/feed/', country: 'Rwanda' },

  // ── SENEGAL & WEST AFRICA ─────────────────────────────────────────────────
  { name: 'Seneweb', url: 'https://www.seneweb.com/news/rss.php', country: 'Senegal', lang: 'fr' },
  { name: 'DakarActu', url: 'https://www.dakaractu.com/rss.php', country: 'Senegal', lang: 'fr' },
  { name: 'SeneNews', url: 'https://www.senenews.com/feed/', country: 'Senegal', lang: 'fr' },
  { name: 'Senego', url: 'https://senego.com/feed/', country: 'Senegal', lang: 'fr' },
  { name: 'PressAfrik', url: 'https://www.pressafrik.com/feed/', country: 'Senegal', lang: 'fr' },

  // ── CÔTE D'IVOIRE ─────────────────────────────────────────────────────────
  { name: "Fratmat CI", url: 'https://www.fratmat.info/rss.xml', country: "Côte d'Ivoire", lang: 'fr' },
  { name: 'Koaci CI', url: 'https://koaci.com/rss.xml', country: "Côte d'Ivoire", lang: 'fr' },
  { name: 'Connection Ivoirienne', url: 'https://connectionivoirienne.net/feed/', country: "Côte d'Ivoire", lang: 'fr' },
  { name: 'Ivorian.net', url: 'https://www.ivorian.net/feed/', country: "Côte d'Ivoire", lang: 'fr' },

  // ── CAMEROON ─────────────────────────────────────────────────────────────
  { name: 'Journal du Cameroun', url: 'https://www.journalducameroun.com/feed/', country: 'Cameroon', lang: 'fr' },
  { name: 'Cameroon Tribune', url: 'https://www.cameroon-tribune.cm/rss.xml', country: 'Cameroon', lang: 'fr' },
  { name: '237online Cameroun', url: 'https://www.237online.com/feed/', country: 'Cameroon', lang: 'fr' },
  { name: 'Camer.be', url: 'https://www.camer.be/rss/', country: 'Cameroon', lang: 'fr' },
  { name: 'CRTV Cameroon', url: 'https://crtv.cm/feed/', country: 'Cameroon', lang: 'fr' },
  { name: 'Cameroon Concord', url: 'https://www.cameroonconcordnews.com/feed/', country: 'Cameroon' },
  { name: 'CameroonOnline', url: 'https://www.cameroononline.org/feed/', country: 'Cameroon' },
  { name: '237ACTU', url: 'https://237actu.com/content/feed/', country: 'Cameroon', lang: 'fr' },
  { name: 'Cameroon News Agency', url: 'https://cameroonnewsagency.com/feed/', country: 'Cameroon' },
  { name: 'Cameroon Voice', url: 'https://cameroonvoice.com/feed/', country: 'Cameroon' },

  // ── BURKINA FASO ─────────────────────────────────────────────────────────
  { name: "Aujourd'hui Burkina", url: 'https://www.aoujourdhuiaufaso.net/rss.xml', country: 'Burkina Faso', lang: 'fr' },
  { name: 'Sidwaya', url: 'https://www.sidwaya.info/feed/', country: 'Burkina Faso', lang: 'fr' },
  { name: 'Le Pays BF', url: 'https://lepays.bf/feed/', country: 'Burkina Faso', lang: 'fr' },
  { name: 'Burkina24', url: 'https://burkina24.com/feed/', country: 'Burkina Faso', lang: 'fr' },
  { name: 'AIB Burkina', url: 'https://www.aib.media/feed/', country: 'Burkina Faso', lang: 'fr' },
  { name: "L'Express du Faso", url: 'https://www.lexpressdufaso-bf.com/feed/', country: 'Burkina Faso', lang: 'fr' },
  { name: 'BurkinaInfo', url: 'https://burkinainfo.com/feed/', country: 'Burkina Faso', lang: 'fr' },

  // ── MALI ─────────────────────────────────────────────────────────────────
  { name: 'Mali Actu', url: 'https://maliactu.net/feed/', country: 'Mali', lang: 'fr' },
  { name: 'Maliweb', url: 'https://www.maliweb.net/feed/', country: 'Mali', lang: 'fr' },
  { name: 'Bamada.net', url: 'https://bamada.net/feed/', country: 'Mali', lang: 'fr' },
  { name: 'Journal du Mali', url: 'https://www.journaldumali.com/feed/', country: 'Mali', lang: 'fr' },

  // ── BENIN & TOGO ─────────────────────────────────────────────────────────
  { name: 'Bénin Web TV', url: 'https://www.beninwebtv.com/feed/', country: 'Benin', lang: 'fr' },
  { name: "L'Agora Bénin", url: 'https://lagora.bj/feed/', country: 'Benin', lang: 'fr' },
  { name: 'Togo Actu', url: 'https://togoactu.net/feed/', country: 'Togo', lang: 'fr' },
  { name: 'Togo First', url: 'https://www.togofirst.com/en/rss/', country: 'Togo' },

  // ── NIGER & GUINEA ────────────────────────────────────────────────────────
  { name: 'Niger Diaspora', url: 'https://nigerdiaspora.net/feed/', country: 'Niger', lang: 'fr' },
  { name: 'Guinée News', url: 'https://www.guineenews.org/feed/', country: 'Guinea', lang: 'fr' },

  // ── GABON & CENTRAL AFRICA ────────────────────────────────────────────────
  { name: 'Gabon Actu', url: 'https://gabonactu.com/feed/', country: 'Gabon', lang: 'fr' },

  // ── SIERRA LEONE & LIBERIA ────────────────────────────────────────────────
  { name: 'Sierra Leone Telegraph', url: 'https://www.thesierraleonetelegraph.com/feed/', country: 'Sierra Leone' },
  { name: 'Liberian Observer', url: 'https://www.liberianobserver.com/feed/', country: 'Liberia' },
  { name: 'FrontPage Africa', url: 'https://frontpageafricaonline.com/feed/', country: 'Liberia' },

  // ── ZIMBABWE ─────────────────────────────────────────────────────────────
  { name: 'NewsDay ZW', url: 'https://www.newsday.co.zw/feed/', country: 'Zimbabwe' },
  { name: 'Zimbabwe Situation', url: 'https://www.zimbabwesituation.com/feed/', country: 'Zimbabwe' },
  { name: 'Herald ZW', url: 'https://www.herald.co.zw/feed/', country: 'Zimbabwe' },
  { name: 'The Chronicle ZW', url: 'https://chronicle.co.zw/feed/', country: 'Zimbabwe' },
  { name: 'The Sunday Mail ZW', url: 'https://sundaymail.co.zw/feed/', country: 'Zimbabwe' },
  { name: 'iHarare', url: 'https://iharare.com/feed/', country: 'Zimbabwe' },
  { name: 'ZimLive', url: 'https://zimlive.com/feed/', country: 'Zimbabwe' },
  { name: 'New Zimbabwe', url: 'https://newzimbabwe.com/feed/', country: 'Zimbabwe' },
  { name: 'Bulawayo24', url: 'https://bulawayo24.com/feeds-rss-rss.rss', country: 'Zimbabwe' },
  { name: 'The Financial Gazette ZW', url: 'https://fingaz.co.zw/feed/', country: 'Zimbabwe', category: 'business' },
  { name: 'DailyNews ZW', url: 'https://dailynews.co.zw/feed/', country: 'Zimbabwe' },
  { name: '263Chat', url: 'https://263chat.com/feed/', country: 'Zimbabwe' },

  // ── ZAMBIA ────────────────────────────────────────────────────────────────
  { name: 'Zambian Observer', url: 'https://www.zambianobserver.com/feed/', country: 'Zambia' },
  { name: 'Lusaka Times', url: 'https://www.lusakatimes.com/feed/', country: 'Zambia' },
  { name: 'Zambia Daily Mail', url: 'https://www.daily-mail.co.zm/feed/', country: 'Zambia' },
  { name: 'Times of Zambia', url: 'https://times.co.zm/?feed=rss2', country: 'Zambia' },
  { name: 'News Diggers ZM', url: 'https://diggers.news/feed/', country: 'Zambia' },
  { name: 'Lusaka Voice', url: 'https://lusakavoice.com/feed/', country: 'Zambia' },
  { name: 'Zambia News365', url: 'https://zambianews365.com/feed/', country: 'Zambia' },
  { name: 'Daily Nation Zambia', url: 'https://dailynationzambia.com/feed/', country: 'Zambia' },

  // ── MALAWI ────────────────────────────────────────────────────────────────
  { name: 'Malawi24', url: 'https://malawi24.com/feed/', country: 'Malawi' },
  { name: 'Malawi Nyasa Times', url: 'https://www.nyasatimes.com/feed/', country: 'Malawi' },

  // ── NAMIBIA ───────────────────────────────────────────────────────────────
  { name: 'The Namibian', url: 'https://www.namibian.com.na/rssfeed.php', country: 'Namibia' },
  { name: 'Namibia Economist', url: 'https://economist.com.na/feed/', country: 'Namibia', category: 'business' },
  { name: 'Windhoek Observer', url: 'https://observer24.com.na/feed/', country: 'Namibia' },
  { name: 'Informanté NA', url: 'https://informante.web.na/?feed=rss2', country: 'Namibia' },
  { name: 'Namibia Daily News', url: 'https://namibiadailynews.info/feed/', country: 'Namibia' },

  // ── BOTSWANA / LESOTHO / ESWATINI ─────────────────────────────────────────
  { name: 'Botswana Daily News', url: 'https://www.dailynews.gov.bw/rss.php', country: 'Botswana' },
  { name: 'Observer Lesotho', url: 'https://www.lesothotimes.co.ls/feed/', country: 'Lesotho' },
  { name: 'Observer Eswatini', url: 'https://www.observer.org.sz/feed/', country: 'Eswatini' },

  // ── DR CONGO ─────────────────────────────────────────────────────────────
  { name: 'Radio Okapi DRC', url: 'https://feeds.feedburner.com/radiookapi/actu', country: 'DR Congo', lang: 'fr' },
  { name: 'Actualité CD', url: 'https://actualite.cd/feed/', country: 'DR Congo', lang: 'fr' },
  { name: 'Actu RDC', url: 'https://acturdc.com/feed/', country: 'DR Congo', lang: 'fr' },
  { name: 'Journal de Kinshasa', url: 'https://www.journaldekinshasa.com/feed/', country: 'DR Congo', lang: 'fr' },
  { name: 'Congo Independent', url: 'http://www.congoindependant.com/feed/', country: 'DR Congo', lang: 'fr' },
  { name: 'ACP Congo', url: 'https://acpcongo.com/feed/', country: 'DR Congo', lang: 'fr' },
  { name: 'Dépêche CD', url: 'https://depeche.cd/feed/', country: 'DR Congo', lang: 'fr' },

  // ── ANGOLA & MOZAMBIQUE ───────────────────────────────────────────────────
  { name: 'Angola Press', url: 'https://www.angop.ao/rss/', country: 'Angola', lang: 'pt' },
  { name: 'O País MZ', url: 'https://opais.co.mz/feed/', country: 'Mozambique', lang: 'pt' },
  { name: 'Club of Mozambique', url: 'https://clubofmozambique.com/feed/', country: 'Mozambique' },

  // ── BURUNDI ───────────────────────────────────────────────────────────────
  { name: 'Burundi Eco', url: 'https://burundi-eco.com/feed/', country: 'Burundi', lang: 'fr' },
  { name: 'IWACU Burundi', url: 'https://www.iwacu-burundi.org/englishnews/feed/', country: 'Burundi' },
  { name: 'Yaga Burundi', url: 'https://www.yaga-burundi.com/feed/', country: 'Burundi', lang: 'fr' },
  { name: 'Radio Isanganiro', url: 'https://isanganiro.org/feed/', country: 'Burundi', lang: 'fr' },
  { name: 'Burundi Forum', url: 'https://burundi-forum.org/feed/', country: 'Burundi', lang: 'fr' },

  // ── EAST AFRICA (regional) ────────────────────────────────────────────────
  { name: 'The EastAfrican', url: 'https://www.theeastafrican.co.ke/tea/rss', country: 'East Africa' },
  { name: 'AllAfrica East Africa', url: 'https://allafrica.com/tools/headlines/rdf/eastafrica/headlines.rdf', country: 'East Africa' },

  // ── HORN OF AFRICA & SUDAN ───────────────────────────────────────────────
  { name: 'Sudan Tribune', url: 'https://sudantribune.net/feed/', country: 'Sudan' },
  { name: 'Dabanga Sudan', url: 'https://www.dabangasudan.org/en/feed/', country: 'Sudan' },
  { name: 'Radio Tamazuj', url: 'https://radiotamazuj.org/en/rss/news.xml', country: 'Sudan' },
  { name: 'AllAfrica Sudan', url: 'https://allafrica.com/tools/headlines/rdf/sudan/headlines.rdf', country: 'Sudan' },
  { name: 'Eritrea Profile', url: 'https://www.shabait.com/feed/', country: 'Eritrea' },

  // ── INDIAN OCEAN & ISLANDS ────────────────────────────────────────────────
  { name: "L'Express Madagascar", url: 'https://lexpress.mg/feed/', country: 'Madagascar', lang: 'fr' },
  { name: "L'Express Mauritius", url: 'https://www.lexpress.mu/feed/', country: 'Mauritius' },
  { name: 'Seychelles News Agency', url: 'https://www.seychellesnewsagency.com/feed/', country: 'Seychelles' },

  // ── TRAVEL ───────────────────────────────────────────────────────────────
  { name: 'Africa Geographic', url: 'https://africageographic.com/blog/feed/', country: 'Pan-Africa', category: 'travel' },
  { name: 'Travel Africa Mag', url: 'https://www.travelafricamag.com/feed/', country: 'Pan-Africa', category: 'travel' },
  { name: 'Nomadic Matt Africa', url: 'https://www.nomadicmatt.com/category/africa/feed/', country: 'Pan-Africa', category: 'travel' },
  { name: 'Lonely Planet Africa', url: 'https://www.lonelyplanet.com/africa.rss', country: 'Pan-Africa', category: 'travel' },
  { name: 'Afar Africa', url: 'https://www.afar.com/magazine/africa/rss', country: 'Pan-Africa', category: 'travel' },
  { name: 'Safaris Africa', url: 'https://blog.safaribookings.com/feed/', country: 'Pan-Africa', category: 'travel' },
];

// Category → source filter logic
// Specialty categories (tech/health/sports/etc.) use ONLY explicitly-tagged sources
// so each tab shows content from that domain, not a mix of general headlines.
// 'general' and 'politics' pull from all un-tagged sources (most political news is
// filed in general outlets rather than dedicated political feeds).
const CATEGORY_MAP: Record<string, (s: Source) => boolean> = {
  general:       (s) => !s.category || s.category === 'general',
  politics:      (s) => !s.category || s.category === 'politics',
  business:      (s) => s.category === 'business',
  technology:    (s) => s.category === 'technology',
  health:        (s) => s.category === 'health',
  sports:        (s) => s.category === 'sports',
  entertainment: (s) => s.category === 'entertainment',
  agriculture:   (s) => s.category === 'agriculture',
  finance:       (s) => s.category === 'finance' || s.category === 'business',
  travel:        (s) => s.category === 'travel',
};

// Extra specialty sources per category — these feed entire specialty tabs
const SPECIALTY_SOURCES: Record<string, Source[]> = {
  technology: [
    { name: 'Disrupt Africa', url: 'https://disrupt-africa.com/feed/', country: 'Pan-Africa' },
    { name: 'Wimbart', url: 'https://wimbart.com/feed/', country: 'Pan-Africa' },
    { name: 'Africa Tech Summit', url: 'https://www.africatechsummit.com/feed/', country: 'Pan-Africa' },
    { name: 'Tele.net Africa', url: 'https://telecoms.com/feed/?cat=africa', country: 'Pan-Africa' },
    { name: 'Digit Africa', url: 'https://digitafrica.co/feed/', country: 'Pan-Africa' },
    { name: 'Africa Tech', url: 'https://africatech.news/feed/', country: 'Pan-Africa' },
    { name: 'Startups Africa', url: 'https://startups.ng/feed/', country: 'Nigeria' },
    { name: 'WeeTracker', url: 'https://weetracker.com/feed/', country: 'Pan-Africa' },
    { name: 'Techish KE', url: 'https://techish.co.ke/feed/', country: 'Kenya' },
    { name: 'The Nerve Africa', url: 'https://www.thenerveafrica.com/feed/', country: 'Pan-Africa' },
    { name: 'TechLoy', url: 'https://www.techloy.com/feed/', country: 'Pan-Africa' },
    { name: 'Space in Africa', url: 'https://spaceinafrica.com/feed/', country: 'Pan-Africa' },
  ],
  health: [
    { name: 'AllAfrica Health', url: 'https://allafrica.com/tools/headlines/rdf/health/headlines.rdf', country: 'Pan-Africa' },
    { name: 'Devex Africa Health', url: 'https://www.devex.com/news/health-rss.xml', country: 'Pan-Africa' },
    { name: 'Africa Health Org', url: 'https://www.africa-health.com/feed/', country: 'Pan-Africa' },
    { name: 'WHO AFRO News', url: 'https://www.afro.who.int/rss.xml', country: 'Pan-Africa' },
    { name: 'Africa CDC', url: 'https://africacdc.org/feed/', country: 'Pan-Africa' },
    { name: 'Global Health Africa', url: 'https://globalhealthafrica.com/feed/', country: 'Pan-Africa' },
    { name: 'Pulse Health NG', url: 'https://www.pulse.ng/lifestyle/health/feed/', country: 'Nigeria' },
    { name: 'Health Africa', url: 'https://healthafrica.com.ng/feed/', country: 'Nigeria' },
    { name: 'Medscape Africa', url: 'https://www.medscape.com/cx/rssfeeds/2669.xml', country: 'Pan-Africa' },
  ],
  sports: [
    { name: 'AllAfrica Sports', url: 'https://allafrica.com/tools/headlines/rdf/sport/headlines.rdf', country: 'Pan-Africa' },
    { name: 'Pulse Sports NG', url: 'https://www.pulse.ng/sports/feed/', country: 'Nigeria' },
    { name: 'KickOff SA', url: 'https://www.kickoff.com/rss', country: 'South Africa' },
    { name: 'CAF Online', url: 'https://www.cafonline.com/rss.xml', country: 'Pan-Africa' },
    { name: 'SuperSport', url: 'https://supersport.com/football/feed/', country: 'Pan-Africa' },
    { name: 'Complete Sports NG', url: 'https://completesports.com/feed/', country: 'Nigeria' },
    { name: 'SportsPesa News', url: 'https://blog.sportpesa.com/feed/', country: 'Kenya' },
    { name: 'Soccer Laduma SA', url: 'https://www.soccerladuma.co.za/rss/index', country: 'South Africa' },
    { name: 'Brila FM', url: 'https://www.brila.net/feed/', country: 'Nigeria' },
    { name: 'GHANAsoccernet', url: 'https://ghanasoccernet.com/feed/', country: 'Ghana' },
    { name: 'CafOnline Sports', url: 'https://www.cafonline.com/rss-news', country: 'Pan-Africa' },
    { name: 'Sports Africa GH', url: 'https://www.sportsafrika.net/feed/', country: 'Pan-Africa' },
    { name: 'Footy Africa', url: 'https://footyafrica.com/feed/', country: 'Pan-Africa' },
    { name: 'African Sports', url: 'https://africansports.net/feed/', country: 'Pan-Africa' },
  ],
  agriculture: [
    { name: 'AllAfrica Agriculture', url: 'https://allafrica.com/tools/headlines/rdf/agric/headlines.rdf', country: 'Pan-Africa' },
    { name: 'Farmers Review Africa', url: 'https://farmersreviewafrica.com/feed/', country: 'Pan-Africa' },
    { name: 'Agrilinks', url: 'https://www.agrilinks.org/rss.xml', country: 'Pan-Africa' },
    { name: 'Africa Agriculture', url: 'https://africaagriculture.net/feed/', country: 'Pan-Africa' },
    { name: 'FAO Africa', url: 'https://www.fao.org/africa/news/en/rss.xml', country: 'Pan-Africa' },
    { name: 'Agri Investor Africa', url: 'https://www.agriinvestor.com/feed/', country: 'Pan-Africa' },
    { name: 'AgroPages Africa', url: 'https://agropage.net/rss.xml', country: 'Pan-Africa' },
    { name: 'Farm Africa Blog', url: 'https://www.farmafrica.org/feed', country: 'Pan-Africa' },
    { name: 'Africa Food Journal', url: 'https://africafoodjournal.com/feed/', country: 'Pan-Africa' },
    { name: 'Kenya Farmers', url: 'https://farmersportal.co.ke/feed/', country: 'Kenya' },
    { name: 'AgriRoots Africa', url: 'https://agrirootsafrica.com/feed/', country: 'Pan-Africa' },
  ],
  entertainment: [
    { name: 'Afrobeats Intelligence', url: 'https://www.afrobeatsintelligence.com/feed/', country: 'Pan-Africa' },
    { name: 'WillisWorld', url: 'https://www.willisworld.co.za/feed/', country: 'South Africa' },
    { name: 'JustNaija', url: 'https://www.justnaija.com/feed/', country: 'Nigeria' },
    { name: 'Zim Hip Hop', url: 'https://www.zimhiphop.com/feed/', country: 'Zimbabwe' },
    { name: 'Native Magazine', url: 'https://nativemagazine.com/feed/', country: 'Nigeria' },
    { name: 'Afropop Worldwide', url: 'https://www.afropop.org/feed/', country: 'Pan-Africa' },
    { name: 'Zambia Entertainment', url: 'https://entertainmentzambia.com/feed/', country: 'Zambia' },
    { name: 'Ghana Showbiz', url: 'https://www.pulse.com.gh/entertainment/feed/', country: 'Ghana' },
    { name: 'FilmAfrica', url: 'https://filmafrica.co.za/feed/', country: 'South Africa' },
    { name: 'Nollywood Films', url: 'https://nollywood.net/feed/', country: 'Nigeria' },
    { name: 'Cinema Escapist Africa', url: 'https://www.cinescapist.com/africa/feed/', country: 'Pan-Africa' },
    { name: 'African HipHop', url: 'https://africanhiphop.com/feed/', country: 'Pan-Africa' },
    { name: 'Konbini Africa', url: 'https://www.konbini.com/en/africa/feed/', country: 'Pan-Africa' },
  ],
  finance: [
    { name: 'Nairametrics', url: 'https://nairametrics.com/feed/', country: 'Nigeria' },
    { name: 'Fin24', url: 'https://www.news24.com/fin24/rss', country: 'South Africa' },
    { name: 'Moneyweb SA', url: 'https://www.moneyweb.co.za/feed/', country: 'South Africa' },
    { name: 'Africa Finance', url: 'https://africafinance.org/feed/', country: 'Pan-Africa' },
    { name: 'Invest Africa', url: 'https://www.investafrica.com/feed/', country: 'Pan-Africa' },
    { name: 'DealMakers Africa', url: 'https://www.dealmakersmag.co.za/feed/', country: 'South Africa' },
    { name: 'AllAfrica Finance', url: 'https://allafrica.com/tools/headlines/rdf/economy/headlines.rdf', country: 'Pan-Africa' },
    { name: 'African Banker', url: 'https://www.africanbankermag.com/feed/', country: 'Pan-Africa' },
    { name: 'This Is Africa Finance', url: 'https://thisisafrica.me/feed/', country: 'Pan-Africa' },
    { name: 'IC Publications Finance', url: 'https://www.icpublications.com/feed/', country: 'Pan-Africa' },
  ],
  travel: [
    { name: 'Africa Geographic', url: 'https://africageographic.com/blog/feed/', country: 'Pan-Africa' },
    { name: 'Travel Africa', url: 'https://www.travelafricamag.com/feed/', country: 'Pan-Africa' },
    { name: 'Nomadic Matt Africa', url: 'https://www.nomadicmatt.com/category/africa/feed/', country: 'Pan-Africa' },
    { name: 'Africa Tourism', url: 'https://www.africa-tourism.com/feed/', country: 'Pan-Africa' },
    { name: 'Wild Africa', url: 'https://wildafrica.net/feed/', country: 'Pan-Africa' },
    { name: 'Migrationology Africa', url: 'https://migrationology.com/category/africa/feed/', country: 'Pan-Africa' },
    { name: 'The Discoverer Africa', url: 'https://www.thediscoverer.com/blog/africa/feed/', country: 'Pan-Africa' },
    { name: 'Responsible Travel', url: 'https://www.responsibletravel.com/copy/rss', country: 'Pan-Africa' },
    { name: 'Lonely Planet Africa', url: 'https://www.lonelyplanet.com/africa.rss', country: 'Pan-Africa' },
    { name: 'Afar Africa', url: 'https://www.afar.com/magazine/africa/rss', country: 'Pan-Africa' },
    { name: 'SafariBookings Blog', url: 'https://blog.safaribookings.com/feed/', country: 'Pan-Africa' },
    { name: 'Visit Africa', url: 'https://visitafrica.site/feed/', country: 'Pan-Africa' },
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary?: string;
  image?: string;
  source: string;
  country: string;
  category: string;
  publishedAt: string;
  lang?: string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────
const cache = new Map<string, { items: NewsItem[]; fetchedAt: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function extractImage(item: Record<string, unknown>): string {
  // Try multiple image locations in RSS feeds
  const mt = item['mediaThumbnail'] as { url?: string; $?: { url?: string } } | undefined;
  if (mt?.url) return mt.url;
  if (mt?.$?.url) return mt.$.url;

  const mc = item['mediaContent'] as { $?: { url?: string } } | undefined;
  if (mc?.$?.url) return mc.$.url;

  const enc = item['enclosure'] as { url?: string; type?: string } | undefined;
  if (enc?.url && enc?.type?.startsWith('image')) return enc.url;

  // Try to extract from content
  const content = (item['content'] || item['content:encoded'] || '') as string;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (match?.[1]) return match[1];

  return '';
}

// Max articles fetched per individual source — keeps high-volume feeds (Punch, etc.) from dominating
const MAX_PER_SOURCE = 6;

async function fetchSources(sources: Source[], category: string): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    sources.map(async (src): Promise<NewsItem[]> => {
      try {
        const feed = await parser.parseURL(src.url);
        return (feed.items || []).slice(0, MAX_PER_SOURCE).map((item, i): NewsItem => ({
          id: `${src.name}-${i}-${Date.now()}`,
          title: (item.title || '').replace(/<[^>]+>/g, '').trim(),
          link: item.link || item.guid || '',
          summary: (item.contentSnippet || item.content?.replace(/<[^>]+>/g, '') || '').slice(0, 300),
          image: extractImage(item as unknown as Record<string, unknown>),
          source: src.name,
          country: src.country,
          category,
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          lang: src.lang || 'en',
        }));
      } catch {
        return [];
      }
    })
  );

  const allItems = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(item => item.title && item.link);

  // ── Source diversity: interleave articles round-robin so no single outlet dominates ──
  // Group by source, then zip (take 1 from each source in turn)
  const bySource = new Map<string, NewsItem[]>();
  for (const item of allItems) {
    if (!bySource.has(item.source)) bySource.set(item.source, []);
    bySource.get(item.source)!.push(item);
  }

  const interleaved: NewsItem[] = [];
  const queues = Array.from(bySource.values());
  let maxLen = Math.max(...queues.map(q => q.length));
  for (let i = 0; i < maxLen; i++) {
    for (const q of queues) {
      if (q[i]) interleaved.push(q[i]);
    }
  }

  return interleaved;
}

export async function fetchCategory(category: string): Promise<NewsItem[]> {
  const cached = cache.get(category);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.items;

  // Select sources for category
  const filter = CATEGORY_MAP[category] || CATEGORY_MAP.general;
  const baseSources = ALL_SOURCES.filter(filter);
  const specialty = SPECIALTY_SOURCES[category] || [];

  // For general — spread across countries; cap at 60 sources to avoid timeout
  const generalSources = ALL_SOURCES.filter(s => !s.category || s.category === 'general');
  const shuffledGeneral = generalSources.sort(() => Math.random() - 0.5).slice(0, 60);

  // For specialty categories: use explicitly-tagged sources + specialty-only feeds.
  // De-dupe by URL so the same feed isn't fetched twice.
  const seenUrls = new Set<string>();
  const combined = [...baseSources, ...specialty].filter(s => {
    if (seenUrls.has(s.url)) return false;
    seenUrls.add(s.url);
    return true;
  });

  const selected = category === 'general' ? shuffledGeneral : combined;

  // MAX articles any single source may contribute to the final feed
  const MAX_PER_SOURCE_IN_FEED = 3;

  const raw = await fetchSources(selected, category);

  // Deduplicate by title prefix, then enforce per-source cap
  const seen = new Set<string>();
  const sourceCounts = new Map<string, number>();
  const items = raw
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter(item => {
      const titleKey = item.title.toLowerCase().slice(0, 60);
      if (seen.has(titleKey)) return false;
      seen.add(titleKey);
      const count = sourceCounts.get(item.source) ?? 0;
      if (count >= MAX_PER_SOURCE_IN_FEED) return false;
      sourceCounts.set(item.source, count + 1);
      return true;
    });

  cache.set(category, { items, fetchedAt: Date.now() });

  // Archive non-expired items to DB (fire-and-forget)
  archiveItems(items, category).catch(() => {});

  return items;
}

// ── Archive to DB ─────────────────────────────────────────────────────────────
// Called fire-and-forget on every cache refresh.
// Uses createMany + skipDuplicates so re-runs are safe.
async function archiveItems(items: NewsItem[], _category: string) {
  if (!items.length) return;
  try {
    await (prisma as any).newsArchive.createMany({
      data: items.map(item => ({
        id: crypto.randomUUID(),
        title: item.title.slice(0, 500),
        link: item.link.slice(0, 2000),
        summary: item.summary ? item.summary.slice(0, 600) : null,
        image: item.image ? item.image.slice(0, 2000) : null,
        source: item.source,
        country: item.country,
        category: item.category,
        publishedAt: new Date(item.publishedAt),
        lang: item.lang || 'en',
      })),
      skipDuplicates: true,
    });
  } catch {
    // ignore — archive is best-effort, never block news delivery
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/categories', (_req, res) => {
  res.json([
    { id: 'general',       label: 'Top Stories',    emoji: '🌍' },
    { id: 'politics',      label: 'Politics',        emoji: '🏛️' },
    { id: 'business',      label: 'Business',        emoji: '📈' },
    { id: 'technology',    label: 'Technology',      emoji: '💻' },
    { id: 'health',        label: 'Health',          emoji: '🏥' },
    { id: 'sports',        label: 'Sports',          emoji: '⚽' },
    { id: 'entertainment', label: 'Entertainment',   emoji: '🎭' },
    { id: 'agriculture',   label: 'Agriculture',     emoji: '🌾' },
    { id: 'finance',       label: 'Finance',         emoji: '💰' },
    { id: 'travel',        label: 'Travel',          emoji: '✈️' },
  ]);
});

// GET /news?category=general&limit=60&country=Nigeria&lang=fr
router.get('/', async (req, res) => {
  const { category = 'general', limit = '60', country, lang } = req.query as Record<string, string>;

  if (!CATEGORY_MAP[category]) {
    return res.status(400).json({ error: `Unknown category: ${category}` });
  }

  try {
    let items = await fetchCategory(category);

    if (country) {
      items = items.filter(i =>
        i.country.toLowerCase().includes(country.toLowerCase()) ||
        ['Pan-Africa', 'Africa'].includes(i.country)
      );
    }
    if (lang) {
      items = items.filter(i => i.lang === lang || i.lang === 'en');
    }

    const selectedSources = category === 'general'
      ? ALL_SOURCES.filter(s => !s.category).slice(0, 40)
      : ALL_SOURCES.filter(CATEGORY_MAP[category] || (() => true));

    res.json({
      category,
      total: items.length,
      items: items.slice(0, parseInt(limit)),
      sources: [...new Map(
        selectedSources.map(s => [s.name, { name: s.name, country: s.country }])
      ).values()],
      cachedAt: cache.get(category)?.fetchedAt
        ? new Date(cache.get(category)!.fetchedAt).toISOString()
        : null,
    });
  } catch (err) {
    console.error('News fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// GET /news/all — latest across all categories (for homepage widget)
router.get('/all', async (_req, res) => {
  const categories = ['general', 'business', 'technology', 'sports', 'entertainment'];
  const results = await Promise.allSettled(categories.map(fetchCategory));

  const combined = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value.slice(0, 8))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item, idx, arr) =>
      !arr.slice(0, idx).some(prev => prev.link === item.link)
    )
    .slice(0, 40);

  res.json(combined);
});

// GET /news/archive — full-text search over persisted headlines
// ?q=query&category=general&country=Nigeria&source=Punch&from=2024-01&to=2025-12&page=1&limit=20
router.get('/archive', async (req, res) => {
  const {
    q,
    category,
    country,
    source,
    from,
    to,
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  const take = Math.min(parseInt(limit) || 20, 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  // Build where clause
  const where: Record<string, unknown> = {};
  if (q?.trim()) {
    where.OR = [
      { title:   { contains: q.trim(), mode: 'insensitive' } },
      { summary: { contains: q.trim(), mode: 'insensitive' } },
      { source:  { contains: q.trim(), mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (source)   where.source   = { contains: source, mode: 'insensitive' };
  if (country) {
    where.country = { contains: country, mode: 'insensitive' };
  }
  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to)   dateFilter.lte = new Date(to);
  if (Object.keys(dateFilter).length) where.publishedAt = dateFilter;

  try {
    const [items, total] = await Promise.all([
      (prisma as any).newsArchive.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take,
        skip,
        select: {
          id: true, title: true, link: true, summary: true,
          image: true, source: true, country: true, category: true,
          publishedAt: true, archivedAt: true, lang: true,
        },
      }),
      (prisma as any).newsArchive.count({ where }),
    ]);

    res.json({
      total,
      page: parseInt(page) || 1,
      limit: take,
      pages: Math.ceil(total / take),
      items,
    });
  } catch (err) {
    console.error('Archive query error:', err);
    res.status(500).json({ error: 'Archive search failed' });
  }
});

// GET /news/archive/stats — counts by category / country
router.get('/archive/stats', async (_req, res) => {
  try {
    const [byCategory, byCountry, total] = await Promise.all([
      (prisma as any).newsArchive.groupBy({
        by: ['category'],
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      (prisma as any).newsArchive.groupBy({
        by: ['country'],
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      (prisma as any).newsArchive.count(),
    ]);
    res.json({ total, byCategory, byCountry });
  } catch (err) {
    console.error('Archive stats error:', err);
    res.status(500).json({ error: 'Stats failed' });
  }
});

// GET /news/sources — full source registry with metadata
router.get('/sources', (_req, res) => {
  const byCountry: Record<string, Source[]> = {};
  for (const s of ALL_SOURCES) {
    if (!byCountry[s.country]) byCountry[s.country] = [];
    byCountry[s.country].push(s);
  }
  res.json({
    total: ALL_SOURCES.length,
    byCountry,
    sources: ALL_SOURCES,
  });
});

export default router;
