import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../env';

// Migrador programático (rodar com `pnpm --filter @ocr/api db:migrate`).
const sql = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: './src/db/migrations' });
await sql.end();

console.log('✅ Migrations aplicadas com sucesso.');
