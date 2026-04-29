/**
 * OpenStreetMap Overpass API scraper for African businesses.
 * Uses the free, legal Overpass API — no API key needed.
 * Run: npx ts-node src/scraper/osm.ts [--city Lagos] [--country Nigeria] [--limit 500]
 */
import prisma from '../db';

interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OSMElement[];
}

// OSM amenity/shop → our category
const OSM_CATEGORY_MAP: Record<string, string> = {
  restaurant: 'restaurant', cafe: 'restaurant', fast_food: 'restaurant', bar: 'restaurant',
  food_court: 'restaurant', bakery: 'restaurant', ice_cream: 'restaurant',
  hospital: 'health', clinic: 'health', pharmacy: 'health', dentist: 'health',
  doctors: 'health', veterinary: 'health', health_post: 'health',
  school: 'education', university: 'education', college: 'education', kindergarten: 'education',
  library: 'education', language_school: 'education',
  bank: 'finance', atm: 'finance', bureau_de_change: 'finance', mobile_money: 'finance',
  microfinance: 'finance', insurance: 'finance',
  hotel: 'hotel', motel: 'hotel', hostel: 'hotel', guest_house: 'hotel', lodging: 'hotel',
  chalet: 'hotel', apartment: 'hotel',
  bus_station: 'transport', taxi: 'transport', fuel: 'transport', car_rental: 'transport',
  motorcycle: 'transport', ferry_terminal: 'transport', airport: 'transport',
  supermarket: 'retail', mall: 'retail', marketplace: 'retail', convenience: 'retail',
  clothes: 'retail', electronics: 'retail', hardware: 'retail', furniture: 'retail',
  computer: 'tech', telecommunications: 'tech', internet_cafe: 'tech',
  place_of_worship: 'church', church: 'church', mosque: 'church', temple: 'church',
  beauty: 'beauty', hairdresser: 'beauty', massage: 'beauty', cosmetics: 'beauty',
  car_repair: 'auto', car_wash: 'auto', tyres: 'auto', auto_parts: 'auto',
  farm: 'agriculture', greenhouse: 'agriculture', agrarian: 'agriculture',
  construction: 'construction',
  townhall: 'government', police: 'government', post_office: 'government', embassy: 'government',
  courthouse: 'government', fire_station: 'government',
  ngo: 'ngo', social_facility: 'ngo', charity: 'ngo',
  lawyer: 'legal', notary: 'legal', legal: 'legal',
};

// 54 African countries with major city bounding boxes
export const AFRICAN_CITIES = [
  // West Africa
  { city: 'Lagos', country: 'Nigeria', countryCode: 'NG', bbox: [3.0894, 6.3932, 3.7, 6.7027] },
  { city: 'Abuja', country: 'Nigeria', countryCode: 'NG', bbox: [7.0, 8.8, 7.6, 9.3] },
  { city: 'Kano', country: 'Nigeria', countryCode: 'NG', bbox: [8.4, 11.8, 8.7, 12.1] },
  { city: 'Ibadan', country: 'Nigeria', countryCode: 'NG', bbox: [3.8, 7.3, 4.1, 7.5] },
  { city: 'Port Harcourt', country: 'Nigeria', countryCode: 'NG', bbox: [6.9, 4.7, 7.2, 4.9] },
  { city: 'Accra', country: 'Ghana', countryCode: 'GH', bbox: [-0.3, 5.5, 0.0, 5.7] },
  { city: 'Kumasi', country: 'Ghana', countryCode: 'GH', bbox: [-1.7, 6.6, -1.5, 6.8] },
  { city: 'Dakar', country: 'Senegal', countryCode: 'SN', bbox: [-17.5, 14.6, -17.3, 14.8] },
  { city: 'Abidjan', country: 'Côte d\'Ivoire', countryCode: 'CI', bbox: [-4.1, 5.2, -3.9, 5.4] },
  { city: 'Conakry', country: 'Guinea', countryCode: 'GN', bbox: [-13.8, 9.4, -13.5, 9.7] },
  { city: 'Bamako', country: 'Mali', countryCode: 'ML', bbox: [-8.1, 12.5, -7.9, 12.7] },
  { city: 'Ouagadougou', country: 'Burkina Faso', countryCode: 'BF', bbox: [-1.7, 12.2, -1.4, 12.5] },
  { city: 'Niamey', country: 'Niger', countryCode: 'NE', bbox: [2.0, 13.4, 2.2, 13.6] },
  { city: 'Lomé', country: 'Togo', countryCode: 'TG', bbox: [1.1, 6.0, 1.3, 6.2] },
  { city: 'Cotonou', country: 'Benin', countryCode: 'BJ', bbox: [2.3, 6.3, 2.5, 6.5] },
  { city: 'Freetown', country: 'Sierra Leone', countryCode: 'SL', bbox: [-13.3, 8.4, -13.1, 8.6] },
  { city: 'Monrovia', country: 'Liberia', countryCode: 'LR', bbox: [-10.9, 6.2, -10.7, 6.4] },
  { city: 'Banjul', country: 'Gambia', countryCode: 'GM', bbox: [-16.7, 13.4, -16.5, 13.5] },
  { city: 'Bissau', country: 'Guinea-Bissau', countryCode: 'GW', bbox: [-15.7, 11.8, -15.5, 11.9] },
  { city: 'Praia', country: 'Cape Verde', countryCode: 'CV', bbox: [-23.6, 14.8, -23.4, 15.0] },
  // Central Africa
  { city: 'Kinshasa', country: 'DR Congo', countryCode: 'CD', bbox: [15.2, -4.5, 15.5, -4.2] },
  { city: 'Lubumbashi', country: 'DR Congo', countryCode: 'CD', bbox: [27.4, -11.8, 27.6, -11.5] },
  { city: 'Douala', country: 'Cameroon', countryCode: 'CM', bbox: [9.6, 4.0, 9.9, 4.2] },
  { city: 'Yaoundé', country: 'Cameroon', countryCode: 'CM', bbox: [11.4, 3.7, 11.6, 3.9] },
  { city: 'Libreville', country: 'Gabon', countryCode: 'GA', bbox: [9.3, 0.3, 9.5, 0.5] },
  { city: 'Brazzaville', country: 'Republic of Congo', countryCode: 'CG', bbox: [15.2, -4.4, 15.4, -4.2] },
  { city: 'Bangui', country: 'CAR', countryCode: 'CF', bbox: [18.5, 4.3, 18.7, 4.5] },
  { city: 'N\'Djamena', country: 'Chad', countryCode: 'TD', bbox: [15.0, 12.0, 15.2, 12.2] },
  { city: 'Malabo', country: 'Equatorial Guinea', countryCode: 'GQ', bbox: [8.7, 3.7, 8.8, 3.8] },
  // East Africa
  { city: 'Nairobi', country: 'Kenya', countryCode: 'KE', bbox: [36.6, -1.4, 37.0, -1.1] },
  { city: 'Mombasa', country: 'Kenya', countryCode: 'KE', bbox: [39.6, -4.1, 39.8, -3.9] },
  { city: 'Addis Ababa', country: 'Ethiopia', countryCode: 'ET', bbox: [38.6, 8.9, 38.9, 9.1] },
  { city: 'Dar es Salaam', country: 'Tanzania', countryCode: 'TZ', bbox: [39.1, -7.0, 39.4, -6.7] },
  { city: 'Zanzibar City', country: 'Tanzania', countryCode: 'TZ', bbox: [39.1, -6.2, 39.2, -6.1] },
  { city: 'Kampala', country: 'Uganda', countryCode: 'UG', bbox: [32.5, 0.2, 32.7, 0.4] },
  { city: 'Kigali', country: 'Rwanda', countryCode: 'RW', bbox: [30.0, -1.98, 30.2, -1.8] },
  { city: 'Bujumbura', country: 'Burundi', countryCode: 'BI', bbox: [29.3, -3.4, 29.5, -3.3] },
  { city: 'Juba', country: 'South Sudan', countryCode: 'SS', bbox: [31.5, 4.8, 31.7, 5.0] },
  { city: 'Mogadishu', country: 'Somalia', countryCode: 'SO', bbox: [45.2, 2.0, 45.5, 2.1] },
  { city: 'Djibouti City', country: 'Djibouti', countryCode: 'DJ', bbox: [43.1, 11.5, 43.2, 11.6] },
  { city: 'Asmara', country: 'Eritrea', countryCode: 'ER', bbox: [38.9, 15.3, 39.1, 15.4] },
  { city: 'Antananarivo', country: 'Madagascar', countryCode: 'MG', bbox: [47.4, -19.0, 47.6, -18.8] },
  { city: 'Port Louis', country: 'Mauritius', countryCode: 'MU', bbox: [57.4, -20.2, 57.6, -20.1] },
  // Southern Africa
  { city: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', bbox: [27.9, -26.3, 28.2, -26.0] },
  { city: 'Cape Town', country: 'South Africa', countryCode: 'ZA', bbox: [18.3, -34.1, 18.6, -33.8] },
  { city: 'Durban', country: 'South Africa', countryCode: 'ZA', bbox: [30.9, -30.0, 31.1, -29.8] },
  { city: 'Pretoria', country: 'South Africa', countryCode: 'ZA', bbox: [28.1, -25.9, 28.4, -25.6] },
  { city: 'Lusaka', country: 'Zambia', countryCode: 'ZM', bbox: [28.2, -15.5, 28.5, -15.3] },
  { city: 'Harare', country: 'Zimbabwe', countryCode: 'ZW', bbox: [31.0, -17.9, 31.2, -17.7] },
  { city: 'Lilongwe', country: 'Malawi', countryCode: 'MW', bbox: [33.7, -14.0, 33.9, -13.9] },
  { city: 'Maputo', country: 'Mozambique', countryCode: 'MZ', bbox: [32.5, -26.0, 32.7, -25.8] },
  { city: 'Gaborone', country: 'Botswana', countryCode: 'BW', bbox: [25.9, -24.8, 26.1, -24.6] },
  { city: 'Windhoek', country: 'Namibia', countryCode: 'NA', bbox: [17.0, -22.6, 17.2, -22.5] },
  { city: 'Mbabane', country: 'Eswatini', countryCode: 'SZ', bbox: [31.1, -26.4, 31.2, -26.3] },
  { city: 'Maseru', country: 'Lesotho', countryCode: 'LS', bbox: [27.4, -29.4, 27.6, -29.2] },
  { city: 'Luanda', country: 'Angola', countryCode: 'AO', bbox: [13.2, -9.0, 13.4, -8.8] },
  // North Africa
  { city: 'Cairo', country: 'Egypt', countryCode: 'EG', bbox: [31.1, 29.9, 31.5, 30.2] },
  { city: 'Alexandria', country: 'Egypt', countryCode: 'EG', bbox: [29.8, 31.1, 30.1, 31.3] },
  { city: 'Casablanca', country: 'Morocco', countryCode: 'MA', bbox: [-7.8, 33.5, -7.5, 33.7] },
  { city: 'Rabat', country: 'Morocco', countryCode: 'MA', bbox: [-7.0, 33.9, -6.8, 34.1] },
  { city: 'Tunis', country: 'Tunisia', countryCode: 'TN', bbox: [10.1, 36.7, 10.3, 36.9] },
  { city: 'Algiers', country: 'Algeria', countryCode: 'DZ', bbox: [2.9, 36.6, 3.2, 36.9] },
  { city: 'Tripoli', country: 'Libya', countryCode: 'LY', bbox: [13.1, 32.8, 13.3, 33.0] },
  { city: 'Khartoum', country: 'Sudan', countryCode: 'SD', bbox: [32.4, 15.4, 32.7, 15.7] },
];

function mapOsmCategory(tags: Record<string, string>): string {
  const amenity = tags.amenity || '';
  const shop = tags.shop || '';
  const tourism = tags.tourism || '';
  const office = tags.office || '';

  const key = amenity || shop || tourism || office;
  return OSM_CATEGORY_MAP[key] || OSM_CATEGORY_MAP[amenity] || OSM_CATEGORY_MAP[shop] || 'other';
}

function extractPhone(tags: Record<string, string>): string | null {
  return tags['contact:phone'] || tags.phone || tags['phone:mobile'] || null;
}

function extractWebsite(tags: Record<string, string>): string | null {
  const url = tags['contact:website'] || tags.website || tags.url || null;
  if (!url) return null;
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return url.startsWith('http') ? url : `https://${url}`;
  } catch { return null; }
}

async function queryOverpass(bbox: number[], cityName: string): Promise<OSMElement[]> {
  const [west, south, east, north] = bbox;
  const query = `
[out:json][timeout:90][maxsize:134217728];
(
  node["name"]["amenity"](${south},${west},${north},${east});
  node["name"]["shop"](${south},${west},${north},${east});
  node["name"]["tourism"~"hotel|motel|hostel|guest_house|apartment"](${south},${west},${north},${east});
  node["name"]["office"](${south},${west},${north},${east});
  way["name"]["amenity"](${south},${west},${north},${east});
  way["name"]["shop"](${south},${west},${north},${east});
);
out center body;`;

  const url = 'https://overpass-api.de/api/interpreter';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) throw new Error(`Overpass error ${response.status}: ${await response.text()}`);
  const data = await response.json() as OverpassResponse;
  console.log(`  ↳ Got ${data.elements.length} raw elements for ${cityName}`);
  return data.elements;
}

function osmToListing(el: OSMElement, city: string, country: string) {
  if (!el.tags?.name) return null;
  const tags = el.tags;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;

  const category = mapOsmCategory(tags);
  const phone = extractPhone(tags);
  const website = extractWebsite(tags);
  const address = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
  ].filter(Boolean).join(' ') || tags['addr:full'] || null;

  return {
    type: 'BUSINESS' as const,
    name: tags.name.slice(0, 200),
    phone: phone?.slice(0, 30) || null,
    email: (tags['contact:email'] || tags.email || null)?.slice(0, 200),
    address: address?.slice(0, 300) || null,
    city,
    country,
    category,
    description: (tags.description || tags['description:en'] || null)?.slice(0, 1000),
    website,
    whatsapp: null,
    latitude: lat || null,
    longitude: lon || null,
    verified: false,
    active: true,
    language: 'en',
    osmId: String(el.id),
    openingHours: tags.opening_hours || null,
  };
}

async function scrapeCity(
  cityConfig: typeof AFRICAN_CITIES[number],
  dryRun = false
): Promise<number> {
  const { city, country, bbox } = cityConfig;
  console.log(`\n🔍 Scraping ${city}, ${country}...`);

  let elements: OSMElement[];
  try {
    elements = await queryOverpass(bbox, city);
  } catch (err) {
    console.error(`  ✗ Failed: ${err}`);
    return 0;
  }

  const listings = elements
    .map(el => osmToListing(el, city, country))
    .filter(Boolean) as ReturnType<typeof osmToListing>[];

  // Dedupe by OSM ID
  const unique = new Map<string, NonNullable<ReturnType<typeof osmToListing>>>();
  for (const l of listings) {
    if (l && l.osmId && !unique.has(l.osmId)) unique.set(l.osmId, l);
  }

  const toInsert = Array.from(unique.values());
  console.log(`  → ${toInsert.length} unique businesses to insert`);

  if (dryRun) return toInsert.length;

  let inserted = 0;
  const BATCH = 50;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    await Promise.all(
      batch.map(l =>
        prisma.listing.upsert({
          where: { osmId: l.osmId! },
          update: {
            phone: l.phone,
            website: l.website,
            latitude: l.latitude,
            longitude: l.longitude,
          },
          create: l,
        }).catch(() => null)
      )
    );
    inserted += batch.length;
    process.stdout.write(`\r  ✓ ${inserted}/${toInsert.length}`);
  }
  console.log('');
  return inserted;
}

async function main() {
  const args = process.argv.slice(2);
  const cityArg = args.find((_, i) => args[i - 1] === '--city');
  const countryArg = args.find((_, i) => args[i - 1] === '--country');
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((_, i) => args[i - 1] === '--limit');
  const limit = limitArg ? parseInt(limitArg) : undefined;

  let cities = AFRICAN_CITIES;
  if (cityArg) cities = cities.filter(c => c.city.toLowerCase().includes(cityArg.toLowerCase()));
  if (countryArg) cities = cities.filter(c => c.country.toLowerCase().includes(countryArg.toLowerCase()));
  if (limit) cities = cities.slice(0, limit);

  console.log(`🌍 Seshaa OSM Scraper`);
  console.log(`  Cities: ${cities.length} | Dry run: ${dryRun}`);
  console.log(`  Source: OpenStreetMap Overpass API (free, open data)`);

  let total = 0;
  for (const cityConfig of cities) {
    const count = await scrapeCity(cityConfig, dryRun);
    total += count;
    // Respect Overpass rate limits
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n✅ Done. Total inserted: ${total}`);
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
