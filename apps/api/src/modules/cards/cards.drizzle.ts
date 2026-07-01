import type { ServerCard } from '@ocr/core';
import { asc, desc, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { cards } from '../../db/schema';
import type { CardsRepository, ListCardsOptions } from './cards.repository';

type Row = typeof cards.$inferSelect;
type InsertRow = typeof cards.$inferInsert;

function toRow(card: ServerCard): InsertRow {
  return {
    id: card.id,
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
    createdAt: new Date(card.createdAt),
    updatedAt: new Date(card.updatedAt),
    deletedAt: card.deletedAt ? new Date(card.deletedAt) : null,
  };
}

function toDomain(row: Row): ServerCard {
  return {
    id: row.id,
    fullName: row.fullName,
    institution: row.institution,
    ...(row.course != null ? { course: row.course } : {}),
    ...(row.educationLevel != null ? { educationLevel: row.educationLevel } : {}),
    ...(row.registrationNumber != null ? { registrationNumber: row.registrationNumber } : {}),
    ...(row.documentNumber != null ? { documentNumber: row.documentNumber } : {}),
    ...(row.cia != null ? { cia: row.cia } : {}),
    ...(row.issuer != null ? { issuer: row.issuer } : {}),
    ...(row.birthDate != null ? { birthDate: row.birthDate } : {}),
    ...(row.validUntil != null ? { validUntil: row.validUntil } : {}),
    rawOcrText: row.rawOcrText,
    ...(row.ocrConfidence != null ? { ocrConfidence: row.ocrConfidence } : {}),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

/** Repositório de carteirinhas sobre Postgres (Drizzle). */
export class DrizzleCardsRepository implements CardsRepository {
  constructor(private readonly db: Db) {}

  async list(options: ListCardsOptions): Promise<ServerCard[]> {
    const rows = await this.db
      .select()
      .from(cards)
      .where(options.includeDeleted ? undefined : isNull(cards.deletedAt))
      .orderBy(desc(cards.createdAt))
      .limit(options.limit)
      .offset(options.offset);
    return rows.map(toDomain);
  }

  async listSince(since: string | null): Promise<ServerCard[]> {
    const rows = await this.db
      .select()
      .from(cards)
      .where(since ? gt(cards.updatedAt, new Date(since)) : undefined)
      .orderBy(asc(cards.updatedAt));
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<ServerCard | null> {
    const [row] = await this.db.select().from(cards).where(eq(cards.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async create(card: ServerCard): Promise<ServerCard> {
    await this.db.insert(cards).values(toRow(card));
    return card;
  }

  async update(card: ServerCard): Promise<ServerCard> {
    const { id: _id, createdAt: _createdAt, ...mutable } = toRow(card);
    await this.db.update(cards).set(mutable).where(eq(cards.id, card.id));
    return card;
  }
}
