import { z } from 'zod';

/** Nível de ensino associado à carteirinha. */
export const educationLevelSchema = z.enum([
  'fundamental',
  'medio',
  'tecnico',
  'graduacao',
  'pos',
  'outro',
]);
export type EducationLevel = z.infer<typeof educationLevelSchema>;

/** Estado de sincronização de um registro local com o backend. */
export const syncStatusSchema = z.enum(['pending', 'synced', 'conflict']);
export type SyncStatus = z.infer<typeof syncStatusSchema>;
