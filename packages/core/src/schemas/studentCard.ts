import { z } from 'zod';
import { educationLevelSchema, syncStatusSchema } from './enums';
import { cpf, isoDate, isoDateTime } from './primitives';

/**
 * Modelo canônico de uma carteirinha de estudante.
 * É a fonte da verdade do domínio — usado no mobile (SQLite) e na API (Postgres)
 * via tipos inferidos, e validado na borda com Zod.
 */
export const studentCardSchema = z.object({
  // Identidade (gerada no client para funcionar offline-first)
  id: z.string().uuid(),

  // Dados extraídos da carteirinha
  fullName: z.string().min(1),
  institution: z.string().min(1),
  course: z.string().min(1).optional(),
  educationLevel: educationLevelSchema.optional(),
  registrationNumber: z.string().min(1).optional(),
  documentNumber: z.string().min(1).optional(),
  issuer: z.string().min(1).optional(),
  cpf: cpf.optional(),
  birthDate: isoDate.optional(),
  validUntil: isoDate.optional(),

  // Local-only (não sincroniza) + auditoria do OCR
  photoUri: z.string().optional(),
  rawOcrText: z.string(),
  ocrConfidence: z.number().min(0).max(1).optional(),

  // Metadados de sincronização
  serverId: z.string().optional(),
  version: z.number().int().nonnegative(),
  syncStatus: syncStatusSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable().optional(),
});
export type StudentCard = z.infer<typeof studentCardSchema>;

/** Campos que o app/usuário fornece ao criar uma carteirinha. */
export const createCardSchema = studentCardSchema.pick({
  fullName: true,
  institution: true,
  course: true,
  educationLevel: true,
  registrationNumber: true,
  documentNumber: true,
  issuer: true,
  cpf: true,
  birthDate: true,
  validUntil: true,
  photoUri: true,
  rawOcrText: true,
  ocrConfidence: true,
});
export type CreateCard = z.infer<typeof createCardSchema>;

/** Atualização parcial dos campos de conteúdo de uma carteirinha. */
export const updateCardSchema = createCardSchema.partial();
export type UpdateCard = z.infer<typeof updateCardSchema>;
