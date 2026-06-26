import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Configuração ESLint (flat config) compartilhada pelo monorepo.
 * Usa apenas regras sem type-checking para não exigir um `tsconfig` por execução.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.turbo/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
