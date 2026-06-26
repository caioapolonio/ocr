import 'dotenv/config';
import { z } from 'zod';

/**
 * Configuração da aplicação, validada na borda. Todos os segredos vêm de
 * variáveis de ambiente (apps/api/.env, criado a partir de .env.example) —
 * nada sensível é versionado.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.issues);
  throw new Error('Configuração de ambiente inválida. Verifique apps/api/.env');
}

export const env = parsed.data;
export type Env = typeof env;
