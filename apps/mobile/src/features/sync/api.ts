import {
  API_VERSION,
  syncPullResponseSchema,
  syncPushRequestSchema,
  syncPushResponseSchema,
  type SyncPullResponse,
  type SyncPushRequest,
  type SyncPushResponse,
} from '@ocr/core';
import { API_URL } from './config';

const base = `${API_URL}/api/${API_VERSION}`;

/** Envia as mudanças locais; valida a resposta com o schema do core. */
export async function pushChanges(request: SyncPushRequest): Promise<SyncPushResponse> {
  const res = await fetch(`${base}/sync/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(syncPushRequestSchema.parse(request)),
  });
  if (!res.ok) throw new Error(`Sync push falhou (HTTP ${res.status})`);
  return syncPushResponseSchema.parse(await res.json());
}

/** Baixa as mudanças desde `since` (ISO) — ou tudo, se `since` for nulo. */
export async function pullChanges(since: string | null): Promise<SyncPullResponse> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await fetch(`${base}/sync/pull${query}`);
  if (!res.ok) throw new Error(`Sync pull falhou (HTTP ${res.status})`);
  return syncPullResponseSchema.parse(await res.json());
}
