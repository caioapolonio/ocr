/** Versão atual da API REST (prefixo `/api/v1`). */
export const API_VERSION = 'v1';

/** Entidades emissoras de carteirinhas de estudante conhecidas no Brasil. */
export const KNOWN_ISSUERS = ['UNE', 'UBES', 'ANPG', 'DCE', 'DRE'] as const;
export type KnownIssuer = (typeof KNOWN_ISSUERS)[number];

/**
 * Campos de alto valor usados para calcular a confiança do parsing de OCR.
 * Quanto mais desses campos forem extraídos, maior a confiança.
 */
export const HIGH_VALUE_FIELDS = [
  'fullName',
  'institution',
  'registrationNumber',
  'validUntil',
] as const;
