import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Decoupled da validação estrita de env (src/env.ts) para que `db:generate`
// funcione mesmo sem .env. O fallback é o Postgres local do docker-compose
// (credenciais apenas locais — ver specs.md §10).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://ocr:ocr@localhost:55432/ocr',
  },
});
