import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { studentCardSchema } from '../schemas';
import { parseStudentCard } from './parseStudentCard';

// Fixtures sintéticas e anonimizadas (sem PII real), coerentes com o foco em privacidade.

const CARD_UNE = [
  'CARTEIRA DE IDENTIFICAÇÃO ESTUDANTIL',
  'UNE - União Nacional dos Estudantes',
  'Nome: João da Silva Santos',
  'Instituição: Universidade Federal do Rio de Janeiro',
  'Curso: Engenharia de Computação - Ensino Superior',
  'Matrícula: 2023123456',
  'CPF: 123.456.789-00',
  'Data de Nascimento: 15/03/2002',
  'Validade: 31/03/2025',
].join('\n');

const CARD_ETEC = [
  'GOVERNO DO ESTADO DE SÃO PAULO',
  'CENTRO PAULA SOUZA - ETEC',
  'MARIA OLIVEIRA COSTA',
  'Curso Técnico em Informática',
  'RG: 12.345.678-9',
  'Matrícula 000987654',
  'Válida até 30/06/2024',
].join('\n');

const CARD_MINIMAL = ['CARTEIRINHA', 'Nome: Ana P.', 'Validade 31/03/2026'].join('\n');

// Texto combinado frente+verso (como o app concatena as duas fotos): a CIA vem do verso.
const CARD_FRONT_BACK = [
  'CARTEIRA DE IDENTIFICAÇÃO ESTUDANTIL',
  'UBES - União Brasileira dos Estudantes Secundaristas',
  'Nome: Bruno Almeida Lima',
  'Instituição: Colégio Estadual Dom Pedro II',
  'Matrícula: 2024987654',
  'Validade: 31/03/2026',
  'CIA: 000123456',
].join('\n');

describe('parseStudentCard', () => {
  it('extrai todos os campos de uma carteirinha bem formatada (layout com rótulos)', () => {
    const { fields, confidence } = parseStudentCard(CARD_UNE);

    expect(fields).toEqual({
      fullName: 'João da Silva Santos',
      institution: 'Universidade Federal do Rio de Janeiro',
      course: 'Engenharia de Computação - Ensino Superior',
      educationLevel: 'graduacao',
      registrationNumber: '2023123456',
      issuer: 'UNE',
      cpf: '123.456.789-00',
      birthDate: '2002-03-15',
      validUntil: '2025-03-31',
    });
    expect(confidence).toBe(1);
  });

  it('lida com layout sem rótulo de nome e distingue matrícula de RG civil', () => {
    const { fields, confidence } = parseStudentCard(CARD_ETEC);

    expect(fields.fullName).toBe('MARIA OLIVEIRA COSTA');
    expect(fields.institution).toBe('CENTRO PAULA SOUZA - ETEC');
    expect(fields.educationLevel).toBe('tecnico');
    expect(fields.registrationNumber).toBe('000987654');
    expect(fields.validUntil).toBe('2024-06-30');
    // RG civil "12.345.678-9" não é CPF e não deve ser capturado.
    expect(fields.cpf).toBeUndefined();
    expect(fields.issuer).toBeUndefined();
    expect(confidence).toBe(1);
  });

  it('reflete baixa confiança quando poucos campos são reconhecidos', () => {
    const { fields, confidence } = parseStudentCard(CARD_MINIMAL);

    expect(fields.fullName).toBe('Ana P.');
    expect(fields.validUntil).toBe('2026-03-31');
    expect(fields.institution).toBeUndefined();
    expect(confidence).toBe(0.5);
  });

  it('sempre preserva o texto bruto para auditoria/re-parse', () => {
    const result = parseStudentCard(CARD_UNE);
    expect(result.rawOcrText).toBe(CARD_UNE);
  });

  it('não quebra com texto vazio', () => {
    const { fields, confidence } = parseStudentCard('');
    expect(fields).toEqual({});
    expect(confidence).toBe(0);
  });

  it('extrai a CIA (rótulo do verso) do texto combinado frente+verso', () => {
    const { fields } = parseStudentCard(CARD_FRONT_BACK);

    expect(fields.cia).toBe('000123456');
    expect(fields.fullName).toBe('Bruno Almeida Lima');
    expect(fields.institution).toBe('Colégio Estadual Dom Pedro II');
    // Cartões sem CIA não inventam o campo.
    expect(parseStudentCard(CARD_MINIMAL).fields.cia).toBeUndefined();
  });

  it('produz um StudentCard válido ao combinar o parsing com metadados de sync', () => {
    const { fields, confidence, rawOcrText } = parseStudentCard(CARD_UNE);
    const now = new Date().toISOString();

    const result = studentCardSchema.safeParse({
      id: randomUUID(),
      ...fields,
      rawOcrText,
      ocrConfidence: confidence,
      version: 0,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    expect(result.success).toBe(true);
  });
});
