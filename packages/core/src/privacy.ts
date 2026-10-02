/** Marca que substitui o CPF no texto bruto do OCR. */
export const REDACTED_CPF = '[CPF removido]';

// CPF formatado em qualquer lugar do texto (`000.000.000-00`).
const FORMATTED_CPF = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;

// CPF sem pontuação só é reconhecido quando vem rotulado (`CPF: 00000000000`);
// sem o rótulo, 11 dígitos podem ser uma matrícula.
const LABELED_CPF = /(\bCPF\b[ \t]*[:-]?[ \t]*)\d{3}[. ]?\d{3}[. ]?\d{3}[-. ]?\d{2}/gi;

/**
 * Remove o CPF do texto bruto do OCR antes de ele sair do aparelho.
 *
 * O campo `cpf` não sincroniza (specs §10), mas o `rawOcrText` sincroniza para
 * permitir auditoria/re-parse — sem esta etapa o CPF chegaria ao servidor
 * dentro dele. A cópia local do texto continua completa.
 */
export function redactCpf(rawOcrText: string): string {
  return rawOcrText.replace(LABELED_CPF, `$1${REDACTED_CPF}`).replace(FORMATTED_CPF, REDACTED_CPF);
}
