import type { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

// drizzle/migrations.js é gerado pelo drizzle-kit (JS, sem tipos) e importa os
// arquivos .sql via babel-plugin-inline-import (ver babel.config.js + metro.config.js).
// @ts-ignore - módulo JS gerado, sem declaração de tipos
import migrationsData from '../../drizzle/migrations';

type MigrationsArg = Parameters<typeof useMigrations>[1];

export default migrationsData as MigrationsArg;
