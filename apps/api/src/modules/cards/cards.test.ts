import { randomUUID } from 'node:crypto';
import type { CreateServerCard } from '@ocr/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { App } from '../../app';
import { buildTestApp, registerUser } from '../../test/harness';

function sampleInput(overrides: Partial<CreateServerCard> = {}): CreateServerCard {
  return {
    fullName: 'João da Silva',
    institution: 'Universidade Federal do Rio de Janeiro',
    rawOcrText: 'texto bruto do OCR',
    ...overrides,
  };
}

describe('cards API', () => {
  let app: App;
  let headers: Record<string, string>;

  beforeEach(async () => {
    app = await buildTestApp();
    ({ headers } = await registerUser(app));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('exige autenticação: 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/cards' });
    expect(res.statusCode).toBe(401);
  });

  it('POST cria carteirinha (201) com id/version/timestamps do servidor', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cards',
      headers,
      payload: sampleInput(),
    });
    expect(res.statusCode).toBe(201);

    const card = res.json();
    expect(card.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(card.version).toBe(0);
    expect(card.fullName).toBe('João da Silva');
    // privacidade: servidor não expõe cpf/photoUri
    expect(card.cpf).toBeUndefined();
    expect(card.photoUri).toBeUndefined();
  });

  it('POST não guarda o CPF que vem dentro do rawOcrText', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cards',
      headers,
      payload: sampleInput({ rawOcrText: 'CPF: 123.456.789-00' }),
    });

    expect(res.json().rawOcrText).toBe('CPF: [CPF removido]');
  });

  it('valida o corpo (400) quando faltam campos obrigatórios', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cards',
      headers,
      payload: { fullName: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('lista, recupera por id e responde 404 para inexistente', async () => {
    const created = (
      await app.inject({ method: 'POST', url: '/api/v1/cards', headers, payload: sampleInput() })
    ).json();

    const list = await app.inject({ method: 'GET', url: '/api/v1/cards', headers });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);

    const one = await app.inject({ method: 'GET', url: `/api/v1/cards/${created.id}`, headers });
    expect(one.statusCode).toBe(200);

    const missing = await app.inject({ method: 'GET', url: `/api/v1/cards/${randomUUID()}`, headers });
    expect(missing.statusCode).toBe(404);
  });

  it('atualiza (PUT) e incrementa a version', async () => {
    const created = (
      await app.inject({ method: 'POST', url: '/api/v1/cards', headers, payload: sampleInput() })
    ).json();

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/cards/${created.id}`,
      headers,
      payload: { course: 'Engenharia de Computação' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().version).toBe(1);
  });

  it('faz soft-delete e some da listagem padrão', async () => {
    const created = (
      await app.inject({ method: 'POST', url: '/api/v1/cards', headers, payload: sampleInput() })
    ).json();

    const del = await app.inject({ method: 'DELETE', url: `/api/v1/cards/${created.id}`, headers });
    expect(del.statusCode).toBe(200);

    const list = await app.inject({ method: 'GET', url: '/api/v1/cards', headers });
    expect(list.json()).toHaveLength(0);
  });

  it('isola carteirinhas por usuário (um não vê as do outro)', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/cards', headers, payload: sampleInput() });

    const other = await registerUser(app);
    const otherList = await app.inject({ method: 'GET', url: '/api/v1/cards', headers: other.headers });
    expect(otherList.json()).toHaveLength(0);
  });
});
