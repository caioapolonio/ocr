import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/harness';
import type { App } from '../../app';

const creds = { email: 'user@test.dev', password: 'password123' };

describe('auth API', () => {
  let app: App;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registra e retorna token + user (nunca o hash da senha)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: creds });
    expect(res.statusCode).toBe(201);

    const body = res.json();
    expect(typeof body.token).toBe('string');
    expect(body.user.email).toBe('user@test.dev');
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('recusa e-mail duplicado (409)', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: creds });
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: creds });
    expect(res.statusCode).toBe(409);
  });

  it('valida senha curta (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'a@b.dev', password: '123' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('faz login e rejeita senha errada (401)', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: creds });

    const ok = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: creds });
    expect(ok.statusCode).toBe(200);

    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { ...creds, password: 'senha-errada-1' },
    });
    expect(bad.statusCode).toBe(401);
  });

  it('aplica rate-limit (429) ao estourar o limite', async () => {
    const limited = await buildTestApp(2); // máx. 2 req/min
    try {
      await limited.inject({ method: 'GET', url: '/health' });
      await limited.inject({ method: 'GET', url: '/health' });
      const third = await limited.inject({ method: 'GET', url: '/health' });
      expect(third.statusCode).toBe(429);
    } finally {
      await limited.close();
    }
  });
});
