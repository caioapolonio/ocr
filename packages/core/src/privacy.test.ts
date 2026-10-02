import { describe, expect, it } from 'vitest';
import { REDACTED_CPF, redactCpf } from './privacy';

describe('redactCpf', () => {
  it('remove o CPF formatado e mantém o resto do texto', () => {
    const text = ['Nome: João da Silva', 'CPF: 123.456.789-00', 'Validade: 31/03/2025'].join('\n');

    expect(redactCpf(text)).toBe(
      ['Nome: João da Silva', `CPF: ${REDACTED_CPF}`, 'Validade: 31/03/2025'].join('\n'),
    );
  });

  it('remove o CPF sem pontuação quando vem rotulado', () => {
    expect(redactCpf('CPF 12345678900')).toBe(`CPF ${REDACTED_CPF}`);
    expect(redactCpf('cpf: 123 456 789 00')).toBe(`cpf: ${REDACTED_CPF}`);
  });

  it('não confunde matrícula ou RG com CPF', () => {
    const text = ['Matrícula: 20231234567', 'RG: 12.345.678-9'].join('\n');
    expect(redactCpf(text)).toBe(text);
  });

  it('não invade a linha seguinte', () => {
    const text = ['CPF: 12345678900', '15/03/2002'].join('\n');
    expect(redactCpf(text)).toBe([`CPF: ${REDACTED_CPF}`, '15/03/2002'].join('\n'));
  });
});
