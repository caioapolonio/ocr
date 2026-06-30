import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// enableChangeListener: necessário para o `useLiveQuery` reagir a mudanças.
export const sqlite = openDatabaseSync('ocr.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });
