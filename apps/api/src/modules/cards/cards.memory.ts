import type { ServerCard } from '@ocr/core';
import type { CardsRepository, ListCardsOptions } from './cards.repository';

/** Repositório em memória — usado nos testes (sem Docker/Postgres). */
export class InMemoryCardsRepository implements CardsRepository {
  private readonly store = new Map<string, ServerCard>();

  list(options: ListCardsOptions): Promise<ServerCard[]> {
    const result = [...this.store.values()]
      .filter((card) => options.includeDeleted || !card.deletedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // mais recentes primeiro
      .slice(options.offset, options.offset + options.limit)
      .map((card) => ({ ...card }));
    return Promise.resolve(result);
  }

  listSince(since: string | null): Promise<ServerCard[]> {
    const result = [...this.store.values()]
      .filter((card) => since === null || card.updatedAt > since)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)) // mais antigas primeiro
      .map((card) => ({ ...card }));
    return Promise.resolve(result);
  }

  findById(id: string): Promise<ServerCard | null> {
    const card = this.store.get(id);
    return Promise.resolve(card ? { ...card } : null);
  }

  create(card: ServerCard): Promise<ServerCard> {
    this.store.set(card.id, { ...card });
    return Promise.resolve({ ...card });
  }

  update(card: ServerCard): Promise<ServerCard> {
    this.store.set(card.id, { ...card });
    return Promise.resolve({ ...card });
  }
}
