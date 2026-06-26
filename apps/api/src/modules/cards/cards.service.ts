import { randomUUID } from 'node:crypto';
import type { CreateServerCard, ServerCard, UpdateServerCard } from '@ocr/core';
import type { CardsRepository, ListCardsOptions } from './cards.repository';

/**
 * Regras de negócio das carteirinhas. É a dona dos campos gerenciados pelo
 * servidor: `id`, `version`, `createdAt/updatedAt` e o soft-delete (`deletedAt`).
 */
export class CardsService {
  constructor(private readonly repo: CardsRepository) {}

  list(options: ListCardsOptions): Promise<ServerCard[]> {
    return this.repo.list(options);
  }

  async get(id: string): Promise<ServerCard | null> {
    const card = await this.repo.findById(id);
    return card && !card.deletedAt ? card : null;
  }

  create(input: CreateServerCard): Promise<ServerCard> {
    const now = new Date().toISOString();
    const card: ServerCard = {
      id: randomUUID(),
      ...input,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    return this.repo.create(card);
  }

  async update(id: string, input: UpdateServerCard): Promise<ServerCard | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated: ServerCard = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    return this.repo.update(updated);
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) return false;

    const now = new Date().toISOString();
    await this.repo.update({
      ...existing,
      version: existing.version + 1,
      updatedAt: now,
      deletedAt: now,
    });
    return true;
  }
}
