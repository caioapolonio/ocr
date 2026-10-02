import { eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { cards, outbox, syncMeta } from '@/db/schema';

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

/**
 * Sair apaga tudo o que é da conta neste aparelho: carteirinhas, outbox e
 * metadados do sync (token e `lastPulledAt`). Sem isso, quem entrasse depois
 * no mesmo aparelho enviaria as carteirinhas da conta anterior para a sua.
 */
export async function clearLocalData(): Promise<void> {
  // Com WHERE de propósito: um DELETE sem WHERE usa a "truncate optimization"
  // do SQLite, que não avisa o change listener, e a lista (useLiveQuery)
  // continuaria mostrando as carteirinhas apagadas.
  await db.delete(outbox).where(isNotNull(outbox.id));
  await db.delete(cards).where(isNotNull(cards.id));
  await db.delete(syncMeta).where(isNotNull(syncMeta.key));
}

/** Carteirinhas com mudanças que ainda não chegaram ao servidor. */
export async function unsyncedCount(): Promise<number> {
  const entries = await db.select({ entityId: outbox.entityId }).from(outbox);
  return new Set(entries.map(({ entityId }) => entityId)).size;
}
