import { z } from 'zod';
import { educationLevelSchema } from './enums';
import { isoDate, isoDateTime } from './primitives';

/**
 * Shape que o **servidor** persiste e retorna para uma carteirinha.
 *
 * Deliberadamente **sem `cpf` nem `photoUri`**: a foto é local-only e o CPF não
 * sincroniza por padrão (ver `specs.md` §10 — Privacidade). Também sem
 * `syncStatus`/`serverId`, que são conceitos do cliente offline-first.
 */
export const serverCardSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1),
  institution: z.string().min(1),
  course: z.string().min(1).optional(),
  educationLevel: educationLevelSchema.optional(),
  registrationNumber: z.string().min(1).optional(),
  documentNumber: z.string().min(1).optional(),
  issuer: z.string().min(1).optional(),
  birthDate: isoDate.optional(),
  validUntil: isoDate.optional(),
  rawOcrText: z.string(),
  ocrConfidence: z.number().min(0).max(1).optional(),
  version: z.number().int().nonnegative(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable().optional(),
});
export type ServerCard = z.infer<typeof serverCardSchema>;

/** Campos de conteúdo aceitos ao criar uma carteirinha no servidor. */
export const createServerCardSchema = serverCardSchema.pick({
  fullName: true,
  institution: true,
  course: true,
  educationLevel: true,
  registrationNumber: true,
  documentNumber: true,
  issuer: true,
  birthDate: true,
  validUntil: true,
  rawOcrText: true,
  ocrConfidence: true,
});
export type CreateServerCard = z.infer<typeof createServerCardSchema>;

/** Atualização parcial dos campos de conteúdo. */
export const updateServerCardSchema = createServerCardSchema.partial();
export type UpdateServerCard = z.infer<typeof updateServerCardSchema>;
