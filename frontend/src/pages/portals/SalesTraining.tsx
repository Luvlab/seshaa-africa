/**
 * Seshaa Sales Training — interactive course for sales reps.
 * Modules with slide-through lessons, objection cards, and scripts.
 * Progress persisted in localStorage per user.
 */
import { useState, useEffect } from 'react';
import {
  BookOpen, ChevronRight, ChevronLeft, CheckCircle, Lock,
  Zap, DollarSign, MessageCircle, Target, Shield, Star,
  TrendingUp, Users, Globe, Phone, Award, Lightbulb,
  BarChart2, X, ArrowRight,
} from 'lucide-react';

// ─── Progress helpers ─────────────────────────────────────────────────────────
const STORAGE_KEY = (uid: string) => `seshaa-training-v1-${uid}`;

function loadProgress(uid: string): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(uid)) || '{}'); }
  catch { return {}; }
}
function saveProgress(uid: string, done: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(done));
}

// ─── Course data ──────────────────────────────────────────────────────────────
interface Lesson {
  id: string;
  title: string;
  emoji: string;
  content: React.ReactNode;
}
interface Module {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  lessons: Lesson[];
}

const MODULES: Module[] = [
  // ── MODULE 1: Big Picture ──────────────────────────────────────────────────
  {
    id: 'intro',
    title: 'What Is Seshaa?',
    subtitle: 'Understand what you\'re selling',
    emoji: '🌍',
    color: 'from-green-600 to-emerald-700',
    lessons: [
      {
        id: 'intro-1',
        title: 'Africa's Digital Directory',
        emoji: '🗺️',
        content: (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-gray-900">Seshaa is Africa's answer to Google Maps + Yellow Pages + WhatsApp — built for all 54 countries.</p>
            <p className="text-gray-600">Right now, millions of African businesses — restaurants, clinics, schools, hotels, garages — are invisible online. A customer two streets away can't find them. They lose business every single day.</p>
            <p className="text-gray-600">Seshaa fixes that. One searchable directory for the entire continent, in every local language, with WhatsApp contact, booking, and advertising built in.</p>
            <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
              <p className="font-bold text-green-800 mb-2">🔑 Your opening line:</p>
              <p className="text-green-700 italic">"Imagine a customer in your city searching for a restaurant / clinic / hotel right now — will they find YOUR business, or your competitor's?"</p>
            </div>
          </div>
        ),
      },
      {
        id: 'intro-2',
        title: 'The Opportunity',
        emoji: '📈',
        content: (
          <div className="space-y-4">
            <p className="text-gray-600">Less than 5% of African SMEs have a proper online presence. The other 95% are your clients.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { n: '54',   label: 'Countries we cover' },
                { n: '1B+',  label: 'People we can reach' },
                { n: '95%',  label: 'Of African businesses not properly online' },
                { n: '20%',  label: 'Commission — yours to keep' },
              ].map(s => (
                <div key={s.n} className="bg-white rounded-2xl border p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-purple-700">{s.n}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
              <p className="font-bold text-purple-800 mb-1">💸 The maths:</p>
              <p className="text-purple-700 text-sm">Close 3 Gold listings ($9/mo each) + 1 ad package ($79.99) = <strong>$85.40/week</strong>. That's over <strong>$350/month</strong> from one good week of work.</p>
            </div>
          </div>
        ),
      },
      {
        id: 'intro-3',
        title: 'Seshaa\'s Full Product Suite',
        emoji: '🛍️',
        content: (
          <div className="space-y-3">
            <p className="text-gray-600 text-sm">You can sell ALL of these — commission applies to everything.</p>
            {[
              { icon: '📍', title: 'Directory Listings',      desc: 'Silver (free) → Gold ($9/mo) → Diamond ($19/mo)' },
              { icon: '📢', title: 'Advertising Packages',    desc: 'Starter ($9.99) to Premium ($999) — banner, sponsored, featured' },
              { icon: '🛒', title: 'Seshaa Market',           desc: 'E-commerce listings for Gold/Diamond businesses' },
              { icon: '📅', title: 'Events',                  desc: 'Businesses can promote events to local audiences' },
              { icon: '💬', title: 'Classifieds',             desc: 'Buy/sell/rent ads — individual and business' },
              { icon: '📊', title: 'Price Comparison',        desc: 'Fuel, food, transport costs — community-verified' },
              { icon: '📰', title: 'Local News',              desc: '100+ African news sources, per-country feeds' },
              { icon: '🎵', title: 'Seshaa Radio',            desc: 'African music streaming — promotional slots available' },
            ].map(p => (
              <div key={p.icon} className="flex items-start gap-3 bg-white rounded-xl border p-3">
                <span className="text-2xl shrink-0">{p.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{p.title}</p>
                  <p className="text-xs text-gray-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  // ── MODULE 2: Directory Listings ───────────────────────────────────────────
  {
    id: 'listings',
    title: 'Directory Listings',
    subtitle: 'Your primary product — $9 & $19/month',
    emoji: '📍',
    color: 'from-blue-600 to-indigo-700',
    lessons: [
      {
        id: 'listings-1',
        title: 'The Three Tiers',
        emoji: '🏅',
        content: (
          <div className="space-y-3">
            {[
              {
                tier: '🥈 Silver',  price: 'Free',    color: 'border-gray-200 bg-gray-50',
                features: ['Name, phone & city', 'Category', 'Searchable', '1 photo'],
                pitch: 'Use this to get the foot in the door. Sign them up free — then upgrade next week.',
              },
              {
                tier: '🥇 Gold',    price: '$9/mo',   color: 'border-yellow-300 bg-yellow-50',
                features: ['Website + WhatsApp link', '10 photos', 'Opening hours', 'Verified badge ✓', 'Analytics'],
                pitch: 'This is your volume product. 9 dollars is nothing — it\'s less than a bag of rice.',
              },
              {
                tier: '💎 Diamond', price: '$19/mo',  color: 'border-blue-300 bg-blue-50',
                features: ['Featured placement', 'Online bookings', 'QR code sticker', 'Priority in search'],
                pitch: 'Sell this to clinics, hotels, restaurants with tables to fill. The bookings feature alone pays for it.',
              },
            ].map(t => (
              <div key={t.tier} className={`rounded-2xl border-2 ${t.color} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-black text-gray-900">{t.tier}</p>
                  <p className="font-black text-purple-700 text-lg">{t.price}</p>
                </div>
                <ul className="space-y-1 mb-2">
                  {t.features.map(f => (
                    <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <CheckCircle size={11} className="text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="bg-white/70 rounded-xl p-2.5 mt-1">
                  <p className="text-xs font-semibold text-blue-700">💬 Your pitch: <span className="font-normal text-gray-700">"{t.pitch}"</span></p>
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'listings-2',
        title: 'The $9 Conversation',
        emoji: '💰',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Gold at $9/month is your bread and butter. Here's how to talk about it:</p>
            <div className="space-y-3">
              {[
                {
                  situation: 'Small restaurant / chop bar',
                  script: '"If one extra customer finds you on Seshaa each week because of your listing, and they spend just $3 — that\'s $12 a month. You\'re paying $9. You\'re already in profit before we even start counting."',
                },
                {
                  situation: 'Pharmacy / clinic',
                  script: '"Patients Google clinics and pharmacies all the time. Right now, if someone searches for a pharmacy in this area, who comes up? Not you. For $9 a month you get a verified listing that shows up first in your category."',
                },
                {
                  situation: 'School',
                  script: '"Parents search for schools when they move to a new area. For $9 a month, your school shows up with photos, your curriculum, contact details, and a map. How many new pupils is that worth?"',
                },
              ].map(s => (
                <div key={s.situation} className="bg-white rounded-2xl border p-4">
                  <p className="text-xs font-bold text-purple-600 uppercase mb-1.5">{s.situation}</p>
                  <p className="text-sm text-gray-700 italic">"{s.script}"</p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'listings-3',
        title: 'The Diamond Upsell',
        emoji: '💎',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Get them on Gold first. Come back in 2–4 weeks to upgrade to Diamond ($19/mo). By then they've seen results.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="font-bold text-blue-800 mb-2">The Diamond pitch:</p>
              <p className="text-sm text-blue-700 italic">"You've been on Gold for a few weeks — you've seen the traffic. Now imagine being the FIRST result when someone searches in your category. Diamond puts you at the top, gives you a booking button so customers can reserve directly, and gives you a QR code to put on your window — so walk-in customers can save your details instantly. That's $19 a month. Less than a tank of fuel."</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="font-bold text-green-800 mb-1">Who to target for Diamond:</p>
              <ul className="space-y-1">
                {['Hotels and guest houses', 'Restaurants with bookable tables', 'Clinics and dentists', 'Hair/beauty salons', 'Car hire companies', 'Event venues'].map(t => (
                  <li key={t} className="text-sm text-green-700 flex items-center gap-1.5"><CheckCircle size={12} className="shrink-0" /> {t}</li>
                ))}
              </ul>
            </div>
          </div>
        ),
      },
    ],
  },

  // ── MODULE 3: Advertising Packages ────────────────────────────────────────
  {
    id: 'ads',
    title: 'Advertising Packages',
    subtitle: 'Bigger deals, bigger commissions',
    emoji: '📢',
    color: 'from-orange-500 to-red-600',
    lessons: [
      {
        id: 'ads-1',
        title: 'The 6 Ad Packages',
        emoji: '💼',
        content: (
          <div className="space-y-2.5">
            <p className="text-sm text-gray-500">Your commission is 20% of the package price.</p>
            {[
              { name: 'Starter',     price: '$9.99',  days: '7 days',  reach: '5k–20k',  who: 'Local shops, market stalls', your: '$2' },
              { name: 'Boost',       price: '$29.99', days: '30 days', reach: '50k–200k', who: 'City-level businesses', your: '$6' },
              { name: 'Pro',         price: '$79.99', days: '30 days', reach: '100k–500k', who: 'Clinics, hotels, schools', your: '$16' },
              { name: 'Growth',      price: '$199',   days: '30 days', reach: '300k–1M',  who: 'Multi-branch businesses', your: '$40' },
              { name: 'Continental', price: '$499',   days: '30 days', reach: '1M–5M',   who: 'Banks, telcos, NGOs', your: '$100' },
              { name: 'Premium',     price: '$999',   days: '30 days', reach: '5M+',     who: 'Corporates, embassies, brands', your: '$200' },
            ].map(p => (
              <div key={p.name} className="flex items-center gap-3 bg-white rounded-xl border p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                    <span className="font-black text-purple-700 text-sm">{p.price}</span>
                  </div>
                  <p className="text-xs text-gray-400">{p.days} · {p.reach} views · {p.who}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Your cut</p>
                  <p className="font-black text-green-600">{p.your}</p>
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'ads-2',
        title: 'Who to Sell Ads To',
        emoji: '🎯',
        content: (
          <div className="space-y-3">
            {[
              {
                segment: 'Starter & Boost ($9.99–$29.99)',
                color: 'bg-gray-50 border-gray-200',
                targets: ['Corner shops wanting more walk-ins', 'Market stall holders', 'New businesses launching', 'Food vendors and caterers'],
                hook: '"For less than the cost of a flyer print-run, 50,000 people see your business all month."',
              },
              {
                segment: 'Pro & Growth ($79.99–$199)',
                color: 'bg-blue-50 border-blue-200',
                targets: ['Private clinics and hospitals', 'Hotels and lodges', 'Insurance brokers and agents', 'Real estate agents', 'Schools and training centres'],
                hook: '"Your competitor is already running ads. You can out-rank them on Seshaa for $79 a month."',
              },
              {
                segment: 'Continental & Premium ($499–$999)',
                color: 'bg-orange-50 border-orange-200',
                targets: ['Banks and microfinance institutions', 'Telecom companies (MTN, Airtel, etc.)', 'NGOs and donor organisations', 'Government agencies', 'Pan-African brands'],
                hook: '"One million African consumers will see your campaign this month. That\'s brand awareness at a fraction of billboard cost."',
              },
            ].map(s => (
              <div key={s.segment} className={`rounded-2xl border p-4 ${s.color}`}>
                <p className="font-bold text-gray-900 text-sm mb-2">{s.segment}</p>
                <ul className="space-y-1 mb-3">
                  {s.targets.map(t => (
                    <li key={t} className="text-xs text-gray-600 flex items-center gap-1.5"><Target size={10} className="text-orange-500 shrink-0" /> {t}</li>
                  ))}
                </ul>
                <p className="text-xs italic text-gray-600">"{s.hook}"</p>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'ads-3',
        title: 'Stacking Deals',
        emoji: '🏗️',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">The best strategy: sell a listing first (easy yes), then upgrade to an ad package (second conversation). Here's the ladder:</p>
            <div className="space-y-2">
              {[
                { step: '1', action: 'Sign them up Silver',       value: 'Free — zero resistance. Get contact.', icon: '🥈' },
                { step: '2', action: 'Upgrade to Gold',           value: '$9/mo → your cut: $1.80/mo forever', icon: '🥇' },
                { step: '3', action: 'Add a Starter ad boost',    value: '$9.99 → your cut: $2', icon: '📢' },
                { step: '4', action: 'Propose a Pro campaign',    value: '$79.99 → your cut: $16', icon: '🚀' },
                { step: '5', action: 'Upgrade listing to Diamond',value: '$19/mo → your cut: $3.80/mo forever', icon: '💎' },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3 bg-white rounded-xl border p-3">
                  <span className="text-2xl shrink-0">{s.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Step {s.step}: {s.action}</p>
                    <p className="text-xs text-green-600 font-medium">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4">
              <p className="font-bold text-yellow-800 mb-1">💡 Recurring income:</p>
              <p className="text-sm text-yellow-700">Listings pay you every month without re-selling. 50 Gold clients = $90/month passive. 20 Diamond clients = $76/month. Stack both = <strong>$166+ recurring</strong>.</p>
            </div>
          </div>
        ),
      },
    ],
  },

  // ── MODULE 4: Opening Conversations ───────────────────────────────────────
  {
    id: 'openers',
    title: 'Opening Conversations',
    subtitle: 'How to start the pitch — scripts that work',
    emoji: '💬',
    color: 'from-violet-600 to-purple-700',
    lessons: [
      {
        id: 'openers-1',
        title: 'Walk-In Cold Approach',
        emoji: '🚶',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Walk into any business — restaurant, clinic, shop, hotel. Here's the exact script:</p>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-purple-600 uppercase mb-3">Script — Walk-In</p>
              <div className="space-y-2">
                {[
                  { who: 'You', line: '"Good morning / afternoon. My name is [name], I work with Seshaa Africa. Is the owner or manager around for just 2 minutes?"' },
                  { who: 'You (after intro)', line: '"I\'m sure you\'ve seen Google Maps and how it helps people find businesses. Seshaa is doing the same thing for ALL 54 African countries — and right now, your business isn\'t on it yet."' },
                  { who: 'You (pause, let that land)', line: '"I can add you today — it takes 5 minutes and the basic listing is completely free. Would you like to be found by people looking for [category] in [city] right now?"' },
                  { who: 'You (if yes)', line: '"Perfect. Let me show you the app — you\'ll be live in minutes. And I can show you how to upgrade for about the cost of a cup of coffee a day."' },
                ].map((l, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border">
                    <p className="text-[10px] font-bold text-purple-500 mb-1">{l.who}</p>
                    <p className="text-sm text-gray-700 italic">{l.line}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-sm font-semibold text-yellow-800">⚡ Key technique: Always ask for the owner, not staff. And never say "I want to sell you something" — say "I want to show you something."</p>
            </div>
          </div>
        ),
      },
      {
        id: 'openers-2',
        title: 'WhatsApp First Message',
        emoji: '📱',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Most deals in Africa happen on WhatsApp. Here are proven opening messages:</p>
            <div className="space-y-3">
              {[
                {
                  label: 'Template 1 — Short & Direct',
                  msg: 'Good morning 👋 My name is [Name]. I help businesses in [City] get found online through Seshaa Africa — a free directory covering all 54 African countries. I noticed [Business Name] isn\'t listed yet. Can I add you today? It\'s free and takes 5 minutes.',
                },
                {
                  label: 'Template 2 — Question Hook',
                  msg: 'Hi! Quick question — when someone in [City] searches for [their category] on their phone, will they find you? 🤔 I work with Seshaa Africa and I\'d love to help you be the first result. Takes 5 minutes. Do you have a moment?',
                },
                {
                  label: 'Template 3 — Social Proof',
                  msg: 'Hello 👋 I just helped [a restaurant / clinic / school] in [city] get their first 50 online enquiries in one week through Seshaa. They\'re now getting 3–5 new customers a week who found them online. I\'d love to do the same for you. Can I show you?',
                },
              ].map(t => (
                <div key={t.label} className="bg-white rounded-2xl border p-4">
                  <p className="text-xs font-bold text-violet-600 mb-2">{t.label}</p>
                  <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                    <p className="text-sm text-gray-800 leading-relaxed">{t.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'openers-3',
        title: 'Phone Call Opener',
        emoji: '📞',
        content: (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-purple-600 uppercase mb-3">Phone Script</p>
              <div className="space-y-2">
                {[
                  { who: 'Opening', line: '"Good morning, am I speaking with the owner of [Business Name]? My name is [name] — I\'m a Seshaa Africa representative in [City]."' },
                  { who: 'Why calling', line: '"I noticed your business isn\'t yet on Seshaa — we\'re Africa\'s largest directory, and people in [City] are already searching for [category] businesses like yours."' },
                  { who: 'The ask', line: '"It would take just 5 minutes to list you — for free. I can come by today or tomorrow morning, whichever is better. Which works for you?"' },
                ].map((l, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border">
                    <p className="text-[10px] font-bold text-purple-500 mb-1">{l.who}</p>
                    <p className="text-sm text-gray-700 italic">{l.line}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-700">💡 Pro tips for phone calls:</p>
              {[
                'Call between 10am–12pm or 2pm–4pm — avoid lunch hour and early morning rush',
                'If they say "call back later" — get a specific time: "Is 2pm tomorrow good?"',
                'Never pitch on the first call — the goal is just to book a meeting',
                'If they\'re too busy, WhatsApp them immediately after with Template 1',
              ].map(tip => (
                <div key={tip} className="flex items-start gap-2 text-sm text-gray-600 bg-white rounded-xl border p-3">
                  <Lightbulb size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },

  // ── MODULE 5: Objection Handling ───────────────────────────────────────────
  {
    id: 'objections',
    title: 'Handling Objections',
    subtitle: 'Turn every "no" into a "yes"',
    emoji: '🛡️',
    color: 'from-red-600 to-rose-700',
    lessons: [
      {
        id: 'obj-1',
        title: '"We don\'t need this"',
        emoji: '🙅',
        content: (
          <div className="space-y-3">
            {[
              {
                objection: '"We already have enough customers."',
                reframe: '"That\'s great — it means you have a good product! Seshaa isn\'t about replacing your customers, it\'s about making sure you don\'t LOSE them when they can\'t find you. What happens when a loyal customer moves away and wants to recommend you to a friend? If you\'re not online, that referral goes to your competitor."',
              },
              {
                objection: '"We get all our business through word of mouth."',
                reframe: '"Word of mouth is powerful — and Seshaa makes it digital. When your happy customer tells a friend, that friend searches for you. If you\'re not there, the recommendation dies. Seshaa turns a verbal referral into a confirmed booking."',
              },
              {
                objection: '"I don\'t use the internet for my business."',
                reframe: '"You don\'t have to. Your customers do. People looking for you RIGHT NOW are using their phones. This isn\'t about you using the internet — it\'s about your customers finding you when they\'re looking."',
              },
            ].map(o => (
              <div key={o.objection} className="bg-white rounded-2xl border p-4">
                <div className="bg-red-50 rounded-xl p-3 mb-3 border border-red-100">
                  <p className="text-sm font-semibold text-red-700">They say: {o.objection}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <p className="text-xs font-bold text-green-600 mb-1">You say:</p>
                  <p className="text-sm text-green-800 italic">{o.reframe}</p>
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'obj-2',
        title: '"It\'s too expensive"',
        emoji: '💸',
        content: (
          <div className="space-y-3">
            {[
              {
                objection: '"$9 is too much per month."',
                reframe: '"Let me put it this way — $9 is 30 cents a day. That\'s less than a sachet of water. If Seshaa brings you even ONE new customer a month, you\'ve paid for it ten times over. And the Gold listing shows your WhatsApp, your photos, your opening hours, and your reviews. Would you spend 30 cents a day to be found by thousands of people?"',
              },
              {
                objection: '"I can\'t afford advertising right now."',
                reframe: '"Completely understand. That\'s why I want to start with the free Silver listing — zero cost, zero risk. You get listed today at no charge. Then when business picks up (partly because of Seshaa!), we talk about upgrading. Fair enough?"',
              },
              {
                objection: '"Facebook is free — why pay for Seshaa?"',
                reframe: '"Facebook is great for people who already follow you. Seshaa is for people searching for something RIGHT NOW. When someone types \'dentist near me\' or \'hotel in Accra\', they\'re not on Facebook — they\'re on a directory. That\'s where Seshaa is different. You need both."',
              },
            ].map(o => (
              <div key={o.objection} className="bg-white rounded-2xl border p-4">
                <div className="bg-red-50 rounded-xl p-3 mb-3 border border-red-100">
                  <p className="text-sm font-semibold text-red-700">They say: {o.objection}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <p className="text-xs font-bold text-green-600 mb-1">You say:</p>
                  <p className="text-sm text-green-800 italic">{o.reframe}</p>
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'obj-3',
        title: '"Let me think about it"',
        emoji: '🤔',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">"Let me think about it" almost always means "I need more information" or "I don\'t see the urgency." Here's how to handle it:</p>
            <div className="space-y-3">
              {[
                {
                  response: 'Find the real objection',
                  line: '"Of course! While you think — is there a specific concern I can help clarify? Is it the price, or is it something about the platform you\'re not sure about?"',
                },
                {
                  response: 'Create soft urgency',
                  line: '"Absolutely. Just so you know — I\'m signing up businesses in your area this week, and the first ones get listed higher up in search results. The later you join, the lower your position versus competitors who are already on. I\'ll check back Thursday — will you be in?"',
                },
                {
                  response: 'Lower the barrier',
                  line: '"No pressure at all. How about I just set up the free Silver listing now — no cost, no commitment — so you can see what it looks like? Then you decide about Gold in your own time."',
                },
              ].map(r => (
                <div key={r.response} className="bg-white rounded-2xl border p-4">
                  <p className="text-xs font-bold text-violet-600 mb-2">Strategy: {r.response}</p>
                  <p className="text-sm text-gray-700 italic">"{r.line}"</p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'obj-4',
        title: '"Nobody here uses the internet"',
        emoji: '📡',
        content: (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-blue-800 mb-2">The facts (use these):</p>
              <ul className="space-y-1">
                {[
                  'Africa has 600M+ smartphone users — growing every year',
                  'Mobile data costs are falling — more people go online daily',
                  'Young Africans (18–35) search for businesses on their phones constantly',
                  'Even rural areas are getting mobile coverage',
                  'Your customers\' CHILDREN search online and recommend to their parents',
                ].map(f => (
                  <li key={f} className="text-sm text-blue-700 flex items-start gap-1.5"><Globe size={12} className="mt-1 shrink-0" /> {f}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl border p-4">
              <p className="text-xs font-bold text-green-600 mb-2">Your reply:</p>
              <p className="text-sm text-gray-700 italic">"I understand — but let me show you something. Take out your phone right now. Search for [their business type] in [city]. You\'ll see other businesses showing up. Those are your competitors getting customers you\'re not seeing. The question isn\'t whether people use the internet here — it\'s whether your COMPETITORS are using it. They are. You should be too."</p>
            </div>
          </div>
        ),
      },
    ],
  },

  // ── MODULE 6: Closing & Follow-Up ─────────────────────────────────────────
  {
    id: 'closing',
    title: 'Closing & Following Up',
    subtitle: 'Lock in the deal and keep clients',
    emoji: '🤝',
    color: 'from-green-600 to-teal-700',
    lessons: [
      {
        id: 'closing-1',
        title: 'The Assumptive Close',
        emoji: '✅',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">The best close doesn\'t ask "do you want to sign up?" — it assumes they do and asks HOW, not IF.</p>
            <div className="space-y-3">
              {[
                {
                  technique: 'The "Which would you prefer" close',
                  example: '"So for the listing — would you like to start with Gold at $9 a month, or shall we go straight to Diamond and get you the featured placement at $19?"',
                  note: 'Makes it a choice between two yeses, not yes vs no.',
                },
                {
                  technique: 'The "Let\'s get you live today" close',
                  example: '"I\'ve got everything I need — your name, number, category. Let me list you right now while I\'m here. What\'s the best email for the account?"',
                  note: 'Move forward with action. Don\'t ask permission to continue.',
                },
                {
                  technique: 'The "One month trial" close',
                  example: '"Try Gold for one month. If you don\'t see a difference in how people find you, I\'ll personally remove the listing. But I know you\'ll see results. Deal?"',
                  note: 'Removes risk. 9 times out of 10 they stay after month 1.',
                },
              ].map(t => (
                <div key={t.technique} className="bg-white rounded-2xl border p-4">
                  <p className="text-xs font-bold text-teal-600 mb-2">{t.technique}</p>
                  <p className="text-sm text-gray-700 italic mb-2">"{t.example}"</p>
                  <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1">Why it works: {t.note}</p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'closing-2',
        title: 'Follow-Up System',
        emoji: '🔄',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Most sales happen on the 4th–7th contact. Here\'s your follow-up schedule:</p>
            <div className="space-y-3">
              {[
                { day: 'Day 1 (visit/call)',   action: 'Pitch. If no decision — get their WhatsApp number and send Template 1 immediately after leaving.' },
                { day: 'Day 3',                 action: 'Check in: "Hi [Name], just checking in. Have you had a moment to think about the listing?"' },
                { day: 'Day 7',                 action: 'Share value: Send them a screenshot of how many searches happened in their category that week. "I thought you\'d want to see this — 240 people searched for [category] in [city] this week alone."' },
                { day: 'Day 14',                action: 'Final push: "I\'m still holding your spot. I have 2 other [category] businesses asking to be listed in [city] — I wanted to give you first position. Shall I confirm yours?"' },
                { day: 'Month 2',               action: 'If signed: Call to review results, propose upgrade. If not signed: "Just checking in — things have moved fast in your category this month."' },
              ].map(f => (
                <div key={f.day} className="flex gap-3 bg-white rounded-xl border p-3">
                  <span className="text-xs font-bold text-teal-600 w-20 shrink-0 mt-0.5">{f.day}</span>
                  <p className="text-sm text-gray-600">{f.action}</p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'closing-3',
        title: 'Your Daily Sales Routine',
        emoji: '📆',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Top reps follow a daily system. Here\'s what works:</p>
            <div className="space-y-2">
              {[
                { time: '8:00am',  icon: '🧠', task: 'Plan your 10 targets for the day. New businesses + follow-ups from your list.' },
                { time: '9:00am',  icon: '📲', task: 'Send WhatsApp messages to 5 new businesses you found (markets, streets, estates).' },
                { time: '10:00am', icon: '🚶', task: 'Start walk-ins. Aim for at least 5 face-to-face visits before noon.' },
                { time: '12:30pm', icon: '📝', task: 'Log your morning contacts in your rep dashboard. Add notes.' },
                { time: '2:00pm',  icon: '📞', task: 'Follow-up calls on yesterday\'s leads. "Just checking in…"' },
                { time: '3:30pm',  icon: '🏢', task: '3 more walk-ins. Target a different street or area from this morning.' },
                { time: '5:30pm',  icon: '📊', task: 'Update your pipeline. Who is close to closing? What\'s blocking them?' },
                { time: '6:00pm',  icon: '💬', task: 'Chat with AI Coach for any scripts you need for tomorrow\'s targets.' },
              ].map(r => (
                <div key={r.time} className="flex items-start gap-3 bg-white rounded-xl border p-3">
                  <span className="text-lg shrink-0">{r.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-400">{r.time}</p>
                    <p className="text-sm text-gray-700">{r.task}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4">
              <p className="font-bold text-yellow-800 mb-1">🏆 The target that earns $500/month:</p>
              <p className="text-sm text-yellow-700">10 new contacts/day × 20 working days = 200 contacts. 10% close rate = 20 clients. 15 on Gold ($9) + 5 on Diamond ($19) = $230/mo recurring. 2 ad packages ($79.99 each) = $32. Total month 1: <strong>$262</strong>. Month 3 (compounding): <strong>$500+</strong>.</p>
            </div>
          </div>
        ),
      },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
interface Props { userId: string; userName?: string; onClose?: () => void; }

export default function SalesTraining({ userId, userName, onClose }: Props) {
  const [progress, setProgress] = useState<Record<string, boolean>>(() => loadProgress(userId));
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [lessonIdx,    setLessonIdx]    = useState(0);

  const totalLessons  = MODULES.reduce((s, m) => s + m.lessons.length, 0);
  const doneLessons   = Object.values(progress).filter(Boolean).length;
  const pct           = Math.round((doneLessons / totalLessons) * 100);
  const allDone       = pct === 100;

  const currentModule = MODULES.find(m => m.id === activeModule);
  const currentLesson = currentModule?.lessons[lessonIdx];

  const markDone = (lessonId: string) => {
    const next = { ...progress, [lessonId]: true };
    setProgress(next);
    saveProgress(userId, next);
  };

  const nextLesson = () => {
    if (!currentModule) return;
    markDone(currentLesson!.id);
    if (lessonIdx < currentModule.lessons.length - 1) {
      setLessonIdx(lessonIdx + 1);
    } else {
      setActiveModule(null);
      setLessonIdx(0);
    }
  };

  const prevLesson = () => {
    if (lessonIdx > 0) setLessonIdx(lessonIdx - 1);
  };

  const openModule = (id: string) => {
    const mod = MODULES.find(m => m.id === id);
    if (!mod) return;
    // Start from first incomplete lesson
    const firstIncomplete = mod.lessons.findIndex(l => !progress[l.id]);
    setLessonIdx(firstIncomplete === -1 ? 0 : firstIncomplete);
    setActiveModule(id);
  };

  // ── Lesson view ──
  if (currentModule && currentLesson) {
    const totalInModule = currentModule.lessons.length;
    const doneInModule  = currentModule.lessons.filter(l => progress[l.id]).length;

    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentModule.color} text-white px-4 py-4 flex items-center gap-3`}>
          <button onClick={() => { setActiveModule(null); setLessonIdx(0); }}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold opacity-80">{currentModule.emoji} {currentModule.title}</p>
            <p className="font-bold text-sm">{currentLesson.emoji} {currentLesson.title}</p>
          </div>
          <span className="text-xs opacity-80">{lessonIdx + 1}/{totalInModule}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/20">
          <div
            className="h-1 bg-white transition-all duration-500"
            style={{ width: `${((doneInModule + (progress[currentLesson.id] ? 0 : 1)) / totalInModule) * 100}%`, backgroundColor: 'rgba(255,255,255,0.7)' }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {currentLesson.content}
        </div>

        {/* Nav */}
        <div className="px-4 py-4 bg-white border-t flex items-center gap-3">
          <button onClick={prevLesson} disabled={lessonIdx === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border text-sm font-semibold text-gray-600 disabled:opacity-30 hover:bg-gray-50">
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={nextLesson}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${currentModule.color}`}>
            {lessonIdx < currentModule.lessons.length - 1 ? (
              <><CheckCircle size={16} /> Got it — Next <ChevronRight size={16} /></>
            ) : (
              <><CheckCircle size={16} /> Complete Module</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Module list ──
  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-4 py-6">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <X size={16} />
          </button>
        )}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
            {allDone ? '🏆' : '📚'}
          </div>
          <div>
            <h1 className="text-xl font-black">Sales Playbook</h1>
            <p className="text-purple-200 text-sm">
              {userName ? `Welcome, ${userName.split(' ')[0]}!` : 'Your training guide'}
            </p>
          </div>
        </div>
        {/* Overall progress */}
        <div className="bg-white/20 rounded-2xl p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">{allDone ? '🎉 Course Complete!' : `Progress: ${doneLessons}/${totalLessons} lessons`}</span>
            <span className="text-sm font-black">{pct}%</span>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="px-4 py-4 space-y-3">
        {MODULES.map((mod, mi) => {
          const modDone    = mod.lessons.filter(l => progress[l.id]).length;
          const modTotal   = mod.lessons.length;
          const modPct     = Math.round((modDone / modTotal) * 100);
          const isComplete = modPct === 100;
          const isLocked   = mi > 0 && !MODULES.slice(0, mi).every(m => m.lessons.every(l => progress[l.id]));

          return (
            <button key={mod.id} onClick={() => !isLocked && openModule(mod.id)}
              disabled={isLocked}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                isLocked
                  ? 'opacity-50 border-gray-200 bg-gray-50 cursor-not-allowed'
                  : isComplete
                  ? 'border-green-300 bg-green-50 hover:shadow-md'
                  : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-2xl shrink-0`}>
                  {isComplete ? '✅' : isLocked ? <Lock size={20} className="text-white" /> : mod.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{mod.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{mod.subtitle}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${mod.color} transition-all`}
                        style={{ width: `${modPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{modDone}/{modTotal}</span>
                  </div>
                </div>
                {!isLocked && (
                  <ChevronRight size={18} className={isComplete ? 'text-green-500' : 'text-gray-400'} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Certificate / completion */}
      {allDone && (
        <div className="mx-4 mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-5 text-white text-center">
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-lg font-black">Certified Seshaa Sales Rep!</p>
          <p className="text-sm opacity-90 mt-1">You've completed all training modules. Go close some deals!</p>
          <div className="mt-3 flex justify-center gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-2">
              <p className="text-xs opacity-80">Your potential</p>
              <p className="font-black">$500+/mo</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2">
              <p className="text-xs opacity-80">Commission</p>
              <p className="font-black">20%</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick reference cards */}
      <div className="px-4 pb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Reference</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <DollarSign size={16} />, title: 'Packages',   lines: ['🥈 Silver: Free', '🥇 Gold: $9/mo', '💎 Diamond: $19/mo'] },
            { icon: <TrendingUp size={16} />, title: 'Ad Budget',  lines: ['Starter: $9.99', 'Pro: $79.99', 'Premium: $999'] },
            { icon: <Award size={16} />,      title: 'Commission', lines: ['20% on all deals', 'Listings: monthly', 'Ads: per campaign'] },
            { icon: <Star size={16} />,       title: 'Daily Goal', lines: ['5 walk-ins', '5 WhatsApps', '1 close'] },
          ].map(c => (
            <div key={c.title} className="bg-white rounded-2xl border p-3">
              <div className="flex items-center gap-1.5 text-purple-600 mb-2">
                {c.icon}
                <p className="text-xs font-bold">{c.title}</p>
              </div>
              {c.lines.map(l => <p key={l} className="text-xs text-gray-600">{l}</p>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── First-Login Banner (shown until dismissed or course started) ──────────────
export function TrainingWelcomeBanner({ userId, userName, onStart }: { userId: string; userName?: string; onStart: () => void }) {
  const progress = loadProgress(userId);
  const totalLessons = MODULES.reduce((s, m) => s + m.lessons.length, 0);
  const doneLessons  = Object.values(progress).filter(Boolean).length;
  const pct = Math.round((doneLessons / totalLessons) * 100);

  const BANNER_KEY = `seshaa-training-banner-dismissed-${userId}`;
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(BANNER_KEY) && doneLessons > 0);

  const dismiss = () => {
    localStorage.setItem(BANNER_KEY, '1');
    setDismissed(true);
  };

  if (dismissed || pct === 100) return null;

  return (
    <div className="mx-4 mt-4 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-4 text-white relative">
      <button onClick={dismiss} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white/70 hover:text-white">
        <X size={12} />
      </button>
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0">📚</span>
        <div className="flex-1 pr-4">
          <p className="font-black text-sm">
            {doneLessons === 0
              ? `Welcome${userName ? `, ${userName.split(' ')[0]}` : ''}! Complete your sales training first.`
              : `You're ${pct}% through your sales training!`}
          </p>
          <p className="text-purple-200 text-xs mt-0.5">
            {doneLessons === 0
              ? 'Learn how to pitch Seshaa, handle objections, and close deals.'
              : `${MODULES.reduce((s,m)=>s+m.lessons.length,0) - doneLessons} lessons left — scripts, objections, and closing techniques.`}
          </p>
          <button onClick={onStart}
            className="mt-2.5 flex items-center gap-1.5 bg-white text-purple-700 text-xs font-bold px-4 py-2 rounded-xl hover:bg-purple-50">
            {doneLessons === 0 ? 'Start Training' : 'Continue →'} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
