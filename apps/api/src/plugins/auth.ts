import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler/onRequest que exige um JWT válido (responde 401 caso contrário). */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Registra o `@fastify/jwt` (não encapsulado → `request.jwtVerify`/`app.jwt`
 * disponíveis em toda a app) e decora o `authenticate`.
 */
export async function registerAuth(app: FastifyInstance, secret: string): Promise<void> {
  await app.register(fastifyJwt, { secret, sign: { expiresIn: '30d' } });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      await reply.code(401).send({ message: 'Não autenticado' });
    }
  });
}
