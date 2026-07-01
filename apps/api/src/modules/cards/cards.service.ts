import { randomUUID } from 'node:crypto';
import type { CreateServerCard, ServerCard, UpdateServerCard } from '@ocr/core';
import type { CardsRepository, ListCardsOptions } from './cards.repository';

/**
 * Regras de negócio das carteirinhas, escopadas por usuário (M5). É a dona dos
 * campos gerenciados pelo servidor: `id`, `version`, `createdAt/updatedAt` e o
 * soft-delete (`deletedAt`).
 */
export class CardsService {
  constructor(private readonly repo: CardsRepository) {}

  list(userId: string, options: ListCardsOptions): Promise<ServerCard[]> {
    return this.repo.list(userId, options);
  }

  async get(userId: string, id: string): Promise<ServerCard | null> {
    const card = await this.repo.findById(userId, id);
    return card && !card.deletedAt ? card : null;
  }

  create(userId: string, input: CreateServerCard): Promise<ServerCard> {
    const now = new Date().toISOString();
    const card: ServerCard = {
      id: randomUUID(),
      ...input,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    return this.repo.create(userId, card);
  }

  async update(userId: string, id: string, input: UpdateServerCard): Promise<ServerCard | null> {
    const existing = await this.get(userId, id);
    if (!existing) return null;

    const updated: ServerCard = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    return this.repo.update(userId, updated);
  }

  async softDelete(userId: string, id: string): Promise<boolean> {
    const existing = await this.get(userId, id);
    if (!existing) return false;

    const now = new Date().toISOString();
    await this.repo.update(userId, {
      ...existing,
      version: existing.version + 1,
      updatedAt: now,
      deletedAt: now,
    });
    return true;
  }
}
