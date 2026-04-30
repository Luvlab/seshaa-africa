import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// For db push via pooler (statement_cache_size=0 avoids pgbouncer prepared-stmt conflict)
const rawUrl = process.env.DATABASE_URL || '';
const dbUrl = rawUrl.includes('pgbouncer=true')
  ? rawUrl.replace('pgbouncer=true', 'pgbouncer=true&statement_cache_size=0')
  : rawUrl;

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: dbUrl,
  },
  migrate: {
    adapter: () => {
      const client = new pg.Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      });
      return new PrismaPg(client);
    },
  },
});
