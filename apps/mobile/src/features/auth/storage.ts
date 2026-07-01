import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { syncMeta } from '@/db/schema';

// Guardamos o token na tabela local `sync_meta`.
// TODO(hardening): migrar para expo-secure-store (Keychain/Keystore) — exige rebuild nativo.
const AUTH_KEY = 'auth';

export interface StoredAuth {
  token: string;
  email: string;
}

export async function getAuth(): Promise<StoredAuth | null> {
  const [row] = await db.select().from(syncMeta).where(eq(syncMeta.key, AUTH_KEY)).limit(1);
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value) as StoredAuth;
  } catch {
    return null;
  }
}

export async function setAuth(auth: StoredAuth): Promise<void> {
  const value = JSON.stringify(auth);
  await db
    .insert(syncMeta)
    .values({ key: AUTH_KEY, value })
    .onConflictDoUpdate({ target: syncMeta.key, set: { value } });
}

export async function clearAuth(): Promise<void> {
  await db.delete(syncMeta).where(eq(syncMeta.key, AUTH_KEY));
}
