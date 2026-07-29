/**
 * Seshaa Driver Training — interactive onboarding for ride-share, delivery,
 * and transport drivers. Progress persisted in localStorage per user.
 */
import { useState } from 'react';
import {
  ChevronRight, ChevronLeft, CheckCircle, Lock,
  Star, Shield, DollarSign, Phone, MessageCircle,
  Package, Truck, Car, Navigation, Clock, AlertCircle,
  ThumbsUp, MapPin, Zap, X, ArrowRight, BookOpen,
} from 'lucide-react';

// ─── Progress helpers ─────────────────────────────────────────────────────────
const STORAGE_KEY = (uid: string) => `seshaa-driver-training-v1-${uid}`;

export function loadDriverProgress(uid: string): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(uid)) || '{}'); }
  catch { return {}; }
}
function saveDriverProgress(uid: string, done: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(done));
}

// ─── Course modules ───────────────────────────────────────────────────────────
interface Lesson { id: string; title: string; emoji: string; content: React.ReactNode; }
interface Module  { id: string; title: string; subtitle: string; emoji: string; color: string; lessons: Lesson[]; }

const MODULES: Module[] = [
  // ── MODULE 1: Welcome ────────────────────────────────────────────────────
  {
    id: 'welcome',
    title: 'Welcome to Seshaa Rides',
    subtitle: 'How the platform works',
    emoji: '🌍',
    color: 'from-green-600 to-emerald-700',
    lessons: [
      {
        id: 'w-1',
        title: 'What Is Seshaa Rides?',
        emoji: '🚗',
        content: (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-gray-900">Seshaa connects drivers with passengers, parcels, and cargo across all 54 African countries.</p>
            <p className="text-gray-600">You can offer one, two, or all three services on the same account:</p>
            <div className="space-y-3">
              {[
                { icon: '🚗', title: 'seshaa.ride',     desc: 'Carry passengers — from short city trips to long-distance journeys. Like Uber, but built for Africa.' },
                { icon: '📦', title: 'seshaa.delivery', desc: 'Deliver packages, food, documents, and goods. From motorbike couriers to car deliveries.' },
                { icon: '🚛', title: 'seshaa.transport',desc: 'Move cargo, furniture, produce, and equipment. Vans, trucks, pickups, and boats.' },
              ].map(s => (
                <div key={s.icon} className="flex gap-3 bg-white rounded-xl border p-4">
                  <span className="text-2xl shrink-0">{s.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="font-bold text-green-800">💡 More services = more income</p>
              <p className="text-sm text-green-700 mt-1">Register for all three. If there are no ride requests, you can still accept deliveries. Never sit idle.</p>
            </div>
          </div>
        ),
      },
      {
        id: 'w-2',
        title: 'How You Get Paid',
        emoji: '💰',
        content: (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">Seshaa uses a transparent, agreed-price model. Here's how earnings work:</p>
            <div className="space-y-3">
              {[
                { step: '1', icon: '📱', title: 'Customer books', desc: 'A customer submits a request with pickup, drop-off, and any notes. You see it in your available requests feed.' },
                { step: '2', icon: '✅', title: 'You accept',      desc: 'Tap Accept. The customer is notified with your name, vehicle, and phone number.' },
                { step: '3', icon: '🤝', title: 'Agree the price', desc: 'Call or WhatsApp the customer to confirm the fare before moving. This is standard in Africa — no meters, just an agreed price.' },
                { step: '4', icon: '⭐', title: 'Complete & rate', desc: 'Once done, both you and the customer rate each other. High ratings = more bookings.' },
                { step: '5', icon: '💵', title: 'Get paid',         desc: 'Payment is cash, mobile money, or both — agreed directly with the customer. Seshaa does not take a cut of your fare.' },
              ].map(s => (
                <div key={s.step} className="flex gap-3 bg-white rounded-xl border p-3">
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4">
              <p className="font-bold text-yellow-800">⚡ Key fact: Seshaa charges ZERO commission.</p>
              <p className="text-sm text-yellow-700 mt-1">Every shilling / cedi / naira / franc you earn goes directly to you. Seshaa makes money from listing fees, not your trips.</p>
            </div>
          </div>
        ),
      },
      {
        id: 'w-3',
        title: 'Your Driver Profile',
        emoji: '👤',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">A complete profile gets you more bookings. Customers choose drivers based on what they see.</p>
            <div className="space-y-2">
              {[
                { field: 'Profile photo',     tip: 'Clear, friendly face shot. Customers need to recognise you. No sunglasses.', important: true },
                { field: 'Vehicle type',       tip: 'Car, motorbike, van, truck, bicycle, boat — select all that apply.', important: true },
                { field: 'Plate number',       tip: 'Required for rides and transport. Customers feel safer knowing your plates.', important: true },
                { field: 'Services offered',   tip: 'Tick all: RIDE, DELIVERY, TRANSPORT. More options = more jobs.', important: true },
                { field: 'City & country',     tip: 'Set this correctly — it controls which requests you see.', important: true },
                { field: 'Bio',                tip: 'E.g. "5 years driving in Lagos. Clean car, punctual, know all routes." Builds trust fast.', important: false },
              ].map(f => (
                <div key={f.field} className="flex items-start gap-3 bg-white rounded-xl border p-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 mt-0.5 ${f.important ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {f.important ? 'Required' : 'Optional'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{f.field}</p>
                    <p className="text-xs text-gray-500">{f.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },

  // ── MODULE 2: Ride Share ─────────────────────────────────────────────────
  {
    id: 'rideshare',
    title: 'Ride Share — seshaa.ride',
    subtitle: 'Carrying passengers safely and profitably',
    emoji: '🚗',
    color: 'from-blue-600 to-indigo-700',
    lessons: [
      {
        id: 'r-1',
        title: 'Accepting & Managing Rides',
        emoji: '✅',
        content: (
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  phase: 'When you receive a request',
                  icon: '📲',
                  steps: [
                    'Check the pickup and drop-off location before accepting',
                    'Estimate if the distance/time works for your current position',
                    'Accept fast — customers may be checking multiple drivers',
                    'Call the customer within 60 seconds of accepting to confirm location',
                  ],
                },
                {
                  phase: 'Agreeing the fare',
                  icon: '💬',
                  steps: [
                    'Call or WhatsApp: "Hello, I\'m [name], your Seshaa driver. I can take you from [A] to [B] for [amount]. Does that work?"',
                    'Know your local rates — standard fares in your city',
                    'For longer trips, agree a fuel contribution if applicable',
                    'Never start moving without a confirmed price',
                  ],
                },
                {
                  phase: 'During the ride',
                  icon: '🚦',
                  steps: [
                    'Be on time — punctuality drives 5-star ratings',
                    'Keep the car clean inside and out',
                    'Ask if they want music, AC, silence — let them lead',
                    'No phone calls (use hands-free or ask to call back)',
                    'Never take detours without explaining why',
                  ],
                },
              ].map(p => (
                <div key={p.phase} className="bg-white rounded-2xl border p-4">
                  <p className="font-bold text-gray-900 text-sm mb-2">{p.icon} {p.phase}</p>
                  <ul className="space-y-1">
                    {p.steps.map(s => (
                      <li key={s} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <CheckCircle size={11} className="text-green-500 mt-0.5 shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'r-2',
        title: 'Earning More from Rides',
        emoji: '💸',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Small habits make the difference between a good week and a great one.</p>
            <div className="space-y-3">
              {[
                { icon: '⏰', title: 'Work peak hours',       desc: 'Morning commute (7–9am), lunch (12–2pm), evening (5–8pm), and Friday/Saturday nights. That\'s where 70% of the trips are.' },
                { icon: '📍', title: 'Position strategically', desc: 'Park near hospitals, hotels, bus stations, universities, and markets. That\'s where people need rides most.' },
                { icon: '💬', title: 'Ask for ratings',        desc: 'At the end of every trip: "Thank you! I\'d really appreciate a 5-star review on Seshaa — it helps me a lot." Most passengers are happy to do it.' },
                { icon: '📱', title: 'Keep Seshaa open',       desc: 'Requests only come through when you\'re active in the app. Don\'t lock your screen while waiting for jobs.' },
                { icon: '🤝', title: 'Build regulars',         desc: 'Swap WhatsApp numbers with frequent customers. They\'ll call you directly AND rate you well on Seshaa.' },
                { icon: '🚗', title: 'Offer airport runs',     desc: 'Airport trips are longer = higher fares. Position near airports on early mornings. Hotel guests are gold.' },
              ].map(t => (
                <div key={t.icon} className="flex gap-3 bg-white rounded-xl border p-3">
                  <span className="text-xl shrink-0">{t.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'r-3',
        title: 'Difficult Situations',
        emoji: '🛡️',
        content: (
          <div className="space-y-3">
            {[
              {
                situation: 'Customer is late to the pickup point',
                handle: 'Wait 5 minutes. Call once. If no answer after 10 minutes, mark as no-show and move on. Your time is valuable.',
              },
              {
                situation: 'Customer wants to change the destination mid-trip',
                handle: 'Agree the new price before changing route. "Sure, I can take you to [new place] too — that will be an extra [amount]." Get confirmation before driving.',
              },
              {
                situation: 'Customer is aggressive or disrespectful',
                handle: 'Stay calm. Pull over safely. Say: "I\'m sorry but I\'m going to have to end this trip here." You do not have to accept disrespect. Your safety comes first.',
              },
              {
                situation: 'Customer refuses to pay agreed price',
                handle: 'Calmly repeat the agreed price. If they still refuse, do not escalate. Report via the Seshaa feedback system and move on. One bad fare is not worth a confrontation.',
              },
              {
                situation: 'Night driving safety',
                handle: 'Share your trip details with a trusted contact. Stick to lit main roads at night. Trust your instincts — if something feels wrong, don\'t accept the trip.',
              },
            ].map(s => (
              <div key={s.situation} className="bg-white rounded-2xl border p-4">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 mb-2">
                  <p className="text-xs font-bold text-orange-700">⚠️ {s.situation}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5">
                  <p className="text-xs font-semibold text-blue-600 mb-0.5">How to handle it:</p>
                  <p className="text-sm text-blue-800">{s.handle}</p>
                </div>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  // ── MODULE 3: Delivery ───────────────────────────────────────────────────
  {
    id: 'delivery',
    title: 'Delivery — seshaa.delivery',
    subtitle: 'Packages, food, and documents done right',
    emoji: '📦',
    color: 'from-orange-500 to-amber-600',
    lessons: [
      {
        id: 'd-1',
        title: 'Taking a Delivery Job',
        emoji: '🏃',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Delivery is often faster money than rides — multiple jobs, shorter trips, same area.</p>
            <div className="space-y-3">
              {[
                {
                  phase: 'Before accepting',
                  icon: '🔍',
                  items: [
                    'Check pickup and delivery addresses — are they in your zone?',
                    'Read any notes — fragile items, urgent, food (time-sensitive)',
                    'If it\'s food: confirm it\'s ready for collection before leaving your spot',
                  ],
                },
                {
                  phase: 'At collection',
                  icon: '📍',
                  items: [
                    'Confirm the package details: "I\'m here to collect [item] going to [address]"',
                    'Check for damage BEFORE accepting fragile items — not your fault if already broken',
                    'For food: check it\'s sealed and complete before leaving the restaurant',
                    'For documents/envelopes: never open them — ever',
                  ],
                },
                {
                  phase: 'During delivery',
                  icon: '🛵',
                  items: [
                    'Call ahead when 5–10 minutes away: "I\'m on the way with your [item]"',
                    'Keep packages flat, dry, and secure — don\'t leave them in direct sun',
                    'If recipient isn\'t home: call sender AND recipient before leaving',
                  ],
                },
                {
                  phase: 'At drop-off',
                  icon: '🏠',
                  items: [
                    'Hand to person directly — never leave at door without confirmation',
                    'Ask the recipient to confirm receipt verbally',
                    'If you collected cash-on-delivery: hand money to sender same day',
                  ],
                },
              ].map(p => (
                <div key={p.phase} className="bg-white rounded-2xl border p-4">
                  <p className="font-bold text-gray-900 text-sm mb-2">{p.icon} {p.phase}</p>
                  <ul className="space-y-1">
                    {p.items.map(i => <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><CheckCircle size={11} className="text-orange-400 mt-0.5 shrink-0" /> {i}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'd-2',
        title: 'Building a Delivery Business',
        emoji: '📈',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">The most successful delivery drivers run like a small business. Here's what they do:</p>
            <div className="space-y-3">
              {[
                { icon: '🏪', title: 'Partner with local businesses', desc: 'Restaurants, pharmacies, bakeries, tailors — offer them a regular rate. "I\'ll do all your deliveries for [flat rate]. Call me anytime." Regular income every day.' },
                { icon: '📱', title: 'Create a WhatsApp Business profile', desc: 'Share your Seshaa profile link in your status. Post "Available for delivery in [area]" every morning. Customers screenshot and share.' },
                { icon: '⚡', title: 'Speed is your superpower', desc: 'Fast delivery = 5-star reviews = more requests. Time every job. Under 30 minutes in city traffic is excellent. Share your ETA with every customer.' },
                { icon: '🗺️', title: 'Know your area cold', desc: 'Learn shortcuts, avoid traffic black spots, know which gates need a call. You should know every street in your zone better than Google Maps.' },
                { icon: '📦', title: 'Carry packaging supplies', desc: 'A roll of bubble wrap, some tape, and small boxes. Charge a small extra fee for packaging. Customers love knowing their fragile items are safe.' },
              ].map(t => (
                <div key={t.icon} className="flex gap-3 bg-white rounded-xl border p-4">
                  <span className="text-xl shrink-0">{t.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },

  // ── MODULE 4: Transport ──────────────────────────────────────────────────
  {
    id: 'transport',
    title: 'Transport — seshaa.transport',
    subtitle: 'Moving cargo, furniture, and goods',
    emoji: '🚛',
    color: 'from-violet-600 to-purple-700',
    lessons: [
      {
        id: 't-1',
        title: 'Transport Jobs — What to Expect',
        emoji: '🏗️',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Transport jobs pay more per trip but require more care. A damaged load can cost you more than the job paid.</p>
            <div className="space-y-3">
              {[
                {
                  type: 'Household moves',
                  icon: '🛋️',
                  tips: ['Always inspect items BEFORE loading — note existing damage', 'Bring straps and blankets if possible; charge extra if you supply them', 'Quote per trip, not per hour — moves always take longer than expected', 'Confirm number of floors, elevator availability, and parking space upfront'],
                },
                {
                  type: 'Market produce & food',
                  icon: '🌽',
                  tips: ['Confirm weight estimate before agreeing price — heavy loads wear your vehicle', 'Food is time-sensitive — pick up and deliver the same day', 'Keep perishables out of sun; close the canopy if you have one', 'Some markets start at 3–4am — early availability = premium rates'],
                },
                {
                  type: 'Construction materials',
                  icon: '🧱',
                  tips: ['Confirm load weight — overloading damages your suspension and is illegal', 'Dust/sand loads: cover with tarpaulin, protect your cabin', 'Estimate fuel accurately for heavy loads — more weight = more fuel', 'Get payment before loading for new customers'],
                },
              ].map(j => (
                <div key={j.type} className="bg-white rounded-2xl border p-4">
                  <p className="font-bold text-gray-900 text-sm mb-2">{j.icon} {j.type}</p>
                  <ul className="space-y-1">
                    {j.tips.map(tip => <li key={tip} className="text-xs text-gray-600 flex items-start gap-1.5"><CheckCircle size={11} className="text-purple-400 mt-0.5 shrink-0" /> {tip}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 't-2',
        title: 'Pricing Transport Jobs',
        emoji: '💰',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Transport jobs are high-value. Never underprice them. Here's how to quote:</p>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <p className="font-bold text-purple-800 mb-3">The Transport Pricing Formula:</p>
              <div className="space-y-2 text-sm text-purple-700">
                <p>1. <strong>Base rate</strong> — your minimum for showing up (covers fuel to pickup)</p>
                <p>2. <strong>Distance</strong> — per-kilometre rate × estimated distance</p>
                <p>3. <strong>Weight/size</strong> — heavy or large loads get a loading fee</p>
                <p>4. <strong>Labour</strong> — loading/unloading help? Charge separately or include upfront</p>
                <p>5. <strong>Urgency</strong> — same-day or weekend? Add 20–30%</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border p-4">
              <p className="text-xs font-bold text-gray-600 mb-2">Example quote script:</p>
              <p className="text-sm text-gray-700 italic">"I can collect from [area] and deliver to [area]. For [item type], I'd charge [base] plus fuel — total around [amount]. That includes loading but not unloading help — I can arrange a helper for an extra [amount] if needed. When do you want it done?"</p>
            </div>
            <div className="space-y-2">
              {[
                '📋 Always get a WhatsApp confirmation of the agreed price before the job',
                '💳 Request 50% deposit for jobs over [your threshold] — protects you from no-shows',
                '📸 Take photos of the load BEFORE and AFTER transport — proof if a dispute arises',
                '📃 Build a simple rate card to share with regular clients',
              ].map(tip => (
                <div key={tip} className="bg-gray-50 rounded-xl border px-3 py-2.5">
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },

  // ── MODULE 5: Safety & Ratings ──────────────────────────────────────────
  {
    id: 'safety',
    title: 'Safety, Ratings & Earnings',
    subtitle: 'Protect yourself and your income',
    emoji: '⭐',
    color: 'from-yellow-500 to-orange-500',
    lessons: [
      {
        id: 's-1',
        title: 'Getting & Keeping 5 Stars',
        emoji: '🌟',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Your rating is your most valuable asset on Seshaa. High-rated drivers get more requests — especially premium ones.</p>
            <div className="grid grid-cols-2 gap-3 mb-2">
              {[
                { star: '⭐⭐⭐⭐⭐', label: '4.8–5.0', desc: 'Priority listing, more requests, trust badge', color: 'bg-green-50 border-green-200' },
                { star: '⭐⭐⭐⭐',   label: '4.0–4.7', desc: 'Good standing, normal requests', color: 'bg-blue-50 border-blue-200' },
                { star: '⭐⭐⭐',     label: '3.0–3.9', desc: 'Warning level — work to improve', color: 'bg-yellow-50 border-yellow-200' },
                { star: '⭐⭐',       label: 'Under 3', desc: 'Risk of suspension — needs immediate action', color: 'bg-red-50 border-red-200' },
              ].map(r => (
                <div key={r.label} className={`rounded-xl border p-3 ${r.color}`}>
                  <p className="text-xs">{r.star}</p>
                  <p className="font-black text-gray-900 text-sm">{r.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-gray-700">What drives 5-star reviews:</p>
            <div className="space-y-2">
              {[
                { icon: '🕐', text: 'Being on time — or early' },
                { icon: '🧹', text: 'Clean, tidy vehicle every single day' },
                { icon: '😊', text: 'Friendly, calm, professional manner' },
                { icon: '📞', text: 'Communicating proactively (ETA, delays, arrival)' },
                { icon: '🗺️', text: 'Knowing the route without asking three times' },
                { icon: '💬', text: 'Asking at the end: "Was everything okay?"' },
                { icon: '🚫', text: 'Never arguing about price after it was agreed' },
              ].map(i => (
                <div key={i.icon} className="flex items-center gap-2.5 bg-white rounded-xl border px-3 py-2">
                  <span className="text-lg shrink-0">{i.icon}</span>
                  <p className="text-sm text-gray-700">{i.text}</p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 's-2',
        title: 'Vehicle & Personal Safety',
        emoji: '🛡️',
        content: (
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  category: 'Your vehicle',
                  icon: '🔧',
                  color: 'bg-blue-50 border-blue-200',
                  items: [
                    'Weekly tyre pressure check — critical for heavy transport loads',
                    'Brakes, lights, and indicators — inspect monthly at minimum',
                    'Keep a first-aid kit, fire extinguisher, and warning triangle in the vehicle',
                    'Keep your insurance, roadworthiness, and licence documents in the car always',
                    'Fuel up before busy periods — running out mid-job damages your rating badly',
                  ],
                },
                {
                  category: 'Your personal safety',
                  icon: '🧍',
                  color: 'bg-green-50 border-green-200',
                  items: [
                    'Share your location or trip details with someone you trust before night jobs',
                    'For rides: if the passenger feels unsafe, end the trip early and pull over in a public place',
                    'For deliveries: never enter an unfamiliar building alone — wait at the gate',
                    'For transport: get cash or mobile money confirmation before loading heavy cargo',
                    'Never carry strangers in addition to a booked passenger without their agreement',
                  ],
                },
                {
                  category: 'Financial safety',
                  icon: '💳',
                  color: 'bg-yellow-50 border-yellow-200',
                  items: [
                    'Set a daily earnings target and stop when you reach it + 20% buffer',
                    'Keep a fuel/maintenance fund — 10% of daily earnings set aside',
                    'Use mobile money for payments where possible — safer than holding cash',
                    'Never loan your account or vehicle to another driver',
                  ],
                },
              ].map(c => (
                <div key={c.category} className={`rounded-2xl border p-4 ${c.color}`}>
                  <p className="font-bold text-gray-900 text-sm mb-2">{c.icon} {c.category}</p>
                  <ul className="space-y-1">
                    {c.items.map(i => <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5"><Shield size={11} className="text-gray-500 mt-0.5 shrink-0" /> {i}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 's-3',
        title: 'Your Daily Earnings Goal',
        emoji: '📊',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Treat driving like a business. Track your hours and income daily.</p>
            <div className="space-y-2">
              {[
                { time: '6:00am',  icon: '⏰', task: 'Vehicle check: fuel, tyres, cleanliness. Pack water and snacks. Set your earnings target.' },
                { time: '7:00am',  icon: '🚗', task: 'First peak window. Position near offices, schools, markets. Open Seshaa and stay active.' },
                { time: '9:30am',  icon: '📦', task: 'Switch to deliveries if ride traffic drops. Many businesses need morning deliveries.' },
                { time: '12:00pm', icon: '🍱', task: 'Food delivery peak. Restaurants are busy. Position near popular lunch spots.' },
                { time: '2:00pm',  icon: '🏥', task: 'Hospitals, clinics, schools. Afternoon school runs, medical trips.' },
                { time: '5:00pm',  icon: '🌆', task: 'Evening commute peak. Biggest ride window of the day. Stay in business districts.' },
                { time: '7:00pm',  icon: '🎉', task: 'Weekend: nightlife runs. Weekdays: restaurants for evening deliveries.' },
                { time: '9:30pm',  icon: '🏠', task: 'Wrap up. Log your trips. Calculate earnings vs fuel cost. Rest.' },
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
            <div className="bg-green-50 border border-green-300 rounded-2xl p-4">
              <p className="font-bold text-green-800 mb-1">🏆 What a good day looks like:</p>
              <p className="text-sm text-green-700">6 rides × average fare + 4 deliveries + 1 transport job. Before platform fees (zero on Seshaa!), a focused driver can earn significantly more than a minimum-wage job — every single day.</p>
            </div>
          </div>
        ),
      },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
interface Props { userId: string; userName?: string; onClose?: () => void; serviceFilter?: 'RIDE' | 'DELIVERY' | 'TRANSPORT'; }

export default function DriverTraining({ userId, userName, onClose, serviceFilter }: Props) {
  const [progress, setProgress] = useState<Record<string, boolean>>(() => loadDriverProgress(userId));
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [lessonIdx,    setLessonIdx]    = useState(0);

  // Filter modules based on service type if specified
  const visibleModules = serviceFilter
    ? MODULES.filter(m => {
        if (serviceFilter === 'RIDE')     return ['welcome','rideshare','safety'].includes(m.id);
        if (serviceFilter === 'DELIVERY') return ['welcome','delivery','safety'].includes(m.id);
        if (serviceFilter === 'TRANSPORT')return ['welcome','transport','safety'].includes(m.id);
        return true;
      })
    : MODULES;

  const totalLessons = visibleModules.reduce((s, m) => s + m.lessons.length, 0);
  const doneLessons  = visibleModules.reduce((s, m) => s + m.lessons.filter(l => progress[l.id]).length, 0);
  const pct          = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;
  const allDone      = pct === 100;

  const currentModule = visibleModules.find(m => m.id === activeModule);
  const currentLesson = currentModule?.lessons[lessonIdx];

  const markDone = (lid: string) => {
    const next = { ...progress, [lid]: true };
    setProgress(next);
    saveDriverProgress(userId, next);
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

  const openModule = (id: string) => {
    const mod = visibleModules.find(m => m.id === id);
    if (!mod) return;
    const first = mod.lessons.findIndex(l => !progress[l.id]);
    setLessonIdx(first === -1 ? 0 : first);
    setActiveModule(id);
  };

  // ── Lesson view ──
  if (currentModule && currentLesson) {
    const total    = currentModule.lessons.length;
    const modDone  = currentModule.lessons.filter(l => progress[l.id]).length;

    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className={`bg-gradient-to-r ${currentModule.color} text-white px-4 py-4 flex items-center gap-3`}>
          <button onClick={() => { setActiveModule(null); setLessonIdx(0); }}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold opacity-80">{currentModule.emoji} {currentModule.title}</p>
            <p className="font-bold text-sm">{currentLesson.emoji} {currentLesson.title}</p>
          </div>
          <span className="text-xs opacity-80">{lessonIdx + 1}/{total}</span>
        </div>
        <div className="h-1 bg-white/20">
          <div className="h-1 bg-white/70 transition-all" style={{ width: `${((modDone) / total) * 100}%` }} />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5">{currentLesson.content}</div>
        <div className="px-4 py-4 bg-white border-t flex items-center gap-3">
          <button onClick={() => lessonIdx > 0 && setLessonIdx(lessonIdx - 1)} disabled={lessonIdx === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border text-sm font-semibold text-gray-600 disabled:opacity-30 hover:bg-gray-50">
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={nextLesson}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${currentModule.color}`}>
            <CheckCircle size={16} />
            {lessonIdx < currentModule.lessons.length - 1 ? <>Got it — Next <ChevronRight size={16} /></> : 'Complete Module'}
          </button>
        </div>
      </div>
    );
  }

  // ── Module list ──
  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="bg-gradient-to-r from-green-700 to-teal-700 text-white px-4 py-6">
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
            <h1 className="text-xl font-black">Driver Playbook</h1>
            <p className="text-green-200 text-sm">{userName ? `Welcome, ${userName.split(' ')[0]}!` : 'Your driver training'}</p>
          </div>
        </div>
        <div className="bg-white/20 rounded-2xl p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">{allDone ? '🎉 Training Complete!' : `${doneLessons}/${totalLessons} lessons done`}</span>
            <span className="text-sm font-black">{pct}%</span>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {visibleModules.map((mod, mi) => {
          const modDone   = mod.lessons.filter(l => progress[l.id]).length;
          const modTotal  = mod.lessons.length;
          const modPct    = Math.round((modDone / modTotal) * 100);
          const complete  = modPct === 100;
          const locked    = mi > 0 && !visibleModules.slice(0, mi).every(m => m.lessons.every(l => progress[l.id]));

          return (
            <button key={mod.id} onClick={() => !locked && openModule(mod.id)} disabled={locked}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                locked ? 'opacity-50 border-gray-200 bg-gray-50 cursor-not-allowed'
                : complete ? 'border-green-300 bg-green-50 hover:shadow-md'
                : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-2xl shrink-0`}>
                  {complete ? '✅' : locked ? <Lock size={20} className="text-white" /> : mod.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{mod.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{mod.subtitle}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${mod.color} transition-all`} style={{ width: `${modPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{modDone}/{modTotal}</span>
                  </div>
                </div>
                {!locked && <ChevronRight size={18} className={complete ? 'text-green-500' : 'text-gray-400'} />}
              </div>
            </button>
          );
        })}
      </div>

      {allDone && (
        <div className="mx-4 mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-5 text-white text-center">
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-lg font-black">Certified Seshaa Driver!</p>
          <p className="text-sm opacity-90 mt-1">You've completed all training. Go earn!</p>
        </div>
      )}

      {/* Quick Reference */}
      <div className="px-4 pb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Reference</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Star size={16} />,       title: 'Rating Goals',   lines: ['4.8+ = priority listing', '4.0–4.7 = normal', 'Under 3 = warning'] },
            { icon: <DollarSign size={16} />, title: 'Zero Commission', lines: ['Seshaa takes 0%', 'You keep all fares', 'Cash or mobile money'] },
            { icon: <Clock size={16} />,      title: 'Peak Hours',      lines: ['7–9am commute', '12–2pm lunch', '5–8pm evening'] },
            { icon: <Shield size={16} />,     title: 'Safety First',    lines: ['Share trip location', 'Clean vehicle daily', 'Agree price upfront'] },
          ].map(c => (
            <div key={c.title} className="bg-white rounded-2xl border p-3">
              <div className="flex items-center gap-1.5 text-green-700 mb-2">{c.icon}<p className="text-xs font-bold">{c.title}</p></div>
              {c.lines.map(l => <p key={l} className="text-xs text-gray-600">{l}</p>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Welcome banner (shown until training started) ─────────────────────────────
export function DriverTrainingBanner({ userId, userName, onStart }: { userId: string; userName?: string; onStart: () => void }) {
  const progress    = loadDriverProgress(userId);
  const totalLessons = MODULES.reduce((s, m) => s + m.lessons.length, 0);
  const doneLessons  = Object.values(progress).filter(Boolean).length;
  const pct         = Math.round((doneLessons / totalLessons) * 100);

  const BANNER_KEY = `seshaa-driver-banner-dismissed-${userId}`;
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(BANNER_KEY) && doneLessons > 0);

  const dismiss = () => { localStorage.setItem(BANNER_KEY, '1'); setDismissed(true); };
  if (dismissed || pct === 100) return null;

  return (
    <div className="mb-4 bg-gradient-to-r from-green-600 to-teal-700 rounded-2xl p-4 text-white relative">
      <button onClick={dismiss} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
        <X size={12} />
      </button>
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0">📚</span>
        <div className="flex-1 pr-4">
          <p className="font-black text-sm">
            {doneLessons === 0 ? `Welcome${userName ? `, ${userName.split(' ')[0]}` : ''}! Complete your driver training.` : `You're ${pct}% through your driver training!`}
          </p>
          <p className="text-green-200 text-xs mt-0.5">Rides, deliveries, transport — safety, ratings, and earning tips.</p>
          <button onClick={onStart} className="mt-2.5 flex items-center gap-1.5 bg-white text-green-700 text-xs font-bold px-4 py-2 rounded-xl hover:bg-green-50">
            {doneLessons === 0 ? 'Start Training' : 'Continue →'} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
