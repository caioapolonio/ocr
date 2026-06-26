import { createServerCardSchema, serverCardSchema, updateServerCardSchema } from '@ocr/core';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { CardsService } from './cards.service';

const idParamSchema = z.object({ id: z.string().uuid() });

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  includeDeleted: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const errorSchema = z.object({ message: z.string() });

export interface CardsRoutesOptions {
  service: CardsService;
}

export const cardsRoutes: FastifyPluginAsyncZod<CardsRoutesOptions> = async (app, opts) => {
  const { service } = opts;

  app.get(
    '/cards',
    {
      schema: {
        tags: ['cards'],
        summary: 'Lista carteirinhas',
        querystring: listQuerySchema,
        response: { 200: z.array(serverCardSchema) },
      },
    },
    (request) => service.list(request.query),
  );

  app.get(
    '/cards/:id',
    {
      schema: {
        tags: ['cards'],
        summary: 'Recupera uma carteirinha por id',
        params: idParamSchema,
        response: { 200: serverCardSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      const card = await service.get(request.params.id);
      if (!card) return reply.code(404).send({ message: 'Carteirinha não encontrada' });
      return card;
    },
  );

  app.post(
    '/cards',
    {
      schema: {
        tags: ['cards'],
        summary: 'Cria uma carteirinha',
        body: createServerCardSchema,
        response: { 201: serverCardSchema },
      },
    },
    async (request, reply) => {
      const card = await service.create(request.body);
      return reply.code(201).send(card);
    },
  );

  app.put(
    '/cards/:id',
    {
      schema: {
        tags: ['cards'],
        summary: 'Atualiza uma carteirinha (incrementa version)',
        params: idParamSchema,
        body: updateServerCardSchema,
        response: { 200: serverCardSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      const card = await service.update(request.params.id, request.body);
      if (!card) return reply.code(404).send({ message: 'Carteirinha não encontrada' });
      return card;
    },
  );

  app.delete(
    '/cards/:id',
    {
      schema: {
        tags: ['cards'],
        summary: 'Remove uma carteirinha (soft-delete)',
        params: idParamSchema,
        response: { 200: z.object({ success: z.literal(true) }), 404: errorSchema },
      },
    },
    async (request, reply) => {
      const ok = await service.softDelete(request.params.id);
      if (!ok) return reply.code(404).send({ message: 'Carteirinha não encontrada' });
      return { success: true as const };
    },
  );
};
