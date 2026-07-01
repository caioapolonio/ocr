import { authResponseSchema, credentialsSchema } from '@ocr/core';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { AuthService } from './auth.service';

const errorSchema = z.object({ message: z.string() });

export interface AuthRoutesOptions {
  service: AuthService;
}

export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, opts) => {
  const { service } = opts;

  app.post(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Cria uma conta e retorna um token JWT',
        body: credentialsSchema,
        response: { 201: authResponseSchema, 409: errorSchema },
      },
    },
    async (request, reply) => {
      const result = await service.register(request.body);
      if (!result.ok) return reply.code(409).send({ message: 'E-mail já cadastrado' });
      return reply.code(201).send(result.data);
    },
  );

  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Autentica e retorna um token JWT',
        body: credentialsSchema,
        response: { 200: authResponseSchema, 401: errorSchema },
      },
    },
    async (request, reply) => {
      const result = await service.login(request.body);
      if (!result.ok) return reply.code(401).send({ message: 'Credenciais inválidas' });
      return result.data;
    },
  );
};
