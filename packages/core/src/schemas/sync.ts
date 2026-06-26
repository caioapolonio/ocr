import { z } from 'zod';
import { studentCardSchema } from './studentCard';

const isoDateTime = z.string().datetime({ offset: true });

/**
 * Conjunto de mudanças de carteirinhas trocadas em um ciclo de sync.
 * `deleted` carrega apenas os ids (soft-delete).
 */
export const cardChangesSchema = z.object({
  created: z.array(studentCardSchema),
  updated: z.array(studentCardSchema),
  deleted: z.array(z.string().uuid()),
});
export type CardChanges = z.infer<typeof cardChangesSchema>;

/** Corpo de `POST /api/v1/sync/push`. */
export const syncPushRequestSchema = z.object({
  lastPulledAt: isoDateTime.nullable(),
  changes: z.object({ cards: cardChangesSchema }),
});
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;

/** Conflito detectado no servidor (vence quem tem `updatedAt` mais recente). */
export const syncConflictSchema = z.object({
  id: z.string().uuid(),
  reason: z.enum(['stale-update', 'already-deleted']),
  server: studentCardSchema,
});
export type SyncConflict = z.infer<typeof syncConflictSchema>;

/** Resposta de `POST /api/v1/sync/push`. */
export const syncPushResponseSchema = z.object({
  accepted: z.array(z.string().uuid()),
  conflicts: z.array(syncConflictSchema),
  serverTime: isoDateTime,
});
export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>;

/** Resposta de `GET /api/v1/sync/pull?since=...`. */
export const syncPullResponseSchema = z.object({
  serverTime: isoDateTime,
  changes: z.object({ cards: cardChangesSchema }),
});
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;
