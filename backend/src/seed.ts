import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
  max: 3,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const SEED_LISTINGS = [
  { type: 'BUSINESS' as const, name: 'Eko Hospital & Specialists Centre', phone: '+234-1-2709991', city: 'Lagos', country: 'Nigeria', category: 'health', description: 'Leading private hospital in Lagos, Nigeria.', verified: true, viewCount: 1200 },
  { type: 'BUSINESS' as const, name: 'Accra Mall', phone: '+233-30-2765588', city: 'Accra', country: 'Ghana', category: 'retail', description: 'The largest shopping mall in Ghana.', verified: true, viewCount: 980 },
  { type: 'BUSINESS' as const, name: 'Safaricom PLC', phone: '+254-722-000000', city: 'Nairobi', country: 'Kenya', category: 'tech', website: 'https://safaricom.co.ke', description: 'Leading telecom operator in East Africa. M-Pesa mobile money.', verified: true, viewCount: 3400 },
  { type: 'BUSINESS' as const, name: 'Ethiopian Airlines', phone: '+251-116-179900', city: 'Addis Ababa', country: 'Ethiopia', category: 'transport', website: 'https://ethiopianairlines.com', description: "Africa's largest and most profitable airline.", verified: true, viewCount: 5600 },
  { type: 'BUSINESS' as const, name: 'Radisson Blu Hotel Dakar', phone: '+221-33-869-3000', city: 'Dakar', country: 'Senegal', category: 'hotel', description: 'Premier 5-star hotel in the heart of Dakar.', verified: true, viewCount: 720 },
  { type: 'BUSINESS' as const, name: 'Orange Money Côte d\'Ivoire', phone: '+225-07-07-07070', city: 'Abidjan', country: 'Côte d\'Ivoire', category: 'finance', description: 'Mobile money & financial services across West Africa.', verified: true, viewCount: 1800 },
  { type: 'GOVERNMENT' as const, name: 'Rwanda Development Board', phone: '+250-788-151122', city: 'Kigali', country: 'Rwanda', category: 'government', website: 'https://rdb.rw', description: 'Investment promotion and business development in Rwanda.', verified: true, viewCount: 450 },
  { type: 'NGO' as const, name: 'African Union Commission', phone: '+251-11-5517700', city: 'Addis Ababa', country: 'Ethiopia', category: 'ngo', website: 'https://au.int', description: 'Continental body of the African Union.', verified: true, viewCount: 2100 },
  { type: 'BUSINESS' as const, name: 'Jumia Nigeria', phone: '+234-1-4482000', city: 'Lagos', country: 'Nigeria', category: 'retail', website: 'https://jumia.com.ng', description: 'Africa\'s leading e-commerce marketplace.', verified: true, viewCount: 4200 },
  { type: 'BUSINESS' as const, name: 'Clinique de la Madeleine', phone: '+221-33-823-1010', city: 'Dakar', country: 'Senegal', category: 'health', description: 'Référence médicale au Sénégal depuis 1960.', verified: false, viewCount: 310 },
  { type: 'BUSINESS' as const, name: 'Kampala International University', phone: '+256-41-4273813', city: 'Kampala', country: 'Uganda', category: 'education', website: 'https://kiu.ac.ug', description: 'Leading private university in Uganda & East Africa.', verified: true, viewCount: 890 },
  { type: 'BUSINESS' as const, name: 'Nando\'s South Africa', phone: '+27-11-476-4460', city: 'Johannesburg', country: 'South Africa', category: 'restaurant', description: 'Home of PERi-PERi chicken, proudly South African.', verified: true, viewCount: 1560 },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const l of SEED_LISTINGS) {
    await prisma.listing.upsert({
      where: { id: l.name.replace(/\s+/g, '-').toLowerCase().slice(0, 36) },
      update: {},
      create: {
        id: l.name.replace(/\s+/g, '-').toLowerCase().slice(0, 36),
        ...l,
        active: true,
        language: 'en',
        photos: [],
      },
    });
  }

  console.log(`✅ Seeded ${SEED_LISTINGS.length} listings`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
