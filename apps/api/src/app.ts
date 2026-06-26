import { API_VERSION } from '@ocr/core';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { registerErrorHandler } from './plugins/error-handler';
import { registerSwagger } from './plugins/swagger';
import type { CardsRepository } from './modules/cards/cards.repository';
import { CardsService } from './modules/cards/cards.service';
import { cardsRoutes } from './modules/cards/cards.routes';

export interface AppDeps {
  cardsRepository: CardsRepository;
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

  app.get(
    '/health',
    { schema: { tags: ['health'], response: { 200: z.object({ status: z.literal('ok') }) } } },
    () => ({ status: 'ok' as const }),
  );

  const service = new CardsService(deps.cardsRepository);
  await app.register(cardsRoutes, { prefix: `/api/${API_VERSION}`, service });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
