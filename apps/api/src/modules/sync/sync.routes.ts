import { syncPullResponseSchema, syncPushRequestSchema, syncPushResponseSchema } from '@ocr/core';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { SyncService } from './sync.service';

const pullQuerySchema = z.object({
  since: z.string().datetime({ offset: true }).optional(),
});

export interface SyncRoutesOptions {
  service: SyncService;
}

export const syncRoutes: FastifyPluginAsyncZod<SyncRoutesOptions> = async (app, opts) => {
  const { service } = opts;

  app.post(
    '/sync/push',
    {
      schema: {
        tags: ['sync'],
        summary: 'Envia mudanças locais (Last-Write-Wins por updatedAt)',
        body: syncPushRequestSchema,
        response: { 200: syncPushResponseSchema },
      },
    },
    (request) => service.push(request.body),
  );

  app.get(
    '/sync/pull',
    {
      schema: {
        tags: ['sync'],
        summary: 'Baixa as mudanças desde `since` (ISO); sem `since` = tudo',
        querystring: pullQuerySchema,
        response: { 200: syncPullResponseSchema },
      },
    },
    (request) => service.pull(request.query.since ?? null),
  );
};
