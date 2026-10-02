import type { ServerCard } from '@ocr/core';
import type { CardsRepository, ListCardsOptions } from './cards.repository';

interface Entry {
  userId: string;
  card: ServerCard;
}

/** Repositório em memória (escopado por usuário) — usado nos testes (sem Postgres). */
export class InMemoryCardsRepository implements CardsRepository {
  private readonly store = new Map<string, Entry>();

  list(userId: string, options: ListCardsOptions): Promise<ServerCard[]> {
    const result = [...this.store.values()]
      .filter((e) => e.userId === userId && (options.includeDeleted || !e.card.deletedAt))
      .map((e) => e.card)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // mais recentes primeiro
      .slice(options.offset, options.offset + options.limit)
      .map((card) => ({ ...card }));
    return Promise.resolve(result);
  }

  listSince(userId: string, since: string | null): Promise<ServerCard[]> {
    const result = [...this.store.values()]
      .filter((e) => e.userId === userId && (since === null || e.card.updatedAt > since))
      .map((e) => e.card)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)) // mais antigas primeiro
      .map((card) => ({ ...card }));
    return Promise.resolve(result);
  }

  findById(userId: string, id: string): Promise<ServerCard | null> {
    const entry = this.store.get(id);
    return Promise.resolve(entry && entry.userId === userId ? { ...entry.card } : null);
  }

  create(userId: string, card: ServerCard): Promise<ServerCard> {
    this.store.set(card.id, { userId, card: { ...card } });
    return Promise.resolve({ ...card });
  }

  update(userId: string, card: ServerCard): Promise<ServerCard> {
    this.store.set(card.id, { userId, card: { ...card } });
    return Promise.resolve({ ...card });
  }
}
