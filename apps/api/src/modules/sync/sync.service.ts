import type {
  ServerCard,
  StudentCard,
  SyncConflict,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from '@ocr/core';
import type { CardsRepository } from '../cards/cards.repository';

/**
 * Converte a carteirinha do cliente (`StudentCard`) no shape do servidor,
 * descartando os campos que **não** sincronizam por privacidade (`cpf`,
 * `photoUri`) nem os metadados locais (`syncStatus`, `serverId`). Ver specs §10.
 */
function toServerCard(card: StudentCard): ServerCard {
  return {
    id: card.id,
    fullName: card.fullName,
    institution: card.institution,
    ...(card.course != null ? { course: card.course } : {}),
    ...(card.educationLevel != null ? { educationLevel: card.educationLevel } : {}),
    ...(card.registrationNumber != null ? { registrationNumber: card.registrationNumber } : {}),
    ...(card.documentNumber != null ? { documentNumber: card.documentNumber } : {}),
    ...(card.cia != null ? { cia: card.cia } : {}),
    ...(card.issuer != null ? { issuer: card.issuer } : {}),
    ...(card.birthDate != null ? { birthDate: card.birthDate } : {}),
    ...(card.validUntil != null ? { validUntil: card.validUntil } : {}),
    rawOcrText: card.rawOcrText,
    ...(card.ocrConfidence != null ? { ocrConfidence: card.ocrConfidence } : {}),
    version: card.version,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    deletedAt: card.deletedAt ?? null,
  };
}

/** A cópia do servidor é autoritativa → volta ao cliente já marcada como `synced`. */
function toStudentCard(card: ServerCard): StudentCard {
  return { ...card, syncStatus: 'synced' };
}

/**
 * Motor de sincronização (Last-Write-Wins por `updatedAt`).
 *
 * - `push`: aplica as mudanças locais; se o servidor já tem uma versão com
 *   `updatedAt` mais recente, o servidor vence e o registro volta como conflito.
 * - `pull`: devolve tudo que mudou desde `since` (criados/atualizados/deletados).
 *
 * Reusa o `CardsRepository` (mesma boundary do CRUD), então roda em memória
 * nos testes e sobre Postgres em produção.
 */
export class SyncService {
  constructor(private readonly repo: CardsRepository) {}

  async push(request: SyncPushRequest): Promise<SyncPushResponse> {
    const accepted: string[] = [];
    const conflicts: SyncConflict[] = [];
    const incoming = [...request.changes.cards.created, ...request.changes.cards.updated];

    for (const card of incoming) {
      const existing = await this.repo.findById(card.id);
      if (existing && existing.updatedAt > card.updatedAt) {
        // Servidor tem cópia mais nova → vence (LWW).
        conflicts.push({ id: card.id, reason: 'stale-update', server: toStudentCard(existing) });
        continue;
      }
      const mapped = toServerCard(card);
      if (existing) await this.repo.update(mapped);
      else await this.repo.create(mapped);
      accepted.push(card.id);
    }

    for (const id of request.changes.cards.deleted) {
      const existing = await this.repo.findById(id);
      if (existing && !existing.deletedAt) {
        const now = new Date().toISOString();
        await this.repo.update({
          ...existing,
          version: existing.version + 1,
          updatedAt: now,
          deletedAt: now,
        });
      }
      accepted.push(id);
    }

    return { accepted, conflicts, serverTime: new Date().toISOString() };
  }

  async pull(since: string | null): Promise<SyncPullResponse> {
    const changed = await this.repo.listSince(since);
    const created: StudentCard[] = [];
    const updated: StudentCard[] = [];
    const deleted: string[] = [];

    for (const card of changed) {
      if (card.deletedAt) deleted.push(card.id);
      else if (since === null || card.createdAt > since) created.push(toStudentCard(card));
      else updated.push(toStudentCard(card));
    }

    return { serverTime: new Date().toISOString(), changes: { cards: { created, updated, deleted } } };
  }
}
