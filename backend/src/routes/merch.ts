import { Router } from 'express';
import prisma from '../db';

const router = Router();

interface PodConfig {
  printifyApiKey?: string;
  printfulApiKey?: string;
  services?: Array<{ name: string; website: string; region: string; eco?: string; description?: string }>;
}

interface MerchProduct {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  provider: 'printify' | 'printful' | 'fallback';
  priceFrom?: number;
  currency?: string;
}

const DEFAULT_PRODUCTS: MerchProduct[] = [
  { id: 'fallback-tee-1', name: 'Pan-African Classic Tee', description: 'Soft cotton unisex t-shirt with Afro-minimal art print.', imageUrl: 'https://images.printify.com/mockup/64f0f233d7ce0f00120f56a1/88953/70931/unisex-heavy-cotton-tee.jpg', provider: 'fallback', priceFrom: 18, currency: 'USD' },
  { id: 'fallback-hoodie-1', name: 'Seshaa Street Hoodie', description: 'Warm fleece hoodie designed for daily wear.', imageUrl: 'https://images.printify.com/mockup/64f0f233d7ce0f00120f56a1/88967/70945/unisex-heavy-blend-hooded-sweatshirt.jpg', provider: 'fallback', priceFrom: 34, currency: 'USD' },
  { id: 'fallback-tote-1', name: 'Eco Tote Africa Edition', description: 'Reusable tote bag with sustainable message artwork.', imageUrl: 'https://images.printify.com/mockup/64f0f233d7ce0f00120f56a1/88885/70863/cotton-canvas-tote-bag.jpg', provider: 'fallback', priceFrom: 15, currency: 'USD' },
  { id: 'fallback-cap-1', name: 'Seshaa Snapback', description: 'Structured snapback cap with embroidered mark.', imageUrl: 'https://images.printify.com/mockup/64f0f233d7ce0f00120f56a1/88996/70974/snapback-trucker-cap.jpg', provider: 'fallback', priceFrom: 21, currency: 'USD' },
];

const DEFAULT_SERVICES = [
  { name: 'Printify', website: 'https://printify.com', region: 'Global', eco: 'Eco-friendly product variants available', description: 'Large POD catalog with broad supplier network.' },
  { name: 'Printful', website: 'https://www.printful.com', region: 'Global', eco: 'Sustainable collections and eco packaging options', description: 'Popular POD fulfillment with branding options.' },
  { name: 'Gelato', website: 'https://www.gelato.com', region: 'Global', eco: 'Local production network lowers shipping footprint', description: 'Global print network with location-based fulfillment.' },
  { name: 'Merch42 Africa', website: 'https://merch42.com', region: 'Africa', eco: 'On-demand reduces overproduction waste', description: 'African-focused custom merch and fulfillment partner.' },
];

async function readPodConfig(): Promise<PodConfig> {
  const rec = await prisma.listing.findUnique({ where: { osmId: 'seshaa-pod-config' } });
  if (!rec?.description) return {};
  try {
    return JSON.parse(rec.description) as PodConfig;
  } catch {
    return {};
  }
}

async function listPrintifyProducts(apiKey: string, limit: number): Promise<MerchProduct[]> {
  const shopsResp = await fetch('https://api.printify.com/v1/shops.json', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!shopsResp.ok) return [];
  const shops = await shopsResp.json() as Array<{ id: number }>;
  const shopId = shops[0]?.id;
  if (!shopId) return [];

  const productsResp = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json?limit=${limit}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!productsResp.ok) return [];
  const data = await productsResp.json() as {
    data?: Array<{ id: string; title: string; description?: string; images?: Array<{ src?: string }>; variants?: Array<{ price?: number }> }>;
  };

  return (data.data || []).map(p => ({
    id: p.id,
    name: p.title,
    description: p.description,
    imageUrl: p.images?.[0]?.src,
    provider: 'printify',
    priceFrom: p.variants?.[0]?.price ? p.variants[0].price / 100 : undefined,
    currency: 'USD',
  }));
}

async function listPrintfulProducts(apiKey: string, limit: number): Promise<MerchProduct[]> {
  const resp = await fetch('https://api.printful.com/store/products', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) return [];
  const data = await resp.json() as {
    result?: Array<{ id: number; name: string; thumbnail_url?: string }>;
  };

  return (data.result || []).slice(0, limit).map(p => ({
    id: String(p.id),
    name: p.name,
    imageUrl: p.thumbnail_url,
    provider: 'printful',
    currency: 'USD',
  }));
}

// GET /merch/providers
router.get('/providers', async (_req, res) => {
  const cfg = await readPodConfig();
  res.json([
    { id: 'printify', name: 'Printify', connected: Boolean(cfg.printifyApiKey), eco: 'On-demand production reduces waste' },
    { id: 'printful', name: 'Printful', connected: Boolean(cfg.printfulApiKey), eco: 'Eco-conscious product collection available' },
  ]);
});

// GET /merch/products?provider=printify|printful&limit=24
router.get('/products', async (req, res) => {
  const provider = String(req.query.provider || 'printify');
  const limit = Math.max(1, Math.min(60, Number(req.query.limit || 24)));
  const cfg = await readPodConfig();

  try {
    let products: MerchProduct[] = [];

    if (provider === 'printify' && cfg.printifyApiKey) {
      products = await listPrintifyProducts(cfg.printifyApiKey, limit);
    } else if (provider === 'printful' && cfg.printfulApiKey) {
      products = await listPrintfulProducts(cfg.printfulApiKey, limit);
    }

    if (!products.length) {
      products = DEFAULT_PRODUCTS.slice(0, limit);
    }

    res.json({ provider, products, fallback: products[0]?.provider === 'fallback' });
  } catch (err) {
    console.error('Merch products error:', err);
    res.json({ provider, products: DEFAULT_PRODUCTS.slice(0, limit), fallback: true });
  }
});

// GET /merch/services — known + scraped African POD services
router.get('/services', async (_req, res) => {
  const cfg = await readPodConfig();
  res.json({ services: cfg.services?.length ? cfg.services : DEFAULT_SERVICES });
});

export default router;
