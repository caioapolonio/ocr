import { cpf, isoDate } from '@ocr/core';
import type { CardContent } from './mutations';

/**
 * Primeiro problema que impediria a carteirinha de sincronizar (os mesmos
 * schemas do `@ocr/core` que a API usa), ou `null` se estiver tudo certo.
 */
export function contentProblem(content: Partial<CardContent>): string | null {
  if (content.fullName !== undefined && !content.fullName.trim()) return 'Preencha o nome.';
  if (content.institution !== undefined && !content.institution.trim()) {
    return 'Preencha a instituição.';
  }
  if (content.validUntil?.trim() && !isoDate.safeParse(content.validUntil.trim()).success) {
    return 'Validade no formato AAAA-MM-DD (ex.: 2026-03-31).';
  }
  if (content.birthDate?.trim() && !isoDate.safeParse(content.birthDate.trim()).success) {
    return 'Nascimento no formato AAAA-MM-DD (ex.: 2002-03-15).';
  }
  if (content.cpf?.trim() && !cpf.safeParse(content.cpf.trim()).success) {
    return 'CPF no formato 000.000.000-00.';
  }
  return null;
}
