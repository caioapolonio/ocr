import type { ParsedStudentCard } from '@ocr/core';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { db } from '@/db/client';
import { cards, outbox, type NewCardRow } from '@/db/schema';

/** Enfileira uma mutação no outbox para o motor de sync (M4). */
async function enqueue(op: 'create' | 'update' | 'delete', entityId: string): Promise<void> {
  await db.insert(outbox).values({
    id: randomUUID(),
    entity: 'card',
    op,
    entityId,
    createdAt: new Date().toISOString(),
  });
}

/** Campos de conteúdo de uma carteirinha (sem id/version/sync/timestamps). */
export type CardContent = Pick<
  NewCardRow,
  | 'fullName'
  | 'institution'
  | 'course'
  | 'educationLevel'
  | 'registrationNumber'
  | 'documentNumber'
  | 'cia'
  | 'issuer'
  | 'cpf'
  | 'birthDate'
  | 'validUntil'
  | 'photoUri'
  | 'rawOcrText'
  | 'ocrConfidence'
>;

/** Converte a saída do parser (@ocr/core) em conteúdo pronto p/ persistir. */
export function parsedToContent(
  parsed: ParsedStudentCard,
  rawOcrText: string,
  confidence: number,
): CardContent {
  return {
    fullName: parsed.fullName ?? '',
    institution: parsed.institution ?? '',
    course: parsed.course ?? null,
    educationLevel: parsed.educationLevel ?? null,
    registrationNumber: parsed.registrationNumber ?? null,
    documentNumber: parsed.documentNumber ?? null,
    cia: parsed.cia ?? null,
    issuer: parsed.issuer ?? null,
    cpf: parsed.cpf ?? null,
    birthDate: parsed.birthDate ?? null,
    validUntil: parsed.validUntil ?? null,
    photoUri: null,
    rawOcrText,
    ocrConfidence: confidence,
  };
}

export async function createCard(content: CardContent): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.insert(cards).values({
    ...content,
    id,
    version: 0,
    syncStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  });
  await enqueue('create', id);
  return id;
}

export async function updateCard(id: string, content: Partial<CardContent>): Promise<void> {
  await db
    .update(cards)
    .set({ ...content, syncStatus: 'pending', updatedAt: new Date().toISOString() })
    .where(eq(cards.id, id));
  await enqueue('update', id);
}

/** Soft-delete (marca deletedAt; a remoção real propaga no sync — M4). */
export async function softDeleteCard(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(cards)
    .set({ deletedAt: now, syncStatus: 'pending', updatedAt: now })
    .where(eq(cards.id, id));
  await enqueue('delete', id);
}
