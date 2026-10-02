import { redactCpf, studentCardSchema, type StudentCard, type SyncPushRequest } from '@ocr/core';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { cards, outbox, syncMeta, type CardRow } from '@/db/schema';
import { getAuth } from '@/features/auth/storage';
import { pullChanges, pushChanges } from './api';
import { SYNC_ENABLED } from './config';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  /** Carteirinhas com dados inválidos que ficaram na outbox até serem corrigidas. */
  invalid?: number;
  skipped?: string;
}

/** Campo opcional preenchido? (`''` de um input apagado conta como ausente.) */
function filled<T>(value: T | null | undefined): value is T {
  return value != null && (typeof value !== 'string' || value.trim() !== '');
}

/**
 * Converte a linha local em `StudentCard` para o push. Omite campos vazios e,
 * por privacidade (specs §10), **não envia `cpf` nem `photoUri`** e tira o CPF
 * de dentro do `rawOcrText`.
 */
function rowToStudentCard(row: CardRow): StudentCard {
  return {
    id: row.id,
    fullName: row.fullName,
    institution: row.institution,
    ...(filled(row.course) ? { course: row.course } : {}),
    ...(filled(row.educationLevel) ? { educationLevel: row.educationLevel } : {}),
    ...(filled(row.registrationNumber) ? { registrationNumber: row.registrationNumber } : {}),
    ...(filled(row.documentNumber) ? { documentNumber: row.documentNumber } : {}),
    ...(filled(row.cia) ? { cia: row.cia } : {}),
    ...(filled(row.issuer) ? { issuer: row.issuer } : {}),
    ...(filled(row.birthDate) ? { birthDate: row.birthDate } : {}),
    ...(filled(row.validUntil) ? { validUntil: row.validUntil } : {}),
    rawOcrText: redactCpf(row.rawOcrText),
    ...(row.ocrConfidence != null ? { ocrConfidence: row.ocrConfidence } : {}),
    version: row.version,
    syncStatus: row.syncStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.deletedAt != null ? { deletedAt: row.deletedAt } : {}),
  };
}

/** Campos do servidor aplicados localmente (preserva `cpf`/`photoUri` locais). */
function syncedContent(card: StudentCard, syncStatus: 'synced' | 'conflict') {
  return {
    fullName: card.fullName,
    institution: card.institution,
    course: card.course ?? null,
    educationLevel: card.educationLevel ?? null,
    registrationNumber: card.registrationNumber ?? null,
    documentNumber: card.documentNumber ?? null,
    cia: card.cia ?? null,
    issuer: card.issuer ?? null,
    birthDate: card.birthDate ?? null,
    validUntil: card.validUntil ?? null,
    rawOcrText: card.rawOcrText,
    ocrConfidence: card.ocrConfidence ?? null,
    version: card.version,
    syncStatus,
    updatedAt: card.updatedAt,
    deletedAt: card.deletedAt ?? null,
  };
}

async function findCard(id: string): Promise<CardRow | undefined> {
  const [row] = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
  return row;
}

/**
 * Aplica uma carteirinha vinda do servidor. Em `synced`, respeita o
 * Last-Write-Wins: se a cópia local for mais nova, não sobrescreve (ela será
 * enviada no próximo push). Em `conflict`, o servidor sempre vence.
 */
async function applyServerCard(card: StudentCard, status: 'synced' | 'conflict'): Promise<boolean> {
  const local = await findCard(card.id);
  if (local && status === 'synced' && local.updatedAt > card.updatedAt) return false;

  if (local) {
    await db.update(cards).set(syncedContent(card, status)).where(eq(cards.id, card.id));
  } else {
    await db.insert(cards).values({
      ...syncedContent(card, status),
      id: card.id,
      cpf: null,
      photoUri: null,
      createdAt: card.createdAt,
    });
  }
  return true;
}

async function getLastPulledAt(): Promise<string | null> {
  const [row] = await db.select().from(syncMeta).where(eq(syncMeta.key, 'lastPulledAt')).limit(1);
  return row?.value ?? null;
}

async function setLastPulledAt(value: string): Promise<void> {
  await db
    .insert(syncMeta)
    .values({ key: 'lastPulledAt', value })
    .onConflictDoUpdate({ target: syncMeta.key, set: { value } });
}

/**
 * Um ciclo de sincronização: envia a outbox (push) e aplica o que o servidor
 * mudou (pull), tudo por Last-Write-Wins. "Offline" = o request falha; nesse
 * caso o erro sobe e a outbox permanece intacta para a próxima tentativa.
 */
export async function runSync(): Promise<SyncResult> {
  if (!SYNC_ENABLED) {
    return { pushed: 0, pulled: 0, conflicts: 0, skipped: 'EXPO_PUBLIC_API_URL não configurada' };
  }

  const auth = await getAuth();
  if (!auth) return { pushed: 0, pulled: 0, conflicts: 0, skipped: 'Entre para sincronizar' };

  // ---- PUSH: coalesce a outbox por carteirinha (última operação vence) ----
  const entries = await db.select().from(outbox).orderBy(outbox.createdAt);
  const opByCard = new Map<string, string>();
  for (const entry of entries) opByCard.set(entry.entityId, entry.op);

  const created: StudentCard[] = [];
  const updated: StudentCard[] = [];
  const deleted: string[] = [];
  let invalid = 0;
  for (const [id, op] of opByCard) {
    if (op === 'delete') {
      deleted.push(id);
      continue;
    }
    const row = await findCard(id);
    if (!row) continue;
    if (row.deletedAt) {
      deleted.push(id);
      continue;
    }
    // Uma carteirinha inválida (ex.: validade fora do formato) não pode
    // derrubar o push das outras: fica na outbox até ser corrigida.
    const card = studentCardSchema.safeParse(rowToStudentCard(row));
    if (!card.success) invalid += 1;
    else if (row.version === 0) created.push(card.data);
    else updated.push(card.data);
  }

  const lastPulledAt = await getLastPulledAt();
  let pushed = 0;
  let conflicts = 0;

  if (created.length || updated.length || deleted.length) {
    const request: SyncPushRequest = {
      lastPulledAt,
      changes: { cards: { created, updated, deleted } },
    };
    const res = await pushChanges(request, auth.token);
    pushed = res.accepted.length;

    if (res.accepted.length) {
      await db.delete(outbox).where(inArray(outbox.entityId, res.accepted));
      await db.update(cards).set({ syncStatus: 'synced' }).where(inArray(cards.id, res.accepted));
    }
    for (const conflict of res.conflicts) {
      await applyServerCard(conflict.server, 'conflict');
      await db.delete(outbox).where(eq(outbox.entityId, conflict.id));
    }
    conflicts = res.conflicts.length;
  }

  // ---- PULL: aplica as mudanças do servidor desde o último sync ----
  const pull = await pullChanges(lastPulledAt, auth.token);
  let pulled = 0;
  for (const card of [...pull.changes.cards.created, ...pull.changes.cards.updated]) {
    if (await applyServerCard(card, 'synced')) pulled += 1;
  }
  for (const id of pull.changes.cards.deleted) {
    const local = await findCard(id);
    if (local && !local.deletedAt) {
      await db
        .update(cards)
        .set({ deletedAt: new Date().toISOString(), syncStatus: 'synced' })
        .where(eq(cards.id, id));
      pulled += 1;
    }
    await db.delete(outbox).where(eq(outbox.entityId, id));
  }
  await setLastPulledAt(pull.serverTime);

  return { pushed, pulled, conflicts, ...(invalid ? { invalid } : {}) };
}
