import { randomUUID } from 'node:crypto';
import type { CreateServerCard } from '@ocr/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, type App } from '../../app';
import { InMemoryCardsRepository } from './cards.memory';

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

  beforeEach(async () => {
    app = await buildApp({ cardsRepository: new InMemoryCardsRepository() });
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('POST cria carteirinha (201) com id/version/timestamps gerenciados pelo servidor', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/cards', payload: sampleInput() });
    expect(res.statusCode).toBe(201);

    const card = res.json();
    expect(card.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(card.version).toBe(0);
    expect(card.fullName).toBe('João da Silva');
    expect(card.createdAt).toBeDefined();
    // privacidade: servidor não expõe cpf/photoUri
    expect(card.cpf).toBeUndefined();
    expect(card.photoUri).toBeUndefined();
  });

  it('valida o corpo (400) quando faltam campos obrigatórios', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/cards', payload: { fullName: 'x' } });
    expect(res.statusCode).toBe(400);
  });

  it('lista, recupera por id e responde 404 para inexistente', async () => {
    const created = (
      await app.inject({ method: 'POST', url: '/api/v1/cards', payload: sampleInput() })
    ).json();

    const list = await app.inject({ method: 'GET', url: '/api/v1/cards' });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);

    const one = await app.inject({ method: 'GET', url: `/api/v1/cards/${created.id}` });
    expect(one.statusCode).toBe(200);

    const missing = await app.inject({ method: 'GET', url: `/api/v1/cards/${randomUUID()}` });
    expect(missing.statusCode).toBe(404);
  });

  it('atualiza (PUT) e incrementa a version', async () => {
    const created = (
      await app.inject({ method: 'POST', url: '/api/v1/cards', payload: sampleInput() })
    ).json();

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/cards/${created.id}`,
      payload: { course: 'Engenharia de Computação' },
    });
    expect(res.statusCode).toBe(200);

    const updated = res.json();
    expect(updated.course).toBe('Engenharia de Computação');
    expect(updated.version).toBe(1);
  });

  it('faz soft-delete (204) e some da listagem padrão', async () => {
    const created = (
      await app.inject({ method: 'POST', url: '/api/v1/cards', payload: sampleInput() })
    ).json();

    const del = await app.inject({ method: 'DELETE', url: `/api/v1/cards/${created.id}` });
    expect(del.statusCode).toBe(200);
    expect(del.json()).toEqual({ success: true });

    const list = await app.inject({ method: 'GET', url: '/api/v1/cards' });
    expect(list.json()).toHaveLength(0);

    const one = await app.inject({ method: 'GET', url: `/api/v1/cards/${created.id}` });
    expect(one.statusCode).toBe(404);
  });
});
