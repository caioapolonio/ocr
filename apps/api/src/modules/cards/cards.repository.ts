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
  list(userId: string, options: ListCardsOptions): Promise<ServerCard[]>;
  /** Carteirinhas do usuário com `updatedAt > since` (inclui deletadas). Base do pull de sync. */
  listSince(userId: string, since: string | null): Promise<ServerCard[]>;
  findById(userId: string, id: string): Promise<ServerCard | null>;
  create(userId: string, card: ServerCard): Promise<ServerCard>;
  update(userId: string, card: ServerCard): Promise<ServerCard>;
}
