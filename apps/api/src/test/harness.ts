import { randomUUID } from 'node:crypto';
import { buildApp, type App } from '../app';
import { InMemoryUsersRepository } from '../modules/auth/users.memory';
import { InMemoryCardsRepository } from '../modules/cards/cards.memory';

const TEST_JWT_SECRET = 'test-secret-please-change-0123456789';

/** App de teste com repositórios em memória (sem Postgres) e rate-limit folgado. */
export function buildTestApp(rateLimitMax = 1000): Promise<App> {
  return buildApp({
    cardsRepository: new InMemoryCardsRepository(),
    usersRepository: new InMemoryUsersRepository(),
    jwtSecret: TEST_JWT_SECRET,
    rateLimitMax,
  });
}

export interface AuthedUser {
  token: string;
  userId: string;
  headers: Record<string, string>;
}

/** Registra um usuário (e-mail único por padrão) e devolve token + headers. */
export async function registerUser(
  app: App,
  email = `${randomUUID()}@test.dev`,
  password = 'password123',
): Promise<AuthedUser> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password },
  });
  const body = res.json();
  return { token: body.token, userId: body.user.id, headers: { authorization: `Bearer ${body.token}` } };
}
