import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { softDeleteCard, updateCard } from '@/features/cards/mutations';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useLiveQuery(db.select().from(cards).where(eq(cards.id, id)));
  const card = data.at(0);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ fullName: '', institution: '', course: '', validUntil: '' });

  if (!card || card.deletedAt) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Carteirinha não encontrada.</Text>
      </View>
    );
  }

  function startEdit() {
    if (!card) return;
    setDraft({
      fullName: card.fullName,
      institution: card.institution,
      course: card.course ?? '',
      validUntil: card.validUntil ?? '',
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!draft.fullName.trim() || !draft.institution.trim()) {
      Alert.alert('Campos obrigatórios', 'Nome e instituição são obrigatórios.');
      return;
    }
    await updateCard(id, {
      fullName: draft.fullName,
      institution: draft.institution,
      course: draft.course || null,
      validUntil: draft.validUntil || null,
    });
    setEditing(false);
  }

  function confirmDelete() {
    Alert.alert('Excluir carteirinha', 'Tem certeza? Esta ação pode ser desfeita no sync (M4).', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await softDeleteCard(id);
          router.back();
        },
      },
    ]);
  }

  if (editing) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <LabeledInput
          label="Nome"
          value={draft.fullName}
          onChangeText={(t) => setDraft((d) => ({ ...d, fullName: t }))}
        />
        <LabeledInput
          label="Instituição"
          value={draft.institution}
          onChangeText={(t) => setDraft((d) => ({ ...d, institution: t }))}
        />
        <LabeledInput
          label="Curso"
          value={draft.course}
          onChangeText={(t) => setDraft((d) => ({ ...d, course: t }))}
        />
        <LabeledInput
          label="Validade"
          value={draft.validUntil}
          onChangeText={(t) => setDraft((d) => ({ ...d, validUntil: t }))}
        />
        <Pressable style={styles.primaryBtn} onPress={saveEdit}>
          <Text style={styles.primaryBtnText}>Salvar</Text>
        </Pressable>
        <Pressable style={styles.ghostBtn} onPress={() => setEditing(false)}>
          <Text style={styles.ghostBtnText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.name}>{card.fullName}</Text>
        <Text style={styles.institution}>{card.institution}</Text>
      </View>

      <View style={styles.card}>
        <Row label="Curso" value={card.course} />
        <Row label="Nível" value={card.educationLevel} />
        <Row label="Matrícula" value={card.registrationNumber} />
        <Row label="Documento" value={card.documentNumber} />
        <Row label="Emissor" value={card.issuer} />
        <Row label="CPF" value={card.cpf} />
        <Row label="Nascimento" value={card.birthDate} />
        <Row label="Validade" value={card.validUntil} />
        <Row
          label="Confiança OCR"
          value={card.ocrConfidence != null ? `${Math.round(card.ocrConfidence * 100)}%` : null}
        />
        <Row label="Status" value={card.syncStatus} />
      </View>

      <Pressable style={styles.primaryBtn} onPress={startEdit}>
        <Text style={styles.primaryBtnText}>Editar</Text>
      </Pressable>
      <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
        <Text style={styles.deleteBtnText}>Excluir</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row(props: { label: string; value: string | null | undefined }) {
  if (!props.value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{props.label}</Text>
      <Text style={styles.rowValue}>{props.value}</Text>
    </View>
  );
}

function LabeledInput(props: { label: string; value: string; onChangeText: (text: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput style={styles.input} value={props.value} onChangeText={props.onChangeText} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, backgroundColor: '#f8fafc', flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: '#6b7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  institution: { color: '#475569', fontSize: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: '#64748b' },
  rowValue: { color: '#0f172a', fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  field: { gap: 4 },
  fieldLabel: { fontSize: 12, color: '#64748b' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  primaryBtn: { backgroundColor: '#208AEF', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  ghostBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  ghostBtnText: { color: '#64748b', fontWeight: '500' },
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteBtnText: { color: '#dc2626', fontWeight: '600' },
});
