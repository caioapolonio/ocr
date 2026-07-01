import fastifyRateLimit from '@fastify/rate-limit';
import { API_VERSION } from '@ocr/core';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { registerErrorHandler } from './plugins/error-handler';
import { registerSwagger } from './plugins/swagger';
import type { CardsRepository } from './modules/cards/cards.repository';
import { CardsService } from './modules/cards/cards.service';
import { cardsRoutes } from './modules/cards/cards.routes';
import { SyncService } from './modules/sync/sync.service';
import { syncRoutes } from './modules/sync/sync.routes';
import type { UsersRepository } from './modules/auth/users.repository';
import { AuthService } from './modules/auth/auth.service';
import { authRoutes } from './modules/auth/auth.routes';
import { registerAuth } from './plugins/auth';

export interface AppDeps {
  cardsRepository: CardsRepository;
  usersRepository: UsersRepository;
  jwtSecret: string;
  /** Máx. de requisições por IP por minuto (rate-limit). Use um valor alto nos testes. */
  rateLimitMax?: number;
  logger?: FastifyServerOptions['logger'];
}

/**
 * Monta a aplicação Fastify (sem escutar). Recebe o repositório por injeção,
 * o que mantém o app puro e testável via `app.inject()` (ver cards.test.ts).
 */
export async function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: deps.logger ?? false }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);

  // Swagger precisa ser registrado antes das rotas que ele documenta.
  await registerSwagger(app);
  await registerAuth(app, deps.jwtSecret);
  await app.register(fastifyRateLimit, { max: deps.rateLimitMax ?? 100, timeWindow: '1 minute' });

  app.get(
    '/health',
    { schema: { tags: ['health'], response: { 200: z.object({ status: z.literal('ok') }) } } },
    () => ({ status: 'ok' as const }),
  );

  const authService = new AuthService(deps.usersRepository, (userId) =>
    app.jwt.sign({ sub: userId }),
  );
  await app.register(authRoutes, { prefix: `/api/${API_VERSION}`, service: authService });

  const service = new CardsService(deps.cardsRepository);
  await app.register(cardsRoutes, { prefix: `/api/${API_VERSION}`, service });

  const syncService = new SyncService(deps.cardsRepository);
  await app.register(syncRoutes, { prefix: `/api/${API_VERSION}`, service: syncService });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
