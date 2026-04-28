/**
 * Payments: Stripe (cards) + Flutterwave (Africa-wide mobile money + cards) + Celo (crypto/stablecoin)
 *
 * Stripe:      South Africa, Nigeria, Ghana, Kenya, Rwanda, Egypt
 * Flutterwave: 34 African countries — card, M-Pesa, MTN MoMo, Orange Money, bank transfer
 * Celo/cUSD:   All of Africa — crypto stablecoin, ~$0.001 fees, mobile wallet
 *
 * Ambassador payouts via:
 *   - M-Pesa (Kenya, Tanzania, Uganda, Ethiopia, Rwanda, Mozambique, DRC, Lesotho)
 *   - MTN MoMo (Ghana, Uganda, Zambia, Cameroon, Ivory Coast, Nigeria, Congo, Rwanda...)
 *   - Orange Money (Senegal, CI, Cameroon, Mali, Guinea, Niger, Madagascar)
 *   - Wave (Senegal, CI, Uganda)
 *   - Flutterwave Transfer API (bank + mobile money, 34 countries)
 *   - Celo wallet (instant, any country, crypto)
 */
import { Router, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const FW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const CELO_WALLET = process.env.SESHAA_CELO_WALLET; // Our receiving wallet

const PRO_PRICES = { MONTHLY: 9.99, ANNUAL: 89.99 };

// Supported African mobile money methods by country
export const MOBILE_MONEY_METHODS: Record<string, { provider: string; label: string; fwType: string }[]> = {
  KE: [{ provider: 'mpesa', label: 'M-Pesa', fwType: 'mobilemoneykenya' }],
  TZ: [{ provider: 'mpesa', label: 'M-Pesa Tanzania', fwType: 'mobilemoneytanzania' }],
  UG: [{ provider: 'mtn_momo', label: 'MTN MoMo', fwType: 'mobilemoneyuganda' }, { provider: 'airtel', label: 'Airtel Money', fwType: 'mobilemoneyuganda' }],
  GH: [{ provider: 'mtn_momo', label: 'MTN MoMo', fwType: 'mobilemoneyghanamoto' }, { provider: 'vodafone', label: 'Vodafone Cash', fwType: 'mobilemoneyghanamoto' }],
  ZA: [{ provider: 'stripe', label: 'Card (Visa/MC)', fwType: 'card' }],
  NG: [{ provider: 'flutterwave', label: 'Card / Bank Transfer', fwType: 'card' }],
  SN: [{ provider: 'orange_money', label: 'Orange Money', fwType: 'mobilemoneysenegal' }, { provider: 'wave', label: 'Wave', fwType: 'mobilemoneysenegal' }],
  CI: [{ provider: 'orange_money', label: 'Orange Money', fwType: 'mobilemoneyci' }, { provider: 'mtn_momo', label: 'MTN MoMo', fwType: 'mobilemoneyci' }],
  CM: [{ provider: 'mtn_momo', label: 'MTN MoMo', fwType: 'mobilemoneycameroon' }, { provider: 'orange_money', label: 'Orange Money', fwType: 'mobilemoneycameroon' }],
  RW: [{ provider: 'mtn_momo', label: 'MTN MoMo', fwType: 'mobilemoneyrwanda' }, { provider: 'mpesa', label: 'M-Pesa', fwType: 'mobilemoneyrwanda' }],
  ZM: [{ provider: 'mtn_momo', label: 'MTN MoMo', fwType: 'mobilemoneyzambia' }],
  GN: [{ provider: 'orange_money', label: 'Orange Money', fwType: 'mobilemoneyguinea' }],
  ML: [{ provider: 'orange_money', label: 'Orange Money', fwType: 'mobilemoneymali' }],
  ET: [{ provider: 'mpesa', label: 'M-Pesa Ethiopia', fwType: 'mobilemoneyethiopia' }],
};

// GET /payments/methods/:countryCode — available payment methods for a country
router.get('/methods/:countryCode', (req, res) => {
  const code = req.params['countryCode'].toUpperCase();
  const mobileMoney = MOBILE_MONEY_METHODS[code] || [];
  const stripeCountries = ['ZA', 'NG', 'GH', 'KE', 'RW', 'EG'];
  const hasStripe = stripeCountries.includes(code);

  res.json({
    countryCode: code,
    methods: [
      ...mobileMoney.map(m => ({ id: m.provider, label: m.label, type: 'mobile_money', icon: '📱' })),
      ...(hasStripe ? [{ id: 'stripe_card', label: 'Card (Visa / Mastercard)', type: 'card', icon: '💳' }] : []),
      { id: 'flutterwave_card', label: 'Card via Flutterwave', type: 'card', icon: '💳' },
      { id: 'celo_cusd', label: 'Celo (cUSD stablecoin)', type: 'crypto', icon: '🟡', badge: 'Instant · $0.001 fee' },
      { id: 'usdt_polygon', label: 'USDT (Polygon)', type: 'crypto', icon: '🔷', badge: '~$0.01 fee' },
    ],
  });
});

// POST /payments/stripe/checkout — create Stripe checkout session
router.post('/stripe/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const { listingId, plan = 'MONTHLY', successUrl, cancelUrl } = req.body;
  if (!listingId || !successUrl) return res.status(400).json({ error: 'listingId and successUrl required' });

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { name: true } });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const price = PRO_PRICES[plan as keyof typeof PRO_PRICES] || PRO_PRICES.MONTHLY;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: plan === 'ANNUAL' ? 'subscription' : 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Seshaa Pro — ${listing.name}`, description: `${plan === 'ANNUAL' ? 'Annual' : 'Monthly'} Pro subscription` },
        unit_amount: Math.round(price * 100),
        ...(plan === 'ANNUAL' ? { recurring: { interval: 'year' } } : {}),
      },
      quantity: 1,
    }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&listingId=${listingId}&plan=${plan}`,
    cancel_url: cancelUrl || successUrl,
    metadata: { listingId, plan, userId: req.user!.id },
  });

  res.json({ url: session.url, sessionId: session.id });
});

// POST /payments/stripe/webhook — handle Stripe payment confirmation
router.post('/stripe/webhook', async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(200).json({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, process.env.STRIPE_WEBHOOK_SECRET);
  } catch { return res.status(400).send('Webhook error'); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { metadata: { listingId?: string; plan?: string; userId?: string } | null };
    const { listingId, plan, userId } = (session.metadata as { listingId?: string; plan?: string; userId?: string }) || {};
    if (listingId && plan) {
      await activateProSubscription(listingId, plan as 'MONTHLY' | 'ANNUAL', userId, 'stripe');
    }
  }

  res.json({ received: true });
});

// POST /payments/flutterwave/initiate — Flutterwave payment (mobile money + card)
router.post('/flutterwave/initiate', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!FW_SECRET) return res.status(503).json({ error: 'Flutterwave not configured' });

  const { listingId, plan = 'MONTHLY', phone, email, countryCode, method } = req.body;
  if (!listingId || !phone) return res.status(400).json({ error: 'listingId and phone required' });

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { name: true } });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const price = PRO_PRICES[plan as keyof typeof PRO_PRICES] || PRO_PRICES.MONTHLY;
  const txRef = `seshaa-pro-${listingId}-${Date.now()}`;

  const payload = {
    tx_ref: txRef,
    amount: price,
    currency: 'USD',
    payment_type: method || 'mobilemoney',
    phone_number: phone,
    email: email || `ambassador+${listingId}@seshaa.africa`,
    fullname: listing.name,
    redirect_url: `${process.env.CORS_ORIGIN}/pro/success?txRef=${txRef}&listingId=${listingId}&plan=${plan}`,
    meta: { listingId, plan, userId: req.user!.id },
  };

  const fwRes = await fetch('https://api.flutterwave.com/v3/charges?type=' + (MOBILE_MONEY_METHODS[countryCode]?.[0]?.fwType || 'card'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${FW_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const fwData = await fwRes.json() as { status: string; message: string; data?: { link?: string; flw_ref?: string } };
  if (fwData.status !== 'success') return res.status(400).json({ error: fwData.message });

  res.json({ txRef, redirectUrl: fwData.data?.link, flwRef: fwData.data?.flw_ref });
});

// POST /payments/flutterwave/verify — verify Flutterwave payment
router.post('/flutterwave/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!FW_SECRET) return res.status(503).json({ error: 'Flutterwave not configured' });

  const { txId, listingId, plan } = req.body;
  if (!txId) return res.status(400).json({ error: 'txId required' });

  const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${txId}/verify`, {
    headers: { Authorization: `Bearer ${FW_SECRET}` },
  });
  const data = await verifyRes.json() as { status: string; data?: { status: string; meta?: { listingId: string; plan: string } } };

  if (data.status === 'success' && data.data?.status === 'successful') {
    const meta: { listingId?: string; plan?: string } = data.data.meta || {};
    const lid = meta.listingId || listingId;
    const p = meta.plan || plan;
    await activateProSubscription(lid, p as 'MONTHLY' | 'ANNUAL', req.user!.id, 'flutterwave');
    return res.json({ success: true, message: 'Pro subscription activated!' });
  }

  res.status(400).json({ error: 'Payment not verified' });
});

// GET /payments/crypto/address — get our Celo/USDT deposit address for a Pro purchase
router.get('/crypto/address', requireAuth, async (req: AuthRequest, res: Response) => {
  const { listingId, plan = 'MONTHLY', coin = 'cUSD' } = req.query as Record<string, string>;
  if (!listingId) return res.status(400).json({ error: 'listingId required' });

  const price = PRO_PRICES[plan as keyof typeof PRO_PRICES] || PRO_PRICES.MONTHLY;
  const ref = `seshaa:${listingId}:${plan}:${req.user!.id}`;

  // Return our wallet address — user sends exact amount, webhook confirms
  res.json({
    coin,
    network: coin === 'cUSD' ? 'Celo' : 'Polygon',
    address: CELO_WALLET || '0xYOUR_CELO_WALLET_ADDRESS',
    amount: price,
    reference: ref,
    instructions: [
      `Send exactly $${price} ${coin} to the address above`,
      `Include reference "${ref}" in the memo/note field if your wallet supports it`,
      `Your Pro subscription will activate within 1–5 minutes after confirmation`,
    ],
    qrData: `${coin === 'cUSD' ? 'celo' : 'polygon'}:${CELO_WALLET}?amount=${price}&note=${encodeURIComponent(ref)}`,
    learnMore: coin === 'cUSD'
      ? 'Get cUSD on Valora app (mobile) or Binance — works in all African countries, fees < $0.01'
      : 'Get USDT on Binance, OKX, or any CEX — send on Polygon network (NOT Ethereum, fees are high)',
  });
});

// POST /payments/crypto/confirm — manually confirm or via webhook
router.post('/crypto/confirm', async (req, res) => {
  // In production: verify on-chain using viem/ethers before activating
  // For now: admin-confirmable endpoint
  const { txHash, listingId, plan, userId, secret } = req.body;
  if (secret !== process.env.CRYPTO_CONFIRM_SECRET) return res.status(403).json({ error: 'Forbidden' });

  await activateProSubscription(listingId, plan as 'MONTHLY' | 'ANNUAL', userId, `crypto:${txHash}`);
  res.json({ success: true });
});

// GET /payments/payout-methods/:countryCode — methods for paying ambassadors
router.get('/payout-methods/:countryCode', (req, res) => {
  const code = req.params['countryCode'].toUpperCase();
  const methods = [
    ...(MOBILE_MONEY_METHODS[code] || []).map(m => ({ id: m.provider, label: m.label, type: 'mobile_money' })),
    { id: 'celo_cusd', label: 'Celo Wallet (cUSD)', type: 'crypto', note: 'Instant, any country' },
    { id: 'bank_transfer', label: 'Bank Transfer (via Flutterwave)', type: 'bank' },
    { id: 'chipper_cash', label: 'Chipper Cash', type: 'digital_wallet', countries: 'GH,KE,NG,RW,TZ,UG,ZA' },
    { id: 'usdt_polygon', label: 'USDT (Polygon)', type: 'crypto' },
  ];
  res.json({ countryCode: code, payoutMethods: methods });
});

// ——— helpers ———
function generateStickerCode(country: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SESHAA-${(country || 'AF').toUpperCase().slice(0, 2)}-${part}`;
}

async function activateProSubscription(
  listingId: string, plan: 'MONTHLY' | 'ANNUAL', userId: string | undefined, gateway: string
) {
  const price = PRO_PRICES[plan];
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + (plan === 'ANNUAL' ? 12 : 1));

  // Find ambassador who entered this listing (if any)
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { enteredById: true, country: true } });
  const ambassadorId = listing?.enteredById || null;
  const kickback = ambassadorId
    ? await prisma.ambassador.findUnique({ where: { id: ambassadorId }, select: { proKickbackRate: true } })
        .then(a => (a?.proKickbackRate || 0.15) * price)
    : 0;

  // Generate sticker code if this is a new subscription
  const existing = await prisma.proSubscription.findUnique({ where: { listingId }, select: { stickerCode: true } });
  const stickerCode = existing?.stickerCode || generateStickerCode(listing?.country || 'AF');

  await prisma.$transaction([
    prisma.proSubscription.upsert({
      where: { listingId },
      create: { listingId, plan, price, ambassadorId, kickback, endDate, active: true, stickerCode },
      update: { plan, price, endDate, active: true },
    }),
    prisma.listing.update({ where: { id: listingId }, data: { isPro: true, bookable: true } }),
    ...(ambassadorId && kickback > 0 ? [
      prisma.ambassador.update({
        where: { id: ambassadorId },
        data: { totalEarned: { increment: kickback }, pendingPayout: { increment: kickback } },
      }),
    ] : []),
  ]);

  console.log(`✅ Pro activated: ${listingId} via ${gateway} | sticker: ${stickerCode} | kickback: $${kickback.toFixed(2)}`);
}

export default router;
