import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Set DATABASE_URL in `.env` for real DB access (migrate, studio, runtime).
 * A placeholder is only used when unset so `prisma generate` works without a live DB.
 */
const databaseUrl =
  process.env.DATABASE_URL?.trim() || 'postgresql://localhost:5432/postgres';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
