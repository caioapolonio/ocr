import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

function resolveStatusCode(error: unknown): number {
  if (error instanceof ZodError) return 400;
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  return 500;
}

/**
 * Tratamento central de erros: validação (ZodError / FST_ERR_VALIDATION) → 400,
 * erros com `statusCode` conhecido são repassados, e o resto vira 500 genérico
 * (sem vazar detalhes internos na resposta).
 */
export function registerErrorHandler<T extends FastifyInstance>(app: T): void {
  app.setErrorHandler((error, request, reply) => {
    const statusCode = resolveStatusCode(error);

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'erro interno não tratado');
      return reply.code(500).send({ message: 'Erro interno' });
    }

    request.log.info({ err: error }, 'erro de requisição');
    return reply.code(statusCode).send({
      message: error instanceof Error ? error.message : 'Requisição inválida',
      ...(error instanceof ZodError ? { issues: error.issues } : {}),
    });
  });
}
