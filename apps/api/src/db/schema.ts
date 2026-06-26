import { date, integer, pgEnum, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const educationLevelEnum = pgEnum('education_level', [
  'fundamental',
  'medio',
  'tecnico',
  'graduacao',
  'pos',
  'outro',
]);

/**
 * Tabela `cards` — espelha o modelo do domínio (@ocr/core), porém **sem**
 * `cpf` e `photo_uri` (privacidade: não saem do dispositivo, ver specs.md §10)
 * e sem `syncStatus`/`serverId` (conceitos do cliente offline-first).
 */
export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  institution: text('institution').notNull(),
  course: text('course'),
  educationLevel: educationLevelEnum('education_level'),
  registrationNumber: text('registration_number'),
  documentNumber: text('document_number'),
  issuer: text('issuer'),
  birthDate: date('birth_date', { mode: 'string' }),
  validUntil: date('valid_until', { mode: 'string' }),
  rawOcrText: text('raw_ocr_text').notNull(),
  ocrConfidence: real('ocr_confidence'),
  version: integer('version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
