export interface OcrSample {
  label: string;
  text: string;
}

// Amostras sintéticas (mesmas fixtures testadas em @ocr/core) para simular o OCR no M2.
export const OCR_SAMPLES: OcrSample[] = [
  {
    label: 'UNE — graduação',
    text: [
      'CARTEIRA DE IDENTIFICAÇÃO ESTUDANTIL',
      'UNE - União Nacional dos Estudantes',
      'Nome: João da Silva Santos',
      'Instituição: Universidade Federal do Rio de Janeiro',
      'Curso: Engenharia de Computação - Ensino Superior',
      'Matrícula: 2023123456',
      'CPF: 123.456.789-00',
      'Data de Nascimento: 15/03/2002',
      'Validade: 31/03/2025',
    ].join('\n'),
  },
  {
    label: 'ETEC — técnico',
    text: [
      'GOVERNO DO ESTADO DE SÃO PAULO',
      'CENTRO PAULA SOUZA - ETEC',
      'MARIA OLIVEIRA COSTA',
      'Curso Técnico em Informática',
      'RG: 12.345.678-9',
      'Matrícula 000987654',
      'Válida até 30/06/2024',
    ].join('\n'),
  },
  {
    // Simula o texto combinado frente+verso: a CIA vem do verso.
    label: 'UBES — frente+verso (com CIA)',
    text: [
      'CARTEIRA DE IDENTIFICAÇÃO ESTUDANTIL',
      'UBES - União Brasileira dos Estudantes Secundaristas',
      'Nome: Bruno Almeida Lima',
      'Instituição: Colégio Estadual Dom Pedro II',
      'Curso: Ensino Médio',
      'Matrícula: 2024987654',
      'Validade: 31/03/2026',
      'CIA: 000123456',
    ].join('\n'),
  },
];
