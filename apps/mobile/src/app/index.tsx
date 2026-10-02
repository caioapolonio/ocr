import { desc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { unsyncedCount } from '@/features/auth/storage';
import { useAuth } from '@/features/auth/useAuth';
import { useSync } from '@/features/sync/useSync';

export default function CardsListScreen() {
  const router = useRouter();
  const { data } = useLiveQuery(
    db.select().from(cards).where(isNull(cards.deletedAt)).orderBy(desc(cards.createdAt)),
  );
  const { status, error, lastResult, syncNow } = useSync();
  const { email, token, signOut } = useAuth();

  async function confirmSignOut() {
    const pending = await unsyncedCount();
    const message = pending
      ? `${pending} carteirinha(s) ainda não sincronizada(s) serão perdidas. Sair apaga os dados deste aparelho.`
      : 'Sair apaga as carteirinhas deste aparelho. Elas continuam salvas na sua conta.';
    Alert.alert('Sair da conta', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  function syncLabel(): string {
    switch (status) {
      case 'disabled':
        return 'Sync off — defina EXPO_PUBLIC_API_URL';
      case 'syncing':
        return 'Sincronizando…';
      case 'error':
        return `Erro no sync: ${error ?? ''}`;
      case 'ok':
        return lastResult?.skipped
          ? lastResult.skipped
          : `Sincronizado · ↑${lastResult?.pushed ?? 0} ↓${lastResult?.pulled ?? 0}` +
              (lastResult?.conflicts ? ` · ⚠${lastResult.conflicts}` : '') +
              (lastResult?.invalid ? ` · ${lastResult.invalid} com dados a corrigir` : '');
      default:
        return 'Toque para sincronizar';
    }
  }

  return (
    <View style={styles.container}>
      {token ? (
        <View style={styles.syncBarRow}>
          <Pressable style={styles.syncBarMain} onPress={syncNow} disabled={status === 'syncing'}>
            <Text style={styles.syncBarText} numberOfLines={1}>
              {email} · {syncLabel()}
            </Text>
            {status === 'syncing' ? <ActivityIndicator size="small" color="#208AEF" /> : null}
          </Pressable>
          <Pressable onPress={confirmSignOut} hitSlop={8}>
            <Text style={styles.syncBarAction}>Sair</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.syncBar} onPress={() => router.push('/login')}>
          <Text style={styles.syncBarText}>Entrar para sincronizar ›</Text>
        </Pressable>
      )}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={status === 'syncing'}
            onRefresh={token ? syncNow : () => router.push('/login')}
            tintColor="#208AEF"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nenhuma carteirinha ainda.{'\n'}Toque em “📷 Escanear”.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/card/${item.id}`)}>
            <Text style={styles.cardName}>{item.fullName}</Text>
            <Text style={styles.cardInstitution}>{item.institution}</Text>
            <View style={styles.badges}>
              {item.validUntil ? <Text style={styles.badge}>val. {item.validUntil}</Text> : null}
              <Text style={[styles.badge, styles.badgePending]}>{item.syncStatus}</Text>
            </View>
          </Pressable>
        )}
      />

      <View style={styles.actions}>
        <Link href="/camera" asChild>
          <Pressable style={styles.primaryAction} accessibilityRole="button">
            <Text style={styles.primaryActionText}>📷 Escanear</Text>
          </Pressable>
        </Link>
        <Link href="/scan" asChild>
          <Pressable style={styles.secondaryAction} accessibilityRole="button">
            <Text style={styles.secondaryActionText}>Simular</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  syncBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  syncBarMain: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  syncBarText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },
  syncBarAction: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  listContent: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 64, lineHeight: 22 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  cardName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  cardInstitution: { color: '#475569' },
  badges: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: {
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgePending: { color: '#9a3412', backgroundColor: '#ffedd5' },
  actions: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    flexDirection: 'row',
    gap: 12,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#208AEF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryAction: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryActionText: { color: '#334155', fontWeight: '600', fontSize: 15 },
});
