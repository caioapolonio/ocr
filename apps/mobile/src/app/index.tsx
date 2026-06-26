import { desc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { db } from '@/db/client';
import { cards } from '@/db/schema';

export default function CardsListScreen() {
  const router = useRouter();
  const { data } = useLiveQuery(
    db.select().from(cards).where(isNull(cards.deletedAt)).orderBy(desc(cards.createdAt)),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nenhuma carteirinha ainda.{'\n'}Toque em “＋ Simular OCR”.
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

      <Link href="/scan" asChild>
        <Pressable style={styles.fab} accessibilityRole="button">
          <Text style={styles.fabText}>＋ Simular OCR</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    backgroundColor: '#208AEF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
