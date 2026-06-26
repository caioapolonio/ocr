import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { db } from '@/db/client';
import migrations from '@/db/migrations';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Falha ao preparar o banco local</Text>
        <Text style={styles.muted}>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text style={styles.muted}>Preparando o banco local…</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerTintColor: '#208AEF' }}>
      <Stack.Screen name="index" options={{ title: 'Carteirinhas' }} />
      <Stack.Screen name="scan" options={{ title: 'Simular OCR', presentation: 'modal' }} />
      <Stack.Screen name="card/[id]" options={{ title: 'Carteirinha' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  muted: { color: '#6b7280', textAlign: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#b91c1c' },
});
