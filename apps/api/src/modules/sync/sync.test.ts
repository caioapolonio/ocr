import { randomUUID } from 'node:crypto';
import type { CardChanges, StudentCard, SyncPullResponse, SyncPushResponse } from '@ocr/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { App } from '../../app';
import { buildTestApp, registerUser } from '../../test/harness';

/** Constrói uma carteirinha do cliente (shape completo do `StudentCard`). */
function studentCard(overrides: Partial<StudentCard> = {}): StudentCard {
  const now = '2026-03-01T00:00:00.000Z';
  return {
    id: randomUUID(),
    fullName: 'João da Silva',
    institution: 'Universidade Federal do Rio de Janeiro',
    rawOcrText: 'texto bruto do OCR',
    version: 0,
    syncStatus: 'pending',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function emptyChanges(): CardChanges {
  return { created: [], updated: [], deleted: [] };
}

describe('sync API', () => {
  let app: App;
  let headers: Record<string, string>;

  beforeEach(async () => {
    app = await buildTestApp();
    ({ headers } = await registerUser(app));
  });

  afterEach(async () => {
    await app.close();
  });

  async function push(cards: Partial<CardChanges>, auth = headers): Promise<SyncPushResponse> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/push',
      headers: auth,
      payload: { lastPulledAt: null, changes: { cards: { ...emptyChanges(), ...cards } } },
    });
    expect(res.statusCode).toBe(200);
    return res.json();
  }

  async function pull(since: string | null, auth = headers): Promise<SyncPullResponse> {
    const res = await app.inject({
      method: 'GET',
      url: since ? `/api/v1/sync/pull?since=${encodeURIComponent(since)}` : '/api/v1/sync/pull',
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    return res.json();
  }

  const pulledCards = (p: SyncPullResponse) => [...p.changes.cards.created, ...p.changes.cards.updated];

  it('exige autenticação: 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/sync/pull' });
    expect(res.statusCode).toBe(401);
  });

  it('aceita criações e as devolve no pull', async () => {
    const card = studentCard();
    const res = await push({ created: [card] });

    expect(res.accepted).toEqual([card.id]);
    expect(res.conflicts).toHaveLength(0);

    const found = pulledCards(await pull(null)).find((c) => c.id === card.id);
    expect(found?.syncStatus).toBe('synced');
  });

  it('gera conflito quando o update do cliente é mais antigo que o servidor (LWW)', async () => {
    const id = randomUUID();
    await push({ created: [studentCard({ id, updatedAt: '2026-06-01T00:00:00.000Z' })] });

    const res = await push({
      updated: [studentCard({ id, fullName: 'Desatualizado', updatedAt: '2026-01-01T00:00:00.000Z' })],
    });

    expect(res.accepted).not.toContain(id);
    expect(res.conflicts[0]?.reason).toBe('stale-update');
    expect(res.conflicts[0]?.server.fullName).toBe('João da Silva');
  });

  it('aplica o update quando o cliente é mais novo', async () => {
    const id = randomUUID();
    await push({ created: [studentCard({ id, updatedAt: '2026-01-01T00:00:00.000Z' })] });

    const res = await push({
      updated: [studentCard({ id, fullName: 'Atualizado', updatedAt: '2026-06-01T00:00:00.000Z' })],
    });

    expect(res.accepted).toContain(id);
    const found = pulledCards(await pull(null)).find((c) => c.id === id);
    expect(found?.fullName).toBe('Atualizado');
  });

  it('faz soft-delete e o registro aparece como deleted no pull', async () => {
    const id = randomUUID();
    await push({ created: [studentCard({ id })] });

    const res = await push({ deleted: [id] });
    expect(res.accepted).toContain(id);

    const p = await pull(null);
    expect(p.changes.cards.deleted).toContain(id);
    expect(pulledCards(p).some((c) => c.id === id)).toBe(false);
  });

  it('pull?since=... retorna apenas o que mudou depois', async () => {
    const older = studentCard({ updatedAt: '2026-01-01T00:00:00.000Z' });
    const newer = studentCard({ updatedAt: '2026-12-01T00:00:00.000Z' });
    await push({ created: [older, newer] });

    const ids = pulledCards(await pull('2026-06-01T00:00:00.000Z')).map((c) => c.id);
    expect(ids).toEqual([newer.id]);
  });

  it('não sincroniza cpf/photoUri (privacidade) e sincroniza a cia', async () => {
    const id = randomUUID();
    await push({
      created: [studentCard({ id, cpf: '123.456.789-00', photoUri: 'file://foto.jpg', cia: '000123456' })],
    });

    const found = pulledCards(await pull(null)).find((c) => c.id === id);
    expect(found?.cpf).toBeUndefined();
    expect(found?.photoUri).toBeUndefined();
    expect(found?.cia).toBe('000123456');
  });

  it('isola o sync por usuário', async () => {
    const card = studentCard();
    await push({ created: [card] });

    const other = await registerUser(app);
    const p = await pull(null, other.headers);
    expect(pulledCards(p)).toHaveLength(0);
    expect(p.changes.cards.deleted).toHaveLength(0);
  });
});
