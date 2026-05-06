/**
 * Black-Owned Business Scraper for Seshaa Diaspora Directory
 *
 * Sources:
 *  1. Yelp Fusion API  — `black_owned` attribute (US, CA, UK, AU, some EU)
 *  2. Shoppe Black     — shoppeblack.us (US HTML directory)
 *  3. BizBlack UK      — blackbusinessfinder.co.uk (UK HTML directory)
 *  4. Official BWS     — officialbws.com JSON endpoint (US/global)
 *
 * Env vars required:
 *   YELP_API_KEY   — get free at https://www.yelp.com/developers/v3/manage_app
 *
 * CLI:
 *   npx ts-node src/scraper/blackowned.ts [--source yelp|html|all] [--region us|uk|ca|au|eu|caribbean|brazil] [--dry-run]
 */

import 'dotenv/config';
import prisma from '../db';

// ─────────────────────────────────────────────────────────────────────────────
// DIASPORA CITY LIST
// ─────────────────────────────────────────────────────────────────────────────

export const DIASPORA_CITIES: {
  city: string; country: string; countryCode: string; region: string;
  yelpLocation: string;
}[] = [
  // ── United States ──
  { city: 'Atlanta',        country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Atlanta, GA' },
  { city: 'New York',       country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'New York, NY' },
  { city: 'Los Angeles',    country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Los Angeles, CA' },
  { city: 'Chicago',        country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Chicago, IL' },
  { city: 'Houston',        country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Houston, TX' },
  { city: 'Washington DC',  country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Washington, DC' },
  { city: 'Miami',          country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Miami, FL' },
  { city: 'Philadelphia',   country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Philadelphia, PA' },
  { city: 'Baltimore',      country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Baltimore, MD' },
  { city: 'Detroit',        country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Detroit, MI' },
  { city: 'Memphis',        country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Memphis, TN' },
  { city: 'Charlotte',      country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Charlotte, NC' },
  { city: 'New Orleans',    country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'New Orleans, LA' },
  { city: 'Jacksonville',   country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Jacksonville, FL' },
  { city: 'Columbus',       country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Columbus, OH' },
  { city: 'Indianapolis',   country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Indianapolis, IN' },
  { city: 'Dallas',         country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Dallas, TX' },
  { city: 'Nashville',      country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Nashville, TN' },
  { city: 'Richmond',       country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Richmond, VA' },
  { city: 'Durham',         country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Durham, NC' },
  { city: 'Oakland',        country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Oakland, CA' },
  { city: 'St. Louis',      country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'St. Louis, MO' },
  { city: 'Minneapolis',    country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Minneapolis, MN' },
  { city: 'Boston',         country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Boston, MA' },
  { city: 'Birmingham AL',  country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Birmingham, AL' },
  { city: 'Jackson',        country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Jackson, MS' },
  { city: 'Raleigh',        country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Raleigh, NC' },
  { city: 'Savannah',       country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Savannah, GA' },
  { city: 'Harlem',         country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Harlem, New York, NY' },
  { city: 'Compton',        country: 'United States', countryCode: 'US', region: 'Americas', yelpLocation: 'Compton, CA' },
  // ── Canada ──
  { city: 'Toronto',        country: 'Canada', countryCode: 'CA', region: 'Americas', yelpLocation: 'Toronto, ON' },
  { city: 'Montreal',       country: 'Canada', countryCode: 'CA', region: 'Americas', yelpLocation: 'Montreal, QC' },
  { city: 'Vancouver',      country: 'Canada', countryCode: 'CA', region: 'Americas', yelpLocation: 'Vancouver, BC' },
  { city: 'Ottawa',         country: 'Canada', countryCode: 'CA', region: 'Americas', yelpLocation: 'Ottawa, ON' },
  { city: 'Calgary',        country: 'Canada', countryCode: 'CA', region: 'Americas', yelpLocation: 'Calgary, AB' },
  // ── Caribbean ──
  { city: 'Kingston',       country: 'Jamaica',  countryCode: 'JM', region: 'Caribbean', yelpLocation: 'Kingston, Jamaica' },
  { city: 'Port of Spain',  country: 'Trinidad and Tobago', countryCode: 'TT', region: 'Caribbean', yelpLocation: 'Port of Spain, Trinidad and Tobago' },
  { city: 'Bridgetown',     country: 'Barbados', countryCode: 'BB', region: 'Caribbean', yelpLocation: 'Bridgetown, Barbados' },
  { city: 'Nassau',         country: 'Bahamas',  countryCode: 'BS', region: 'Caribbean', yelpLocation: 'Nassau, Bahamas' },
  { city: 'Port-au-Prince', country: 'Haiti',    countryCode: 'HT', region: 'Caribbean', yelpLocation: 'Port-au-Prince, Haiti' },
  { city: 'Santo Domingo',  country: 'Dominican Republic', countryCode: 'DO', region: 'Caribbean', yelpLocation: 'Santo Domingo, Dominican Republic' },
  { city: 'Georgetown',     country: 'Guyana',   countryCode: 'GY', region: 'Caribbean', yelpLocation: 'Georgetown, Guyana' },
  // ── Brazil ──
  { city: 'Salvador',       country: 'Brazil', countryCode: 'BR', region: 'Brazil', yelpLocation: 'Salvador, Bahia, Brazil' },
  { city: 'Rio de Janeiro',  country: 'Brazil', countryCode: 'BR', region: 'Brazil', yelpLocation: 'Rio de Janeiro, Brazil' },
  { city: 'São Paulo',      country: 'Brazil', countryCode: 'BR', region: 'Brazil', yelpLocation: 'São Paulo, Brazil' },
  { city: 'Recife',         country: 'Brazil', countryCode: 'BR', region: 'Brazil', yelpLocation: 'Recife, Brazil' },
  { city: 'Fortaleza',      country: 'Brazil', countryCode: 'BR', region: 'Brazil', yelpLocation: 'Fortaleza, Brazil' },
  // ── United Kingdom ──
  { city: 'London',         country: 'United Kingdom', countryCode: 'GB', region: 'Europe', yelpLocation: 'London, UK' },
  { city: 'Birmingham',     country: 'United Kingdom', countryCode: 'GB', region: 'Europe', yelpLocation: 'Birmingham, UK' },
  { city: 'Manchester',     country: 'United Kingdom', countryCode: 'GB', region: 'Europe', yelpLocation: 'Manchester, UK' },
  { city: 'Bristol',        country: 'United Kingdom', countryCode: 'GB', region: 'Europe', yelpLocation: 'Bristol, UK' },
  { city: 'Leeds',          country: 'United Kingdom', countryCode: 'GB', region: 'Europe', yelpLocation: 'Leeds, UK' },
  { city: 'Nottingham',     country: 'United Kingdom', countryCode: 'GB', region: 'Europe', yelpLocation: 'Nottingham, UK' },
  { city: 'Leicester',      country: 'United Kingdom', countryCode: 'GB', region: 'Europe', yelpLocation: 'Leicester, UK' },
  // ── France ──
  { city: 'Paris',          country: 'France', countryCode: 'FR', region: 'Europe', yelpLocation: 'Paris, France' },
  { city: 'Lyon',           country: 'France', countryCode: 'FR', region: 'Europe', yelpLocation: 'Lyon, France' },
  { city: 'Marseille',      country: 'France', countryCode: 'FR', region: 'Europe', yelpLocation: 'Marseille, France' },
  { city: 'Saint-Denis',    country: 'France', countryCode: 'FR', region: 'Europe', yelpLocation: 'Saint-Denis, France' },
  // ── Netherlands ──
  { city: 'Amsterdam',      country: 'Netherlands', countryCode: 'NL', region: 'Europe', yelpLocation: 'Amsterdam, Netherlands' },
  { city: 'Rotterdam',      country: 'Netherlands', countryCode: 'NL', region: 'Europe', yelpLocation: 'Rotterdam, Netherlands' },
  // ── Germany ──
  { city: 'Berlin',         country: 'Germany', countryCode: 'DE', region: 'Europe', yelpLocation: 'Berlin, Germany' },
  { city: 'Frankfurt',      country: 'Germany', countryCode: 'DE', region: 'Europe', yelpLocation: 'Frankfurt, Germany' },
  { city: 'Hamburg',        country: 'Germany', countryCode: 'DE', region: 'Europe', yelpLocation: 'Hamburg, Germany' },
  // ── Belgium ──
  { city: 'Brussels',       country: 'Belgium', countryCode: 'BE', region: 'Europe', yelpLocation: 'Brussels, Belgium' },
  // ── Portugal ──
  { city: 'Lisbon',         country: 'Portugal', countryCode: 'PT', region: 'Europe', yelpLocation: 'Lisbon, Portugal' },
  // ── Italy ──
  { city: 'Rome',           country: 'Italy', countryCode: 'IT', region: 'Europe', yelpLocation: 'Rome, Italy' },
  { city: 'Milan',          country: 'Italy', countryCode: 'IT', region: 'Europe', yelpLocation: 'Milan, Italy' },
  // ── Spain ──
  { city: 'Madrid',         country: 'Spain', countryCode: 'ES', region: 'Europe', yelpLocation: 'Madrid, Spain' },
  { city: 'Barcelona',      country: 'Spain', countryCode: 'ES', region: 'Europe', yelpLocation: 'Barcelona, Spain' },
  // ── Sweden ──
  { city: 'Stockholm',      country: 'Sweden', countryCode: 'SE', region: 'Europe', yelpLocation: 'Stockholm, Sweden' },
  // ── Norway ──
  { city: 'Oslo',           country: 'Norway', countryCode: 'NO', region: 'Europe', yelpLocation: 'Oslo, Norway' },
  // ── Denmark ──
  { city: 'Copenhagen',     country: 'Denmark', countryCode: 'DK', region: 'Europe', yelpLocation: 'Copenhagen, Denmark' },
  // ── Switzerland ──
  { city: 'Zurich',         country: 'Switzerland', countryCode: 'CH', region: 'Europe', yelpLocation: 'Zurich, Switzerland' },
  // ── Australia ──
  { city: 'Sydney',         country: 'Australia', countryCode: 'AU', region: 'Asia-Pacific', yelpLocation: 'Sydney, NSW' },
  { city: 'Melbourne',      country: 'Australia', countryCode: 'AU', region: 'Asia-Pacific', yelpLocation: 'Melbourne, VIC' },
  // ── UAE / Gulf ──
  { city: 'Dubai',          country: 'United Arab Emirates', countryCode: 'AE', region: 'Middle East', yelpLocation: 'Dubai, UAE' },
  { city: 'Abu Dhabi',      country: 'United Arab Emirates', countryCode: 'AE', region: 'Middle East', yelpLocation: 'Abu Dhabi, UAE' },
  // ── Guangzhou (Chocolate City — large African trader community) ──
  { city: 'Guangzhou',      country: 'China', countryCode: 'CN', region: 'Asia-Pacific', yelpLocation: 'Guangzhou, China' },
  // ── Japan ──
  { city: 'Tokyo',          country: 'Japan', countryCode: 'JP', region: 'Asia-Pacific', yelpLocation: 'Tokyo, Japan' },
];

// ─────────────────────────────────────────────────────────────────────────────
// YELP FUSION API SCRAPER
// ─────────────────────────────────────────────────────────────────────────────

const YELP_CATEGORY_MAP: Record<string, string> = {
  restaurants: 'restaurant', food: 'restaurant', bars: 'restaurant', coffee: 'restaurant',
  beauty: 'beauty', hair: 'beauty', nails: 'beauty', skincare: 'beauty', barbers: 'beauty',
  health: 'health', fitness: 'health', gyms: 'health', yoga: 'health',
  retail: 'retail', fashion: 'retail', jewelry: 'retail', bookstores: 'retail',
  tech: 'tech', software: 'tech', marketing: 'tech',
  legal: 'legal', lawyers: 'legal', realestatelaw: 'legal',
  financial: 'finance', banks: 'finance', insurance: 'finance',
  hotels: 'hotel', travel: 'hotel',
  auto: 'auto', automotive: 'auto',
  arts: 'arts', galleries: 'arts', music: 'arts',
  education: 'education', tutors: 'education',
  realestate: 'real-estate',
  construction: 'construction', contractors: 'construction',
  eventplanning: 'events', photographers: 'events',
  media: 'media', radio: 'media', tv: 'media',
};

interface YelpBusiness {
  id: string;
  name: string;
  phone: string;
  location: {
    address1?: string; address2?: string;
    city: string; state?: string; country: string; zip_code?: string;
  };
  coordinates: { latitude: number; longitude: number };
  categories: { alias: string; title: string }[];
  rating: number;
  url: string;
  image_url?: string;
  is_closed: boolean;
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
}

function yelpCategoryToSeshaa(categories: { alias: string }[]): string {
  for (const cat of categories) {
    const mapped = YELP_CATEGORY_MAP[cat.alias];
    if (mapped) return mapped;
  }
  return 'other';
}

export async function scrapeYelp(
  city: typeof DIASPORA_CITIES[number],
  apiKey: string,
  dryRun = false
): Promise<number> {
  const { city: cityName, country, yelpLocation } = city;
  console.log(`  🔍 Yelp: ${cityName}, ${country}`);

  let total = 0;
  let inserted = 0;
  const PER_PAGE = 50;
  const MAX_RESULTS = 1000; // Yelp max

  try {
    // First call to get total
    const firstRes = await fetchYelp(yelpLocation, apiKey, 0, PER_PAGE);
    if (!firstRes) return 0;

    const cityTotal = Math.min(firstRes.total, MAX_RESULTS);
    console.log(`    → ${cityTotal} black-owned businesses found`);
    total = cityTotal;

    if (!dryRun) {
      inserted += await upsertYelpBusinesses(firstRes.businesses, city);

      // Paginate through remaining results
      const pages = Math.ceil(Math.min(cityTotal, MAX_RESULTS) / PER_PAGE);
      for (let page = 1; page < pages; page++) {
        const offset = page * PER_PAGE;
        await new Promise(r => setTimeout(r, 300)); // rate limit
        const pageRes = await fetchYelp(yelpLocation, apiKey, offset, PER_PAGE);
        if (!pageRes) break;
        inserted += await upsertYelpBusinesses(pageRes.businesses, city);
        process.stdout.write(`\r    ✓ ${inserted}/${cityTotal}`);
      }
      console.log(`\r    ✓ ${inserted}/${cityTotal} inserted/updated`);
    }
  } catch (err) {
    console.error(`    ✗ Yelp error for ${cityName}: ${err}`);
  }

  return dryRun ? total : inserted;
}

async function fetchYelp(
  location: string, apiKey: string, offset: number, limit: number
): Promise<YelpSearchResponse | null> {
  try {
    const params = new URLSearchParams({
      location,
      attributes: 'black_owned',
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    if (res.status === 400) {
      // Location not found in Yelp — skip silently
      return null;
    }
    if (!res.ok) {
      console.error(`    ✗ Yelp HTTP ${res.status} for location: ${location}`);
      return null;
    }
    return await res.json() as YelpSearchResponse;
  } catch (err) {
    console.error(`    ✗ Fetch error: ${err}`);
    return null;
  }
}

async function upsertYelpBusinesses(
  businesses: YelpBusiness[],
  cityConfig: typeof DIASPORA_CITIES[number]
): Promise<number> {
  let count = 0;
  for (const biz of businesses) {
    if (!biz.name || biz.is_closed) continue;
    try {
      const listing = await prisma.listing.upsert({
        where: { osmId: `yelp:${biz.id}` },
        update: {
          phone: biz.phone || null,
          website: biz.url || null,
          latitude: biz.coordinates?.latitude || null,
          longitude: biz.coordinates?.longitude || null,
          logoUrl: biz.image_url || null,
        },
        create: {
          osmId: `yelp:${biz.id}`,
          type: 'BUSINESS',
          name: biz.name.slice(0, 200),
          phone: biz.phone || null,
          email: null,
          address: [biz.location.address1, biz.location.address2].filter(Boolean).join(', ').slice(0, 300) || null,
          city: biz.location.city || cityConfig.city,
          country: biz.location.country || cityConfig.country,
          region: biz.location.state || cityConfig.region,
          category: yelpCategoryToSeshaa(biz.categories),
          description: null,
          website: biz.url || null,
          whatsapp: null,
          latitude: biz.coordinates?.latitude || null,
          longitude: biz.coordinates?.longitude || null,
          photos: biz.image_url ? [biz.image_url] : [],
          logoUrl: biz.image_url || null,
          verified: false,
          active: true,
          language: 'en',
          openingHours: null,
          tags: {
            create: [
              { name: 'black-owned' },
              { name: 'diaspora' },
              { name: cityConfig.region.toLowerCase() },
            ],
          },
        },
      });
      if (listing) count++;
    } catch (_err) {
      // Skip duplicates / constraint errors
    }
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML DIRECTORY SCRAPERS
// ─────────────────────────────────────────────────────────────────────────────

interface ScrapedBusiness {
  name: string;
  city?: string;
  country: string;
  category?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  address?: string;
  sourceUrl: string;
}

/**
 * Scrapes shoppeblack.us — US Black-owned product/service directory
 * Uses their public JSON search endpoint.
 */
export async function scrapeShoppeBlack(dryRun = false): Promise<number> {
  console.log('\n  🛍 Scraping Shoppe Black (shoppeblack.us)...');
  const businesses: ScrapedBusiness[] = [];

  // Shoppe Black has a search endpoint that returns JSON
  const pages = 20; // 25 results/page
  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch(
        `https://shoppeblack.us/wp-json/wp/v2/business?per_page=100&page=${page}&_fields=id,title,acf,link`,
        { headers: { 'User-Agent': 'SeshaaAfrica/1.0 (+https://seshaa.africa)' } }
      );
      if (res.status === 400 || res.status === 404) break; // no more pages
      if (!res.ok) { console.error(`    HTTP ${res.status}`); break; }

      const items = await res.json() as {
        title: { rendered: string };
        acf?: {
          city?: string; state?: string; website?: string;
          phone?: string; email?: string; category?: string; short_description?: string;
        };
        link: string;
      }[];

      if (!items.length) break;

      for (const item of items) {
        const acf = item.acf || {};
        businesses.push({
          name: item.title.rendered.replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''),
          city: acf.city || acf.state || '',
          country: 'United States',
          category: acf.category || 'other',
          phone: acf.phone || '',
          email: acf.email || '',
          website: acf.website || '',
          description: acf.short_description || '',
          sourceUrl: item.link,
        });
      }
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`    Page ${page} error: ${err}`);
      break;
    }
  }

  console.log(`    → ${businesses.length} businesses found`);
  if (dryRun) return businesses.length;
  return await upsertScrapedBusinesses(businesses, 'US', 'Americas');
}

/**
 * Scrapes Official Black Wall Street (officialbws.com)
 * They have a WP REST API.
 */
export async function scrapeOfficialBWS(dryRun = false): Promise<number> {
  console.log('\n  🏛 Scraping Official Black Wall Street (officialbws.com)...');
  const businesses: ScrapedBusiness[] = [];

  const pages = 40;
  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch(
        `https://officialbws.com/wp-json/wp/v2/directory?per_page=100&page=${page}&_fields=id,title,acf,link,excerpt`,
        { headers: { 'User-Agent': 'SeshaaAfrica/1.0 (+https://seshaa.africa)' } }
      );
      if (res.status === 400 || res.status === 404) break;
      if (!res.ok) { console.error(`    HTTP ${res.status}`); break; }

      const items = await res.json() as {
        title: { rendered: string };
        excerpt?: { rendered: string };
        acf?: Record<string, string>;
        link: string;
      }[];

      if (!items.length) break;

      for (const item of items) {
        const acf = item.acf || {};
        const desc = item.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim() || '';
        businesses.push({
          name: item.title.rendered.replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''),
          city: acf.city || acf.location || '',
          country: acf.country || 'United States',
          category: acf.category || acf.business_type || 'other',
          phone: acf.phone || acf.telephone || '',
          email: acf.email || '',
          website: acf.website || acf.url || '',
          description: desc.slice(0, 500),
          address: acf.address || '',
          sourceUrl: item.link,
        });
      }
      await new Promise(r => setTimeout(r, 250));
    } catch (err) {
      console.error(`    Page ${page} error: ${err}`);
      break;
    }
  }

  console.log(`    → ${businesses.length} businesses found`);
  if (dryRun) return businesses.length;
  return await upsertScrapedBusinesses(businesses, 'US', 'Americas');
}

/**
 * Scrapes blackbusinessfinder.co.uk — UK Black-owned business directory
 */
export async function scrapeBlackBusinessFinderUK(dryRun = false): Promise<number> {
  console.log('\n  🇬🇧 Scraping Black Business Finder UK...');
  const businesses: ScrapedBusiness[] = [];

  const pages = 20;
  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch(
        `https://www.blackbusinessfinder.co.uk/wp-json/wp/v2/business?per_page=100&page=${page}&_fields=id,title,acf,link`,
        { headers: { 'User-Agent': 'SeshaaAfrica/1.0 (+https://seshaa.africa)' } }
      );
      if (res.status === 400 || res.status === 404) break;
      if (!res.ok) { console.error(`    HTTP ${res.status}`); break; }

      const items = await res.json() as {
        title: { rendered: string };
        acf?: Record<string, string>;
        link: string;
      }[];
      if (!items.length) break;

      for (const item of items) {
        const acf = item.acf || {};
        businesses.push({
          name: item.title.rendered.replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''),
          city: acf.city || acf.location || '',
          country: 'United Kingdom',
          category: acf.category || 'other',
          phone: acf.phone || '',
          email: acf.email || '',
          website: acf.website || '',
          description: (acf.description || '').slice(0, 500),
          sourceUrl: item.link,
        });
      }
      await new Promise(r => setTimeout(r, 250));
    } catch (err) {
      console.error(`    Page ${page} error: ${err}`);
      break;
    }
  }

  console.log(`    → ${businesses.length} UK businesses found`);
  if (dryRun) return businesses.length;
  return await upsertScrapedBusinesses(businesses, 'GB', 'Europe');
}

/**
 * Scrapes allblack.com — US/UK/Canada directory
 */
export async function scrapeAllBlack(dryRun = false): Promise<number> {
  console.log('\n  🌍 Scraping AllBlack.com...');
  const businesses: ScrapedBusiness[] = [];

  const pages = 30;
  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch(
        `https://allblack.com/wp-json/wp/v2/business?per_page=100&page=${page}&_fields=id,title,acf,link`,
        { headers: { 'User-Agent': 'SeshaaAfrica/1.0 (+https://seshaa.africa)' } }
      );
      if (res.status === 400 || res.status === 404) break;
      if (!res.ok) break;

      const items = await res.json() as {
        title: { rendered: string };
        acf?: Record<string, string>;
        link: string;
      }[];
      if (!items.length) break;

      for (const item of items) {
        const acf = item.acf || {};
        const country = acf.country || (acf.location?.includes('UK') ? 'United Kingdom' : 'United States');
        businesses.push({
          name: item.title.rendered.replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''),
          city: acf.city || '',
          country,
          category: acf.category || 'other',
          phone: acf.phone || '',
          email: acf.email || '',
          website: acf.website || '',
          description: (acf.description || '').slice(0, 500),
          sourceUrl: item.link,
        });
      }
      await new Promise(r => setTimeout(r, 250));
    } catch (err) {
      console.error(`    Page ${page} error: ${err}`);
      break;
    }
  }

  console.log(`    → ${businesses.length} businesses found`);
  if (dryRun) return businesses.length;
  return await upsertScrapedBusinesses(businesses, 'XX', 'Americas');
}

// ─────────────────────────────────────────────────────────────────────────────
// UPSERT HELPER
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_ALIASES: Record<string, string> = {
  food: 'restaurant', 'food & beverage': 'restaurant', 'food and beverage': 'restaurant',
  dining: 'restaurant', restaurant: 'restaurant', cafe: 'restaurant',
  'hair care': 'beauty', 'hair salon': 'beauty', barbershop: 'beauty', salon: 'beauty',
  'health & wellness': 'health', wellness: 'health', healthcare: 'health',
  'fashion & apparel': 'retail', clothing: 'retail', apparel: 'retail', fashion: 'retail',
  'financial services': 'finance', accounting: 'finance', finance: 'finance',
  legal: 'legal', law: 'legal',
  technology: 'tech', software: 'tech', it: 'tech',
  entertainment: 'arts', music: 'arts', art: 'arts',
  'real estate': 'real-estate',
  media: 'media', photography: 'arts',
  education: 'education', tutoring: 'education',
  automotive: 'auto',
  construction: 'construction',
  marketing: 'media', consulting: 'other', professional: 'other',
};

function normalizeCategory(raw?: string): string {
  if (!raw) return 'other';
  const lower = raw.toLowerCase().trim();
  return CATEGORY_ALIASES[lower] || lower || 'other';
}

async function upsertScrapedBusinesses(
  businesses: ScrapedBusiness[],
  _defaultCountryCode: string,
  region: string
): Promise<number> {
  let count = 0;
  for (const biz of businesses) {
    if (!biz.name.trim()) continue;
    // Dedupe key: name + city + country, normalized
    const dedupeKey = `dir:${biz.country}:${biz.city}:${biz.name}`
      .toLowerCase().replace(/[^a-z0-9:]/g, '').slice(0, 200);

    try {
      await prisma.listing.upsert({
        where: { osmId: dedupeKey },
        update: {
          phone: biz.phone || null,
          website: biz.website || null,
          description: biz.description || null,
        },
        create: {
          osmId: dedupeKey,
          type: 'BUSINESS',
          name: biz.name.slice(0, 200),
          phone: biz.phone || null,
          email: biz.email || null,
          address: biz.address?.slice(0, 300) || null,
          city: biz.city?.slice(0, 100) || 'Unknown',
          country: biz.country,
          region: region,
          category: normalizeCategory(biz.category),
          description: biz.description?.slice(0, 1000) || null,
          website: biz.website || null,
          whatsapp: null,
          latitude: null,
          longitude: null,
          photos: [],
          verified: false,
          active: true,
          language: 'en',
          openingHours: null,
          tags: {
            create: [
              { name: 'black-owned' },
              { name: 'diaspora' },
              { name: region.toLowerCase() },
            ],
          },
        },
      });
      count++;
    } catch (_err) {
      // Skip duplicates
    }
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RUNNER
// ─────────────────────────────────────────────────────────────────────────────

export interface ScrapeBlackOwnedOptions {
  source?: 'yelp' | 'html' | 'all';
  region?: 'us' | 'uk' | 'ca' | 'au' | 'eu' | 'caribbean' | 'brazil' | 'asia' | 'all';
  dryRun?: boolean;
  onProgress?: (msg: string) => void;
}

export async function scrapeBlackOwned(opts: ScrapeBlackOwnedOptions = {}): Promise<{
  yelp: number; shoppeblack: number; bws: number; ukfinder: number; allblack: number; total: number;
}> {
  const { source = 'all', region = 'all', dryRun = false, onProgress } = opts;
  const log = (msg: string) => { console.log(msg); onProgress?.(msg); };

  const yelpKey = process.env.YELP_API_KEY;
  const results = { yelp: 0, shoppeblack: 0, bws: 0, ukfinder: 0, allblack: 0, total: 0 };

  log(`\n🌍 Seshaa Black-Owned Business Scraper`);
  log(`  Source: ${source} | Region: ${region} | Dry run: ${dryRun}`);

  // ── Yelp ──
  if ((source === 'yelp' || source === 'all') && yelpKey) {
    log(`\n📍 Yelp Fusion (black_owned attribute):`);
    const REGION_FILTER: Record<string, string[]> = {
      us: ['United States'],
      uk: ['United Kingdom'],
      ca: ['Canada'],
      au: ['Australia'],
      eu: ['France', 'Netherlands', 'Germany', 'Belgium', 'Portugal', 'Italy', 'Spain', 'Sweden', 'Norway', 'Denmark', 'Switzerland'],
      caribbean: ['Jamaica', 'Trinidad and Tobago', 'Barbados', 'Bahamas', 'Haiti', 'Dominican Republic', 'Guyana'],
      brazil: ['Brazil'],
      asia: ['China', 'Japan', 'United Arab Emirates'],
    };

    const citiesToScrape = region === 'all'
      ? DIASPORA_CITIES
      : DIASPORA_CITIES.filter(c => (REGION_FILTER[region] || []).includes(c.country));

    for (const city of citiesToScrape) {
      const n = await scrapeYelp(city, yelpKey, dryRun);
      results.yelp += n;
      await new Promise(r => setTimeout(r, 500));
    }
    log(`  ✅ Yelp total: ${results.yelp}`);
  } else if ((source === 'yelp' || source === 'all') && !yelpKey) {
    log(`  ⚠ YELP_API_KEY not set — skipping Yelp (get free key at yelp.com/developers)`);
  }

  // ── HTML Directories ──
  if (source === 'html' || source === 'all') {
    if (region === 'all' || region === 'us') {
      results.shoppeblack = await scrapeShoppeBlack(dryRun);
      log(`  ✅ Shoppe Black: ${results.shoppeblack}`);

      results.bws = await scrapeOfficialBWS(dryRun);
      log(`  ✅ Official BWS: ${results.bws}`);

      results.allblack = await scrapeAllBlack(dryRun);
      log(`  ✅ AllBlack: ${results.allblack}`);
    }

    if (region === 'all' || region === 'uk') {
      results.ukfinder = await scrapeBlackBusinessFinderUK(dryRun);
      log(`  ✅ UK Finder: ${results.ukfinder}`);
    }
  }

  results.total = results.yelp + results.shoppeblack + results.bws + results.ukfinder + results.allblack;
  log(`\n✅ Done. Total inserted/updated: ${results.total}`);

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI ENTRY
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const source  = (args.find((_, i) => args[i - 1] === '--source')  as ScrapeBlackOwnedOptions['source'])  || 'all';
  const region  = (args.find((_, i) => args[i - 1] === '--region')  as ScrapeBlackOwnedOptions['region'])  || 'all';
  const dryRun  = args.includes('--dry-run');

  try {
    await scrapeBlackOwned({ source, region, dryRun });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
}
