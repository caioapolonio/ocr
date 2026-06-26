import type { ServerCard } from '@ocr/core';

export interface ListCardsOptions {
  limit: number;
  offset: number;
  includeDeleted: boolean;
}

/**
 * Boundary de persistência de carteirinhas. A lógica de negócio (id, version,
 * timestamps, soft-delete) vive no `CardsService`; o repositório apenas
 * persiste/lê `ServerCard` completos. Permite trocar Postgres por uma impl
 * em memória nos testes (ver `cards.memory.ts`).
 */
export interface CardsRepository {
  list(options: ListCardsOptions): Promise<ServerCard[]>;
  findById(id: string): Promise<ServerCard | null>;
  create(card: ServerCard): Promise<ServerCard>;
  update(card: ServerCard): Promise<ServerCard>;
}
