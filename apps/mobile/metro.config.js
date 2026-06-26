// Metro configurado para o monorepo (pnpm) + migrations .sql do Drizzle.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Observar a raiz do workspace (pacotes compartilhados, ex.: @ocr/core)
config.watchFolders = [workspaceRoot];

// 2. Resolver módulos a partir do app e da raiz do monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Importante no pnpm: manter o lookup hierárquico para resolver deps aninhadas no .pnpm

// 3. Permitir importar migrations .sql geradas pelo drizzle-kit
config.resolver.sourceExts.push('sql');

module.exports = config;
