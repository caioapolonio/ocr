import type { EducationLevel } from '../schemas/enums';
import { HIGH_VALUE_FIELDS, KNOWN_ISSUERS } from '../constants';

/** Campos estruturados que o parser tenta extrair do texto bruto do OCR. */
export interface ParsedStudentCard {
  fullName?: string;
  institution?: string;
  course?: string;
  educationLevel?: EducationLevel;
  registrationNumber?: string;
  documentNumber?: string;
  issuer?: string;
  cpf?: string;
  birthDate?: string; // YYYY-MM-DD
  validUntil?: string; // YYYY-MM-DD
}

/** Resultado do parsing: campos + confiança (0..1) + texto bruto para auditoria. */
export interface ParseResult {
  fields: ParsedStudentCard;
  confidence: number;
  rawOcrText: string;
}

// ──────────────────────────── helpers ────────────────────────────

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Quebra o texto em linhas limpas (sem vazias, sem espaços nas pontas). */
function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Converte `dd/mm/aaaa` (primeira ocorrência na string) em `aaaa-mm-dd`. */
function toIsoDate(value: string): string | undefined {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return undefined;
  const [, dd, mm, yyyy] = match;
  if (!dd || !mm || !yyyy) return undefined;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Procura `label` (com fronteira de palavra) em alguma linha e devolve o que
 * vier depois, ignorando separadores como `:` ou `-`.
 */
function findByLabel(lines: string[], labels: string[]): string | undefined {
  for (const line of lines) {
    for (const label of labels) {
      const re = new RegExp(`\\b${escapeRegExp(label)}\\b\\s*[:\\-]?\\s*(.+)`, 'i');
      const value = line.match(re)?.[1]?.trim();
      if (value && value.length > 0) return value;
    }
  }
  return undefined;
}

/** Devolve a primeira data (em ISO) de uma linha que cite algum dos `labels`. */
function findDateNear(lines: string[], labels: string[]): string | undefined {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (labels.some((label) => lower.includes(label))) {
      const iso = toIsoDate(line);
      if (iso) return iso;
    }
  }
  return undefined;
}

function findCpf(text: string): string | undefined {
  return text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)?.[0];
}

const INSTITUTION_KEYWORDS = [
  'universidade',
  'faculdade',
  'instituto federal',
  'instituto',
  'centro universitário',
  'centro universitario',
  'etec',
  'fatec',
  'colégio',
  'colegio',
  'escola',
];

function findInstitution(lines: string[]): string | undefined {
  const labeled = findByLabel(lines, [
    'instituição',
    'instituicao',
    'instituição de ensino',
    'instituicao de ensino',
  ]);
  if (labeled) return labeled;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (INSTITUTION_KEYWORDS.some((keyword) => lower.includes(keyword))) return line;
  }
  return undefined;
}

function findEducationLevel(text: string): EducationLevel | undefined {
  const lower = text.toLowerCase();
  if (
    lower.includes('pós') ||
    lower.includes('pos-gradua') ||
    lower.includes('mestrado') ||
    lower.includes('doutorado')
  ) {
    return 'pos';
  }
  if (
    lower.includes('superior') ||
    lower.includes('graduação') ||
    lower.includes('graduacao') ||
    lower.includes('bacharel') ||
    lower.includes('licenciatura')
  ) {
    return 'graduacao';
  }
  if (lower.includes('técnico') || lower.includes('tecnico')) return 'tecnico';
  if (lower.includes('médio') || lower.includes('medio')) return 'medio';
  if (lower.includes('fundamental')) return 'fundamental';
  return undefined;
}

function findIssuer(text: string): string | undefined {
  const upper = text.toUpperCase();
  for (const issuer of KNOWN_ISSUERS) {
    if (new RegExp(`\\b${issuer}\\b`).test(upper)) return issuer;
  }
  return undefined;
}

const NAME_BLOCKLIST = [
  'governo',
  'estado',
  'república',
  'republica',
  'ministério',
  'ministerio',
  'secretaria',
  'universidade',
  'faculdade',
  'instituto',
  'centro',
  'etec',
  'fatec',
  'colégio',
  'colegio',
  'escola',
  'curso',
  'carteira',
  'identidade',
  'identificação',
  'identificacao',
  'estudantil',
  'nacional',
  'união',
  'uniao',
  'validade',
];

/** Heurística de fallback: a linha parece o nome de uma pessoa? */
function isLikelyName(line: string): boolean {
  const lower = line.toLowerCase();
  if (NAME_BLOCKLIST.some((word) => lower.includes(word))) return false;
  if (/[0-9:/\-.]/.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  return /^[A-Za-zÀ-ÿ\s]+$/.test(line);
}

function findName(lines: string[]): string | undefined {
  const labeled = findByLabel(lines, ['nome']);
  if (labeled) return labeled;
  for (const line of lines) {
    if (isLikelyName(line)) return line;
  }
  return undefined;
}

// ──────────────────────────── parser ────────────────────────────

/**
 * Extrai campos estruturados do texto bruto produzido pelo OCR on-device.
 *
 * É uma função **pura** (sem dependências nativas), o que a torna fácil de
 * testar e reutilizável no mobile e em ferramentas de linha de comando.
 * A estratégia atual é por rótulos + heurísticas e foi pensada para evoluir
 * de forma plugável por emissor sem quebrar o restante do pipeline.
 */
export function parseStudentCard(rawOcrText: string): ParseResult {
  const lines = normalizeLines(rawOcrText);
  const fields: ParsedStudentCard = {};

  const fullName = findName(lines);
  if (fullName) fields.fullName = fullName;

  const institution = findInstitution(lines);
  if (institution) fields.institution = institution;

  const course = findByLabel(lines, ['curso']);
  if (course) fields.course = course;

  const educationLevel = findEducationLevel(rawOcrText);
  if (educationLevel) fields.educationLevel = educationLevel;

  const registrationNumber = findByLabel(lines, [
    'matrícula',
    'matricula',
    'rg estudantil',
    'registro estudantil',
    'registro acadêmico',
    'registro academico',
  ]);
  if (registrationNumber) fields.registrationNumber = registrationNumber;

  const documentNumber = findByLabel(lines, [
    'documento',
    'nº documento',
    'carteira nº',
    'carteira no',
  ]);
  if (documentNumber) fields.documentNumber = documentNumber;

  const issuer = findIssuer(rawOcrText);
  if (issuer) fields.issuer = issuer;

  const cpf = findCpf(rawOcrText);
  if (cpf) fields.cpf = cpf;

  const birthDate = findDateNear(lines, ['nascimento', 'nasc', 'data de nascimento']);
  if (birthDate) fields.birthDate = birthDate;

  const validUntil = findDateNear(lines, [
    'validade',
    'válida',
    'valida',
    'válido',
    'valido',
    'vence',
    'expira',
  ]);
  if (validUntil) fields.validUntil = validUntil;

  const found = HIGH_VALUE_FIELDS.filter((key) => fields[key] != null).length;
  const confidence = found / HIGH_VALUE_FIELDS.length;

  return { fields, confidence, rawOcrText };
}
