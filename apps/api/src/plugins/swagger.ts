import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

/** Registra OpenAPI (a partir dos schemas Zod) + Swagger UI em `/docs`. */
export async function registerSwagger<T extends FastifyInstance>(app: T): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Carteirinha OCR API',
        description: 'API REST de carteirinhas de estudante: contas, CRUD e sincronização offline-first.',
        version: '1.0.0',
      },
      tags: [
        { name: 'auth', description: 'Cadastro e login (JWT)' },
        { name: 'cards', description: 'CRUD de carteirinhas' },
        { name: 'sync', description: 'Push/pull do app offline-first (Last-Write-Wins)' },
        { name: 'health', description: 'Status do serviço' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, { routePrefix: '/docs' });
}
