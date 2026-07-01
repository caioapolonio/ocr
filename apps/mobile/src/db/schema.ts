import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const EDUCATION_LEVELS = ['fundamental', 'medio', 'tecnico', 'graduacao', 'pos', 'outro'] as const;
const SYNC_STATUSES = ['pending', 'synced', 'conflict'] as const;

/**
 * Tabela local de carteirinhas (offline-first). Espelha o `StudentCard` de
 * `@ocr/core` — no mobile, a fonte da verdade mantém `cpf`/`photoUri` localmente
 * e os metadados de sync (`syncStatus`/`version`/`deletedAt`). A tabela `outbox`
 * (fila de mutações) entra no M4.
 */
export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  institution: text('institution').notNull(),
  course: text('course'),
  educationLevel: text('education_level', { enum: EDUCATION_LEVELS }),
  registrationNumber: text('registration_number'),
  documentNumber: text('document_number'),
  cia: text('cia'),
  issuer: text('issuer'),
  cpf: text('cpf'),
  birthDate: text('birth_date'),
  validUntil: text('valid_until'),
  photoUri: text('photo_uri'),
  rawOcrText: text('raw_ocr_text').notNull(),
  ocrConfidence: real('ocr_confidence'),
  serverId: text('server_id'),
  version: integer('version').notNull().default(0),
  syncStatus: text('sync_status', { enum: SYNC_STATUSES }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export type CardRow = typeof cards.$inferSelect;
export type NewCardRow = typeof cards.$inferInsert;

const OUTBOX_OPS = ['create', 'update', 'delete'] as const;

/**
 * Fila de mutações feitas offline (specs.md §8). Cada create/update/delete
 * enfileira uma linha; o motor de sync (M4) lê a fila, envia ao servidor e
 * remove o que foi aceito. O payload não é guardado: no push lemos o estado
 * atual da carteirinha (sync de registro completo por Last-Write-Wins).
 */
export const outbox = sqliteTable('outbox', {
  id: text('id').primaryKey(),
  entity: text('entity').notNull().default('card'),
  op: text('op', { enum: OUTBOX_OPS }).notNull(),
  entityId: text('entity_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export type OutboxRow = typeof outbox.$inferSelect;

/** Metadados do sync em formato chave/valor (ex.: `lastPulledAt`). */
export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value'),
});
