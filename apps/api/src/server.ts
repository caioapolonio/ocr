import { buildApp } from './app';
import { db } from './db/client';
import { env } from './env';
import { DrizzleCardsRepository } from './modules/cards/cards.drizzle';

async function main(): Promise<void> {
  const app = await buildApp({
    cardsRepository: new DrizzleCardsRepository(db),
    logger: { level: env.LOG_LEVEL },
  });

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  app.log.info(`📚 Swagger UI em http://localhost:${env.API_PORT}/docs`);
}

main().catch((error) => {
  console.error('Falha ao iniciar a API:', error);
  process.exit(1);
});
