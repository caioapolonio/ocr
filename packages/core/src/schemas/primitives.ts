import { z } from 'zod';

/** Data simples no formato ISO `YYYY-MM-DD`. */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD');

/** Timestamp ISO 8601 completo (ex.: `2026-06-26T12:00:00.000Z`). */
export const isoDateTime = z.string().datetime({ offset: true });

/** CPF mascarado `000.000.000-00`. */
export const cpf = z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido');
