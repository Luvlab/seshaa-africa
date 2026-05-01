import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Pooler URL for runtime queries (port 6543, PgBouncer transaction mode)
const poolerUrl = process.env.DATABASE_URL || '';

// Session-mode pooler: same host but port 5432, no pgbouncer params.
// Supports prepared statements → safe for db push / migrate.
function sessionUrl(raw: string): string {
  if (!raw) return raw;
  const u = new URL(raw);
  u.port = '5432';
  u.searchParams.delete('pgbouncer');
  u.searchParams.delete('statement_cache_size');
  return u.toString();
}
const sessionPoolerUrl = sessionUrl(poolerUrl);

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    // Session-mode pooler for schema engine (prepared statements supported)
    url: sessionPoolerUrl,
  },
  migrate: {
    adapter: () => {
      const client = new pg.Pool({
        connectionString: sessionPoolerUrl,
        ssl: { rejectUnauthorized: false },
      });
      return new PrismaPg(client);
    },
  },
});
