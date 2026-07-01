import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { SYNC_ENABLED } from './config';
import { runSync, type SyncResult } from './engine';

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'ok' | 'error';

interface SyncContextValue {
  status: SyncStatus;
  lastResult: SyncResult | null;
  error: string | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

/**
 * Orquestra o sync no nível do app: dispara ao abrir e sempre que o app volta
 * ao foreground (`AppState`). "Online" é detectado tentando o request — sem
 * dependência nativa de rede, então não exige rebuild.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>(SYNC_ENABLED ? 'idle' : 'disabled');
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const syncNow = useCallback(async () => {
    if (!SYNC_ENABLED || running.current) return;
    running.current = true;
    setStatus('syncing');
    setError(null);
    try {
      setLastResult(await runSync());
      setStatus('ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no sync');
      setStatus('error');
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void syncNow();
    });
    // 1º sync após a montagem, fora do corpo síncrono do effect (evita setState em cascata).
    const timer = setTimeout(() => void syncNow(), 0);
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [syncNow]);

  return (
    <SyncContext.Provider value={{ status, lastResult, error, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync deve ser usado dentro de <SyncProvider>');
  return ctx;
}
